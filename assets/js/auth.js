// 認証機能管理
class AuthManager {
  constructor() {
    this.authData = null;
    this.noAuthMode = false;
    this.init();
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
    
    const authInfo = localStorage.getItem('kosamuraAuth');
    if (!authInfo) return false;

    try {
      const { isAuthenticated } = JSON.parse(authInfo);
      return isAuthenticated === true;
    } catch (error) {
      return false;
    }
  }

  async showAuthModal() {
    // 即座に認証画面を表示（ローディング状態で）
    this.createAndShowModal(true);
    
    // APIから認証データを取得
    await this.fetchAuthData();
    
    if (!this.authData) {
      // APIが利用できない場合は利用不可メッセージを表示
      this.showUnavailableMessage();
      return;
    }
    
    // 認証データが取得できた場合は通常の認証画面に切り替え
    this.updateModalWithAuthData();
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
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      z-index: 10000;
      overflow-y: auto;
      padding: 20px;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      margin: auto;
      max-height: 90vh;
      overflow-y: auto;
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
    const isPasswordCorrect = password === this.authData.password;
    
    // 選択された文章が2つで、かつ正しい文章のみが選択されているかチェック
    const hasTwoCorrectSentences = selectedSentences.size === 2 && 
                                  Array.from(selectedSentences).every(text => 
                                    this.authData.correctSentences.includes(text)
                                  );

    // デバッグ情報をコンソールに出力
    console.log('認証デバッグ情報:');
    console.log('入力されたパスワード:', password);
    console.log('正しいパスワード:', this.authData.password);
    console.log('パスワード一致:', isPasswordCorrect);
    console.log('選択された文章数:', selectedSentences.size);
    console.log('選択された文章:', Array.from(selectedSentences));
    console.log('正しい文章リスト:', this.authData.correctSentences);
    console.log('文章選択正解:', hasTwoCorrectSentences);

    if (isPasswordCorrect && hasTwoCorrectSentences) {
      this.authenticate(skipNextTime);
    } else {
      // エラー時は質問をシャッフルしてパスワードをクリア
      this.resetAuthModal();
      alert('あなたは秋高生ではありません。お帰りください。');
    }
  }

  resetAuthModal(keepPassword = false) {
    // タイマーを停止
    this.stopTimer();
    
    // 既存のモーダルを削除
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.remove();
    }
    
    // 新しいモーダルを表示（質問がシャッフルされる）
    this.createAndShowModal(false);
    
    // パスワードが保持される場合は、パスワード入力欄をクリアしない
    if (keepPassword) {
      const passwordInput = document.getElementById('auth-password');
      if (passwordInput) {
        // 既存のパスワードを保持
        const oldPasswordInput = modal.querySelector('#auth-password');
        if (oldPasswordInput) {
          passwordInput.value = oldPasswordInput.value;
        }
      }
    }
  }

  authenticate(skipNextTime) {
    // 認証不要モードを解除
    this.noAuthMode = false;
    
    // タイマーを停止
    this.stopTimer();
    
    // skipNextTimeがtrueの場合のみlocalStorageに保存
    if (skipNextTime) {
      const authInfo = {
        isAuthenticated: true
      };
      localStorage.setItem('kosamuraAuth', JSON.stringify(authInfo));
    }
    
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.remove();
    }
    
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
    
    // 認証モーダルを閉じる
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.remove();
    }
    
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
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;
    
    let timeLeft = seconds;
    timerDisplay.textContent = `${timeLeft}秒後に問題を更新`;
    
    this.timerInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = `${timeLeft}秒後に問題を更新`;
      
      if (timeLeft <= 0) {
        clearInterval(this.timerInterval);
        // 時間切れでモーダルをリセット（パスワードは保持）
        this.resetAuthModal(true);
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
    const title = document.createElement('h2');
    title.textContent = '秋高生限定';
    title.style.marginBottom = '20px';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'auth-password';
    passwordInput.placeholder = 'パスワード';
    passwordInput.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    `;

    const sentenceLabel = document.createElement('p');
    sentenceLabel.textContent = '秋高について述べた文章を2つ選択';
    sentenceLabel.style.marginBottom = '15px';

    const sentenceContainer = document.createElement('div');
    sentenceContainer.id = 'sentence-options';
    
    // ph-index.htmlの場合は縦4列、それ以外は横2列
    const currentPage = window.location.pathname;
    const isPhonePage = currentPage.includes('ph-index.html');
    
    sentenceContainer.style.cssText = `
      display: grid;
      grid-template-columns: ${isPhonePage ? '1fr' : '1fr 1fr'};
      gap: 10px;
      margin-bottom: 20px;
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
        width: 18px;
        height: 18px;
        border: 2px solid #ccc;
        border-radius: 3px;
        background: #fff;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        flex-shrink: 0;
        margin-right: 8px;
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
        font-size: ${isPhonePage ? '16px' : '14px'};
        line-height: 1.4;
      `;

      const container = document.createElement('div');
      container.id = `container-${index}`;
      container.style.cssText = `
        display: flex;
        align-items: flex-start;
        padding: ${isPhonePage ? '15px' : '10px'};
        border: 1px solid #ddd;
        border-radius: 5px;
        background: #f9f9f9;
        transition: background-color 0.2s ease;
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
    submitButton.textContent = '認証';
    submitButton.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    `;

    const skipCheckbox = document.createElement('input');
    skipCheckbox.type = 'checkbox';
    skipCheckbox.id = 'skip-next-time';
    skipCheckbox.style.cssText = `
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      width: 18px;
      height: 18px;
      border: 2px solid #ccc;
      border-radius: 3px;
      background: #fff;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      flex-shrink: 0;
      margin-right: 8px;
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
      margin-bottom: 15px;
      font-size: 14px;
      color: #666;
      cursor: pointer;
    `;

    skipLabel.appendChild(skipCheckbox);
    skipLabel.appendChild(document.createTextNode(' 次回からスキップ'));

    submitButton.addEventListener('click', () => {
      this.validateAuth(passwordInput.value, this.selectedSentences, skipCheckbox.checked);
    });

    modalContent.appendChild(title);
    modalContent.appendChild(passwordInput);
    modalContent.appendChild(sentenceLabel);
    modalContent.appendChild(sentenceContainer);
    
    const timerContainer = document.createElement('div');
    timerContainer.id = 'timer-container';
    timerContainer.style.cssText = `
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: bold;
      color: #dc3545;
    `;
    
    const timerLabel = document.createElement('span');
    timerLabel.textContent = '';
    
    const timerDisplay = document.createElement('span');
    timerDisplay.id = 'timer-display';
    timerDisplay.textContent = '20秒後に問題を更新';
    
    timerContainer.appendChild(timerLabel);
    timerContainer.appendChild(timerDisplay);
    
    modalContent.appendChild(timerContainer);
    modalContent.appendChild(skipLabel);
    modalContent.appendChild(submitButton);
    
    const noAuthLink = document.createElement('a');
    noAuthLink.href = '/index.html';
    noAuthLink.textContent = '認証不要のページに戻る';
    noAuthLink.style.cssText = `
      display: block;
      margin-top: 15px;
      color: #007bff;
      text-decoration: none;
      font-size: 14px;
      cursor: pointer;
    `;
    
    noAuthLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showNoAuthPages();
    });
    
    modalContent.appendChild(noAuthLink);

    // Enterキーで認証
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.validateAuth(passwordInput.value, this.selectedSentences, skipCheckbox.checked);
      }
    });

    passwordInput.focus();
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

    // タイマーを開始
    this.startTimer(20);
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