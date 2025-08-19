// 認証機能管理
class AuthManager {
  constructor() {
    this.authData = null;
    this.noAuthMode = false;
    this.isAuthenticated = false;
    this.authAttempts = 0;
    this.maxAuthAttempts = 5;
    this.lockoutTime = 0;
    this.securityChecks = [];
    // 新仕様: パスワード要否とブロック管理
    this.requirePassword = false;
    this.blockCountdownInterval = null;
    // モーダル状態管理（多重表示防止）
    this.isModalVisible = false;
    this.isModalRendering = false;
    // リロード時に段階状態を復元
    this.loadRuntimeState();
    this.init();
    this.setupSecurityChecks();
  }

  // 文字列正規化（パスワード比較用）
  normalizeText(text) {
    if (typeof text !== 'string') return '';
    try {
      // 前後の全角/半角空白を除去し、NFKC正規化
      return text.replace(/[\u3000\s]+$/u, '').replace(/^[\u3000\s]+/u, '').normalize('NFKC');
    } catch (_) {
      return text.trim();
    }
  }

  // モバイル端末かどうか（認証ダイアログ最適化用。ページ全体のビューポートは変更しない）
  isMobileAuth() {
    try {
      if (window.matchMedia) {
        if (window.matchMedia('(pointer: coarse)').matches) return true;
        if (window.matchMedia('(max-device-width: 768px)').matches) return true;
      }
      return (typeof screen !== 'undefined' && screen.width && screen.width <= 480);
    } catch (_) {
      return false;
    }
  }

  // --- 認証状態 永続化ユーティリティ ---
  tryPersistStorage() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }

  setAuthCookie(value, days = 7) {
    try {
      const exp = new Date(Date.now() + days * 86400000).toUTCString();
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `kosamura_auth=${encodeURIComponent(value)}; Expires=${exp}; Path=/; SameSite=Lax${secure}`;
    } catch (_) {}
  }

  getAuthCookie() {
    try {
      const m = document.cookie.match(/(?:^|; )kosamura_auth=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (_) {
      return '';
    }
  }

  clearAuthCookie() {
    try {
      document.cookie = `kosamura_auth=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
    } catch (_) {}
  }

  saveAuthState(authInfo) {
    try {
      const json = JSON.stringify(authInfo);
      localStorage.setItem('kosamuraAuth', json);
      this.setAuthCookie(json, 7);
      this.tryPersistStorage();
    } catch (_) {}
  }

  loadAuthState() {
    try {
      const fromCookie = this.getAuthCookie();
      if (fromCookie) return JSON.parse(fromCookie);
    } catch (_) {}
    try {
      const fromLS = localStorage.getItem('kosamuraAuth');
      if (fromLS) return JSON.parse(fromLS);
    } catch (_) {}
    return null;
  }

  clearAuthState() {
    try { localStorage.removeItem('kosamuraAuth'); } catch (_) {}
    this.clearAuthCookie();
  }

  // --- ランタイム状態（パスワード要求/ロック）を簡易永続化 ---
  saveRuntimeState() {
    try {
      const state = {
        requirePassword: this.requirePassword === true,
        lockoutTime: this.lockoutTime || 0,
      };
      localStorage.setItem('kosamuraRuntime', JSON.stringify(state));
    } catch (_) {}
  }

  loadRuntimeState() {
    try {
      const raw = localStorage.getItem('kosamuraRuntime');
      if (!raw) return;
      const st = JSON.parse(raw);
      this.requirePassword = !!st.requirePassword;
      this.lockoutTime = typeof st.lockoutTime === 'number' ? st.lockoutTime : 0;
    } catch (_) {}
  }

  async init() {
    // 認証不要モードの場合は何もしない
    if (this.noAuthMode) {
      return;
    }
    
    // 特定のページでのみ認証画面を表示
    const currentPage = window.location.pathname;
    if (currentPage.includes('upload.html') || currentPage.includes('search.html')) {
      // upload.htmlとsearch.htmlのみで認証画面を表示
      // share.html、index.html、ph-index.htmlなどは認証不要
    if (this.checkAuthStatus()) {
      // スキップ等で認証済み扱いの場合もメモリに反映
      this.isAuthenticated = true;
      this.showMainContent();
    } else {
      this.showAuthModal();
      }
    } else {
      // その他のページ（share.html、index.html、ph-index.htmlなど）では認証不要モードで動作
      this.noAuthMode = true;
      this.showMainContent();
    }
  }

  checkAuthStatus() {
    // 認証不要モードの場合は認証済みとして扱う
    if (this.noAuthMode) {
      return true;
    }
    // スキップ指定
    try {
      if (localStorage.getItem('kosamuraSkip') === 'true') return true;
    } catch (_) {}
    
    // ロックアウトチェック
    if (this.lockoutTime > Date.now()) {
      return false;
    }
    
    // メモリ上の認証状態を優先チェック
    if (this.isAuthenticated) {
      return true;
    }
    
    const authInfo = this.loadAuthState();
    if (!authInfo) return false;

    try {
      const { isAuthenticated, timestamp, sessionId } = authInfo;
      
      // セッションの有効期限チェック（24時間）
      if (timestamp && (Date.now() - timestamp > 24 * 60 * 60 * 1000)) {
        this.clearAuthState();
        return false;
      }
      
      // セッションIDの検証は無効化（リロード後も認証を維持するため）

      return isAuthenticated === true;
    } catch (error) {
      this.clearAuthState();
      return false;
    }
  }
  
  // セッションID生成
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    return this.sessionId;
  }

  async showAuthModal() {
    // すでに表示中/描画中なら何もしない（多重表示防止）
    if (this.isModalVisible || this.isModalRendering) {
      return;
    }
    this.isModalRendering = true;
    
    // モバイル用ビューポート設定を追加
    this.setMobileViewport();
    
    // 即座に認証画面を表示（ローディング状態で）
    this.createAndShowModal(true);
    this.isModalVisible = true;
    
    // APIから認証データを取得
    await this.fetchAuthData();
    
    if (!this.authData) {
      // APIが利用できない場合は利用不可メッセージを表示
      this.showUnavailableMessage();
      // 描画中フラグを解除
      this.isModalRendering = false;
      return;
    }
    
    // 認証データが取得できた場合は通常の認証画面に切り替え
    this.updateModalWithAuthData();
    this.isModalRendering = false;
  }

  // モバイル用ビューポート設定
  setMobileViewport() {
    const isMobile = this.isMobileAuth();
    if (isMobile) {
      // 既存のビューポートメタタグを保存
      const existingViewport = document.querySelector('meta[name="viewport"]');
      if (existingViewport) {
        this.originalViewport = existingViewport.getAttribute('content');
        existingViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      } else {
        // ビューポートメタタグが存在しない場合は新規作成
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
        this.originalViewport = null;
      }
    }
  }

  // 元のビューポート設定に戻す
  restoreViewport() {
    if (this.originalViewport !== undefined) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        if (this.originalViewport) {
          viewport.setAttribute('content', this.originalViewport);
        } else {
          viewport.remove();
        }
      }
      this.originalViewport = undefined;
    }
  }

  async fetchAuthData() {
    try {
      if (window.kosamuraAPI && typeof window.kosamuraAPI.getAuthData === 'function') {
        const authData = await window.kosamuraAPI.getAuthData();
        
        if (authData && authData.password && authData.correctSentences && authData.incorrectSentences) {
          this.authData = authData;
        } else {
          this.authData = null;
        }
      } else {
        this.authData = null;
      }
    } catch (error) {
      this.authData = null;
    }
  }

  createAndShowModal(isLoading = false) {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    const isMobile = this.isMobileAuth();
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${isMobile ? 'linear-gradient(135deg, #c0c0c0 0%, #d0d0d0 50%, #b8b8b8 100%)' : 'rgba(0, 0, 0, 0.8)'};
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      overflow-y: auto;
      padding: ${isMobile ? '8px' : '20px'};
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 4px, #e8e8e8 4px, #e8e8e8 8px);
      padding: ${isMobile ? '20px 16px' : '30px'};
      border-radius: ${isMobile ? '12px' : '12px'};
      max-width: ${isMobile ? 'calc(100vw - 16px)' : '500px'};
      width: ${isMobile ? 'calc(100vw - 16px)' : '90%'};
      text-align: center;
      margin: auto;
      max-height: ${isMobile ? 'calc(100vh - 16px)' : '90vh'};
      overflow-y: auto;
      position: relative;
      box-shadow: ${isMobile ? '0 8px 32px rgba(0,0,0,0.3)' : '0 12px 36px rgba(0,0,0,0.25)'};
      font-size: ${isMobile ? '16px' : '14px'};
      line-height: 1.5;
    `;

    if (isLoading) {
      // ローディング状態の表示
      const title = document.createElement('h2');
      title.textContent = '秋高生限定';
      title.style.marginBottom = '20px';

      const loadingText = document.createElement('p');
      loadingText.textContent = '認証画面を読み込み中...';
      loadingText.style.marginBottom = '20px';
      loadingText.style.color = '#666';

      const loadingSpinner = document.createElement('div');
      loadingSpinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px auto;
      `;

      // スピナーアニメーションのCSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);

      modalContent.appendChild(title);
      modalContent.appendChild(loadingSpinner);
      modalContent.appendChild(loadingText);
    } else {
      // 通常の認証画面（既存のコード）
      this.createAuthContent(modalContent);
    }

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // スクリーンショット防止機能
    this.preventScreenshots(modal);
    
    if (!isLoading) {
      // タイマーを開始（ローディング中は開始しない）
      this.startTimer(20);
    }
  }

  validateAuth(password, selectedSentences, skipNextTime) {
    // ブロック中はカウントダウンのみ更新
    if (this.lockoutTime > Date.now()) {
      this.startBlockCountdownFromExisting();
      return;
    }

    // パスワードは必要時のみ評価
    const isPasswordCorrect = this.requirePassword ? (this.normalizeText(password) === this.normalizeText(this.authData.password)) : true;

    // 選択肢の正解判定（2つ選び、いずれも正しい）
    const hasTwoCorrectSentences = selectedSentences.size === 2 &&
      Array.from(selectedSentences).every(text => this.authData.correctSentences.includes(text));

    if (isPasswordCorrect && hasTwoCorrectSentences) {
      this.authAttempts = 0;
      this.requirePassword = false;
      this.authenticate(skipNextTime);
      return;
    }

    // 失敗時処理
    this.authAttempts++;
    if (this.authAttempts === 1) {
      // 1回目の失敗: 10秒ブロック
      this.startBlockCountdown(10);
    } else {
      // 2回目以降: パスワード要求 + 60秒ブロック
      if (!this.requirePassword) {
        this.requirePassword = true;
        this.saveRuntimeState();
        this.updateModalWithAuthData();
      }
      this.startBlockCountdown(60);
    }
  }

  resetAuthModal(keepPassword = false) {
    // タイマーを停止
    this.stopTimer();
    
    // 既存モーダルを残したまま中身だけ再生成（多重表示防止）
    const oldInput = document.getElementById('auth-password');
    const prevValue = keepPassword && oldInput ? oldInput.value : '';
    
    // 認証データでモーダル内容を再構築（シャッフル適用）
    this.updateModalWithAuthData();
    
    // パスワード保持が必要なら復元
    if (keepPassword && prevValue) {
      const newInput = document.getElementById('auth-password');
      if (newInput) newInput.value = prevValue;
    }
  }

  authenticate(skipNextTime) {
    // 認証不要モードを解除
    this.noAuthMode = false;
    
    // メモリ上の認証状態を設定
    this.isAuthenticated = true;

    // 次回以降は選択のみで認証できるように、パスワード要求とロック状態を確実に解除・永続化
    this.requirePassword = false;
    this.lockoutTime = 0;
    this.saveRuntimeState();
    
    // タイマーを停止
    this.stopTimer();
    
    // ビューポート設定を元に戻す
    this.restoreViewport();
    
    // 認証状態を保存（Cookie + localStorage）
    const authInfo = {
      isAuthenticated: true,
      timestamp: Date.now()
    };
    this.saveAuthState(authInfo);
    // 次回スキップ保存
    try {
      if (skipNextTime) localStorage.setItem('kosamuraSkip', 'true');
    } catch (_) {}
    
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.remove();
    }
    this.isModalVisible = false;
    this.isModalRendering = false;
    
    this.showMainContent();
  }

  showMainContent() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.display = 'block';
    }
    
    // 認証成功後、ページの読み込みを完了させる
    document.body.style.visibility = 'visible';
    
    // 認証不要モードの場合は、タイマーやその他の認証関連の処理を停止
    if (this.noAuthMode) {
      this.stopTimer();
    }
  }
  
  showNoAuthPages() {
    // 認証不要モードに設定
    this.noAuthMode = true;
    
    // タイマーを停止
    this.stopTimer();
    
    // ビューポート設定を元に戻す
    this.restoreViewport();
    
    // 認証モーダルを閉じる
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.remove();
    }
    this.isModalVisible = false;
    this.isModalRendering = false;
    
    // 現在のページの場所に応じて適切なパスでリダイレクト
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
      // pagesディレクトリ内の場合は親ディレクトリのindex.htmlに移動
      window.location.href = '../index.html';
    } else {
      // ルートディレクトリの場合はindex.htmlに移動
      window.location.href = 'index.html';
    }
  }
  
  startTimer(seconds) {
    // ブロック中は問題更新タイマーを起動しない（毎秒のUI更新のみ許可）
    if (this.lockoutTime > Date.now()) {
      return;
    }
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;
    
    let timeLeft = seconds;
    timerDisplay.textContent = `${timeLeft}秒後に問題を更新`;
    
    this.timerInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = `${timeLeft}秒後に問題を更新`;
      
      if (timeLeft <= 0) {
        clearInterval(this.timerInterval);
        // 時間切れ：パスワード入力が必要な段階では選択肢は再生成しない
        // （ユーザーの選択肢が毎秒変わらないようにする）
        if (!this.requirePassword) {
          this.resetAuthModal(true);
        } else {
          // パスワード段階では表示中のUIを維持し、必要ならタイマーだけ再始動
          this.startTimer(seconds);
        }
      }
    }, 1000);
  }
  
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  // スクリーンショット防止機能
  preventScreenshots(element) {
    // 右クリック禁止
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    // キーボードショートカット禁止
    element.addEventListener('keydown', (e) => {
      // PrintScreen, Ctrl+P, Ctrl+S, F12, Ctrl+Shift+I, Ctrl+U を禁止
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.key === 's') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    });
    
    // ドラッグ禁止
    element.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    });
    
    // 選択禁止
    element.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });
    
    // コピー禁止
    element.addEventListener('copy', (e) => {
      e.preventDefault();
      return false;
    });
  }

  // 認証コンテンツを作成
  createAuthContent(modalContent) {
    const isMobile = this.isMobileAuth();
    const title = document.createElement('h2');
    title.textContent = '秋高生限定';
    title.style.margin = isMobile ? '0 0 16px' : '0 0 20px';
    title.style.fontSize = isMobile ? '24px' : '22px';
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    title.style.cssText = `
      margin: ${isMobile ? '0 0 16px' : '0 0 20px'};
      font-size: ${isMobile ? '24px' : '22px'};
      text-align: center;
      font-weight: bold;
      color: #333;
    `;
    
    // パスワード欄（2回以上間違えたら表示）: 選択肢の下に配置
    let passwordInput = null;

    const sentenceLabel = document.createElement('p');
    sentenceLabel.textContent = '秋高について述べた文章を2つ選択';
    sentenceLabel.style.margin = '0 auto';
    sentenceLabel.style.marginBottom = isMobile ? '12px' : '15px';
    sentenceLabel.style.fontSize = isMobile ? '18px' : '14px';
    sentenceLabel.style.textAlign = 'center';

    const sentenceContainer = document.createElement('div');
    sentenceContainer.id = 'sentence-options';
    
    // ph-index.htmlの場合は縦4列、それ以外は横2列
    const currentPage = window.location.pathname;
    const isPhonePage = currentPage.includes('ph-index.html');
    
    sentenceContainer.style.cssText = `
      display: grid;
      grid-template-columns: ${isPhonePage ? '1fr' : (isMobile ? '1fr' : '1fr 1fr')};
      gap: ${isMobile ? '10px' : '10px'};
      margin-bottom: ${isMobile ? '16px' : '20px'};
      text-align: left;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
    `;

    // 正しい文章と誤りの文章をシャッフルして表示
    // それぞれから2つずつランダムに選択
    const shuffledCorrect = [...this.authData.correctSentences];
    const shuffledIncorrect = [...this.authData.incorrectSentences];
    
    // 配列をシャッフル
    for (let i = shuffledCorrect.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCorrect[i], shuffledCorrect[j]] = [shuffledCorrect[j], shuffledCorrect[i]];
    }
    
    for (let i = shuffledIncorrect.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIncorrect[i], shuffledIncorrect[j]] = [shuffledIncorrect[j], shuffledIncorrect[i]];
    }
    
    // それぞれから2つずつ選択
    const selectedCorrect = shuffledCorrect.slice(0, 2);
    const selectedIncorrect = shuffledIncorrect.slice(0, 2);
    
    const allSentences = [
      ...selectedCorrect.map(s => ({ text: s, isCorrect: true })),
      ...selectedIncorrect.map(s => ({ text: s, isCorrect: false }))
    ];
    
    // 選択肢をシャッフル
    for (let i = allSentences.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSentences[i], allSentences[j]] = [allSentences[j], allSentences[i]];
    }

    // クラスプロパティとしてselectedSentencesを初期化
    this.selectedSentences = new Set();

    allSentences.forEach((sentence, index) => {
      const sentenceCheckbox = document.createElement('input');
      sentenceCheckbox.type = 'checkbox';
      sentenceCheckbox.id = `sentence-${index}`;
      sentenceCheckbox.dataset.isCorrect = sentence.isCorrect;
      sentenceCheckbox.dataset.text = sentence.text;
      sentenceCheckbox.style.cssText = `
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: ${isMobile ? '18px' : '18px'};
        height: ${isMobile ? '18px' : '18px'};
        border: 2px solid #ccc;
        border-radius: 3px;
        background: #fff;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        flex-shrink: 0;
        margin-right: ${isMobile ? '8px' : '8px'};
      `;
      
      sentenceCheckbox.addEventListener('change', function() {
        if (this.checked) {
          this.style.background = '#0071e3';
          this.style.borderColor = '#0071e3';
          this.classList.add('auth-checkbox-checked');
        } else {
          this.style.background = '#fff';
          this.style.borderColor = '#ccc';
          this.classList.remove('auth-checkbox-checked');
        }
      });

      const label = document.createElement('label');
      label.htmlFor = `sentence-${index}`;
      label.textContent = sentence.text;
      label.style.cssText = `
        display: flex;
        align-items: flex-start;
        text-align: left;
        font-size: ${isMobile ? '14px' : (isPhonePage ? '16px' : '14px')};
        line-height: 1.4;
        word-wrap: break-word;
        word-break: break-word;
        overflow-wrap: break-word;
      `;

      const container = document.createElement('div');
      container.id = `container-${index}`;
      container.style.cssText = `
        display: flex;
        align-items: flex-start;
        padding: ${isMobile ? '12px' : (isPhonePage ? '15px' : '10px')};
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f9f9f9;
        transition: background-color 0.2s ease;
        word-wrap: break-word;
        word-break: break-word;
        overflow-wrap: break-word;
      `;

      container.appendChild(sentenceCheckbox);
      container.appendChild(label);
      sentenceContainer.appendChild(container);

      sentenceCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (this.selectedSentences.size >= 2) {
            const firstSelected = Array.from(this.selectedSentences)[0];
            this.selectedSentences.delete(firstSelected);
            
            const firstCheckbox = document.querySelector(`[data-text="${firstSelected}"]`);
            if (firstCheckbox) {
              firstCheckbox.checked = false;
              firstCheckbox.style.background = '#fff';
              firstCheckbox.style.borderColor = '#ccc';
              firstCheckbox.classList.remove('auth-checkbox-checked');
              
              const firstContainer = firstCheckbox.closest('div[id^="container-"]');
              if (firstContainer) {
                firstContainer.style.backgroundColor = '#f9f9f9';
                firstContainer.style.color = 'black';
              }
            }
          }
          
          this.selectedSentences.add(sentence.text);
          container.style.backgroundColor = '#e3f2fd';
          container.style.color = '#1976d2';
        } else {
          this.selectedSentences.delete(sentence.text);
          container.style.backgroundColor = '#f9f9f9';
          container.style.color = 'black';
        }
      });
    });

    const submitButton = document.createElement('button');
    submitButton.id = 'auth-submit-btn';
    submitButton.textContent = '認証';
    submitButton.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: ${isMobile ? '14px 18px' : '12px 30px'};
      border-radius: ${isMobile ? '10px' : '8px'};
      cursor: pointer;
      font-size: ${isMobile ? '18px' : '16px'};
      width: ${isMobile ? '100%' : 'auto'};
      font-weight: bold;
      margin-bottom: ${isMobile ? '12px' : '15px'};
    `;

    const skipCheckbox = document.createElement('input');
    skipCheckbox.type = 'checkbox';
    skipCheckbox.id = 'skip-next-time';
    skipCheckbox.style.cssText = `
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      width: ${isMobile ? '18px' : '18px'};
      height: ${isMobile ? '18px' : '18px'};
      border: 2px solid #ccc;
      border-radius: 3px;
      background: #fff;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      flex-shrink: 0;
      margin-right: ${isMobile ? '8px' : '8px'};
    `;
    
    skipCheckbox.addEventListener('change', function() {
      if (this.checked) {
        this.style.background = '#0071e3';
        this.style.borderColor = '#0071e3';
        this.classList.add('auth-checkbox-checked');
      } else {
        this.style.background = '#fff';
        this.style.borderColor = '#ccc';
        this.classList.remove('auth-checkbox-checked');
      }
    });

    const skipLabel = document.createElement('label');
    skipLabel.htmlFor = 'skip-next-time';
    skipLabel.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: ${isMobile ? '12px' : '15px'};
      font-size: ${isMobile ? '14px' : '14px'};
      color: #666;
      cursor: pointer;
    `;

    skipLabel.appendChild(skipCheckbox);
    skipLabel.appendChild(document.createTextNode(' 次回からスキップ'));

    submitButton.addEventListener('click', () => {
      const pw = this.requirePassword ? (document.getElementById('auth-password')?.value || '') : '';
      this.validateAuth(pw, this.selectedSentences, skipCheckbox.checked);
    });

    modalContent.appendChild(title);
    modalContent.appendChild(sentenceLabel);
    // 選択肢は左寄せのまま
    modalContent.appendChild(sentenceContainer);

    // パスワードガイドと入力欄（必要時のみ）を選択肢の下に追加
    if (this.requirePassword) {
      const pwGuide = document.createElement('p');
      pwGuide.textContent = '生徒手帳49ページのタイトルを入力';
      pwGuide.style.cssText = `margin: ${isMobile ? '8px 0 10px 0' : '6px 0 8px 0'}; color:#333; font-size:${isMobile ? '16px' : '14px'};`;

      passwordInput = document.createElement('input');
      passwordInput.type = 'text';
      passwordInput.id = 'auth-password';
      passwordInput.placeholder = '生徒手帳49ページのタイトル';
      passwordInput.autocomplete = 'off';
      passwordInput.autocapitalize = 'off';
      passwordInput.spellcheck = false;
      passwordInput.setAttribute('inputmode', 'text');
      passwordInput.setAttribute('lang', 'ja');
      try { passwordInput.style.imeMode = 'active'; } catch (_) {}
      passwordInput.style.cssText = `
        width: 100%;
        padding: ${isMobile ? '10px' : '10px'};
        margin-bottom: ${isMobile ? '12px' : '12px'};
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: ${isMobile ? '16px' : '16px'};
        background:#fff;
      `;

      // パスワード行もセンター寄せ
      const pwWrap = document.createElement('div');
      pwWrap.style.cssText = 'text-align: center;';
      pwWrap.appendChild(pwGuide);
      pwWrap.appendChild(passwordInput);
      modalContent.appendChild(pwWrap);
    }
    
    const timerContainer = document.createElement('div');
    timerContainer.id = 'timer-container';
    timerContainer.style.cssText = `
      margin-bottom: ${isMobile ? '12px' : '15px'};
      font-size: ${isMobile ? '16px' : '16px'};
      font-weight: bold;
      color: #dc3545;
      text-align: center;
    `;
    
    const timerLabel = document.createElement('span');
    timerLabel.textContent = '';
    
    const timerDisplay = document.createElement('span');
    timerDisplay.id = 'timer-display';
    timerDisplay.textContent = '20秒後に問題を更新';
    
    timerContainer.appendChild(timerLabel);
    timerContainer.appendChild(timerDisplay);
    
    modalContent.appendChild(timerContainer);

    // ブロック中のカウントダウン表示領域
    // 選択肢全体を覆うロックオーバーレイ（ブラー＋カウントダウン）
    const overlay = document.createElement('div');
    overlay.id = 'lockout-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      background: rgba(255,255,255,0.3);
      z-index: 10;
    `;
    const overlayBox = document.createElement('div');
    overlayBox.style.cssText = `
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: ${isMobile ? '16px 18px' : '16px 22px'};
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 6px 24px rgba(0,0,0,0.35);
    `;
    const overlayTitle = document.createElement('div');
    overlayTitle.textContent = 'ロックしました';
    overlayTitle.style.cssText = `font-size:${isMobile ? '20px' : '20px'}; font-weight:700; margin-bottom:${isMobile ? '6px' : '6px'}; letter-spacing:0.02em;`;
    const lockoutDisplay = document.createElement('div');
    lockoutDisplay.id = 'lockout-display';
    lockoutDisplay.style.cssText = `font-size:${isMobile ? '16px' : '18px'}; font-weight:600;`;
    overlayBox.appendChild(overlayTitle);
    overlayBox.appendChild(lockoutDisplay);
    overlay.appendChild(overlayBox);
    modalContent.appendChild(overlay);
    modalContent.appendChild(skipLabel);
    modalContent.appendChild(submitButton);
    
    const noAuthLink = document.createElement('a');
    noAuthLink.href = '/index.html';
    noAuthLink.textContent = '認証不要のページに戻る';
    noAuthLink.style.cssText = `
      display: block;
      margin-top: ${isMobile ? '12px' : '15px'};
      color: #007bff;
      text-decoration: none;
      font-size: ${isMobile ? '14px' : '14px'};
      cursor: pointer;
      text-align: center;
    `;
    
    noAuthLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showNoAuthPages();
    });
    
    modalContent.appendChild(noAuthLink);
    
    // Enterキーで認証（パスワード表示時のみ）
    if (this.requirePassword && passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const pwEnter = document.getElementById('auth-password')?.value || '';
          this.validateAuth(pwEnter, this.selectedSentences, skipCheckbox.checked);
        }
      });
      passwordInput.focus();
    }
  }

  // 利用不可メッセージを表示
  showUnavailableMessage() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    const modalContent = modal.querySelector('div');
    if (!modalContent) return;

    // 既存のコンテンツをクリア
    modalContent.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'サービス利用不可';
    title.style.marginBottom = '20px';
    title.style.color = '#dc3545';

    const message = document.createElement('p');
    message.textContent = '認証サーバーに接続できません。';
    message.style.marginBottom = '15px';
    message.style.color = '#666';

    const detail = document.createElement('p');
    detail.textContent = 'しばらく時間をおいてから再度お試しください。';
    detail.style.marginBottom = '20px';
    detail.style.color = '#666';
    detail.style.fontSize = '14px';

    const closeButton = document.createElement('button');
    closeButton.textContent = '閉じる';
    closeButton.style.cssText = `
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    `;

    closeButton.addEventListener('click', () => {
      // ビューポート設定を元に戻す
      this.restoreViewport();
      modal.remove();
      this.showNoAuthPages();
    });

    modalContent.appendChild(title);
    modalContent.appendChild(message);
    modalContent.appendChild(detail);
    modalContent.appendChild(closeButton);
  }

  // モーダルを認証データで更新
  updateModalWithAuthData() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    const modalContent = modal.querySelector('div');
    if (!modalContent) return;

    // 既存のコンテンツをクリア
    modalContent.innerHTML = '';

    // 認証コンテンツを作成
    this.createAuthContent(modalContent);

    // タイマーを開始（パスワード入力が有効/ブロック中は開始しない）
    this.startTimer(20);
    // ブロック中ならカウントダウン再開
    if (this.lockoutTime > Date.now()) {
      this.startBlockCountdownFromExisting();
    }
  }

  // 入力UIの有効/無効化
  disableAuthInputs(disabled) {
    const submit = document.getElementById('auth-submit-btn');
    if (submit) submit.disabled = disabled;
    const pw = document.getElementById('auth-password');
    if (pw) pw.disabled = disabled;
    document.querySelectorAll('#sentence-options input[type="checkbox"]').forEach(cb => {
      cb.disabled = disabled;
    });
  }

  // ブロックを開始（秒）
  startBlockCountdown(seconds) {
    this.lockoutTime = Date.now() + seconds * 1000;
    this.saveRuntimeState();
    this.startBlockCountdownFromExisting();
  }

  // 既存のlockoutTimeから残り秒を表示
  startBlockCountdownFromExisting() {
    const overlay = document.getElementById('lockout-overlay');
    const lockoutDisplay = document.getElementById('lockout-display');
    const sentenceContainer = document.getElementById('sentence-options');
    if (!overlay || !lockoutDisplay || !sentenceContainer) return;

    // 入力無効化と問題更新タイマー停止
    this.disableAuthInputs(true);
    this.stopTimer();

    // 選択肢全体をブラー
    sentenceContainer.style.filter = 'blur(4px)';
    overlay.style.display = 'flex';

    if (this.blockCountdownInterval) {
      clearInterval(this.blockCountdownInterval);
      this.blockCountdownInterval = null;
    }

    const update = () => {
      const remainingMs = Math.max(0, this.lockoutTime - Date.now());
      const remaining = Math.ceil(remainingMs / 1000);
      if (remaining > 0) {
        lockoutDisplay.textContent = `${remaining}秒後にやり直してください`;
        this.saveRuntimeState();
      } else {
        clearInterval(this.blockCountdownInterval);
        this.blockCountdownInterval = null;
        overlay.style.display = 'none';
        sentenceContainer.style.filter = '';
        this.lockoutTime = 0;
        this.disableAuthInputs(false);
        this.saveRuntimeState();
        // ロック解除時に問題を更新
        this.resetAuthModal(true);
      }
    };

    update();
    this.blockCountdownInterval = setInterval(update, 1000);
  }

  // セキュリティチェックの設定
  setupSecurityChecks() {
    // ページ離脱時の認証状態クリア
    window.addEventListener('beforeunload', () => {
      if (!this.noAuthMode) {
        this.isAuthenticated = false;
      }
    });
    
    // ページフォーカス時の認証状態再チェック
    window.addEventListener('focus', () => {
      if (!this.noAuthMode && !this.checkAuthStatus()) {
        this.showAuthModal();
      }
    });
    
    // 定期的なセキュリティチェック
    setInterval(() => {
      this.performSecurityChecks();
    }, 30000); // 30秒ごと
    
    // 開発者ツール検出の強化
    this.detectDevTools();
  }
  
  // セキュリティチェック実行
  performSecurityChecks() {
    if (this.noAuthMode) return;
    
    // 認証モーダルの存在チェック
    const modal = document.getElementById('auth-modal');
    if (!modal && !this.isModalVisible && !this.isAuthenticated && !this.checkAuthStatus()) {
      this.showAuthModal();
    }
    
    // メインコンテンツは触らない（隠すと入力が消えたように見えるため）
  }
  
  // 開発者ツール検出の強化
  detectDevTools() {
    let devtools = { open: false, orientation: null };
    
    setInterval(() => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.handleDevToolsOpen();
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }
  
  // 開発者ツールが開かれた時の処理
  handleDevToolsOpen() {
    if (this.noAuthMode) return; // 認証不要ページ
    // 既に認証OKなら再表示しない
    if (this.checkAuthStatus()) return;
    // 認証リセット
    this.isAuthenticated = false;
    this.clearAuthState();
    // 再表示
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.remove();
    }
    this.isModalVisible = false;
    this.isModalRendering = false;
    this.showAuthModal();
    alert('著作権上の理由により、認証が必要です。');
  }
}

// 初期化
function initAuth() {
  if (window.kosamuraAPI && typeof window.kosamuraAPI.getAuthData === 'function') {
    window.authManager = new AuthManager();
  } else {
    // APIが利用可能になるまで短い間隔で再試行
    setTimeout(initAuth, 50);
  }
}

// 即座に初期化を実行
  initAuth();
