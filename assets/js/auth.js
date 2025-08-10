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
    
    // 特定のページでは認証状態に関係なく即座に認証画面を表示
    const currentPage = window.location.pathname;
    if (currentPage.includes('upload.html') || currentPage.includes('search.html')) {
      this.showAuthModal();
      return;
    }
    
    if (this.checkAuthStatus()) {
      this.showMainContent();
    } else {
      this.showAuthModal();
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
    await this.fetchAuthData();
    if (!this.authData) {
      console.error('認証データの取得に失敗しました');
      return;
    }
    this.createAndShowModal();
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

  createAndShowModal() {
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
      align-items: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
      text-align: center;
    `;

    const title = document.createElement('h2');
    title.textContent = '認証が必要です';
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
    `;

    const sentenceLabel = document.createElement('p');
    sentenceLabel.textContent = '秋高について述べた文章を2つ選択';
    sentenceLabel.style.marginBottom = '15px';

    const sentenceContainer = document.createElement('div');
    sentenceContainer.id = 'sentence-options';
    sentenceContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
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

    const selectedSentences = new Set();

    allSentences.forEach((sentence, index) => {
      const sentenceCheckbox = document.createElement('input');
      sentenceCheckbox.type = 'checkbox';
      sentenceCheckbox.id = `sentence-${index}`;
      sentenceCheckbox.dataset.isCorrect = sentence.isCorrect;
      sentenceCheckbox.dataset.text = sentence.text; // チェックボックスにテキストを追加
      // チェックボックスのスタイルを統一
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
      
      // チェックボックスの状態に応じてスタイルを更新
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
        font-size: 14px;
        line-height: 1.4;
      `;

      const container = document.createElement('div');
      container.id = `container-${index}`;
      container.style.cssText = `
        display: flex;
        align-items: flex-start;
        padding: 10px;
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
          if (selectedSentences.size >= 2) {
            // 3つ目を選んだ場合、最初に選んだものを自動的に取り消す
            const firstSelected = Array.from(selectedSentences)[0];
            selectedSentences.delete(firstSelected);
            
            // 最初に選んだチェックボックスの状態を更新
            const firstCheckbox = document.querySelector(`[data-text="${firstSelected}"]`);
            if (firstCheckbox) {
              firstCheckbox.checked = false;
              firstCheckbox.style.background = '#fff';
              firstCheckbox.style.borderColor = '#ccc';
              firstCheckbox.classList.remove('auth-checkbox-checked');
              
              // 最初に選んだコンテナの背景色も元に戻す
              const firstContainer = firstCheckbox.closest('div[id^="container-"]');
              if (firstContainer) {
                firstContainer.style.backgroundColor = '#f9f9f9';
                firstContainer.style.color = 'black';
              }
            }
          }
          
          selectedSentences.add(sentence.text);
          // 選択時の背景色を青に変更
          container.style.backgroundColor = '#e3f2fd';
          container.style.color = '#1976d2';
        } else {
          selectedSentences.delete(sentence.text);
          // 選択解除時の背景色を元に戻す
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

    // 次回からスキップのチェックボックス
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
    
    // チェックボックスの状態に応じてスタイルを更新
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

    // チェックボックスを先に追加し、その後にテキストを追加
    skipLabel.appendChild(skipCheckbox);
    skipLabel.appendChild(document.createTextNode(' 次回からスキップ'));

    submitButton.addEventListener('click', () => {
      this.validateAuth(passwordInput.value, selectedSentences, skipCheckbox.checked);
    });

    modalContent.appendChild(title);
    modalContent.appendChild(passwordInput);
    modalContent.appendChild(sentenceLabel);
    modalContent.appendChild(sentenceContainer);
    
    // カウントダウンタイマー
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
    modalContent.appendChild(skipLabel); // スキップチェックボックスをカウントダウンの後に追加
    modalContent.appendChild(submitButton);
    
    // 認証不要のページを閲覧するリンク
    const noAuthLink = document.createElement('a');
    noAuthLink.href = '../';
    noAuthLink.textContent = '認証不要のページを閲覧';
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

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // タイマーを開始
    this.startTimer(20);
    
    // Enterキーで認証
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.validateAuth(passwordInput.value, selectedSentences, skipCheckbox.checked);
      }
    });

    passwordInput.focus();
  }

  validateAuth(password, selectedSentences, skipNextTime) {
    const isPasswordCorrect = password === this.authData.password;
    
    // 選択された文章が2つで、かつ正しい文章のみが選択されているかチェック
    const hasTwoCorrectSentences = selectedSentences.size === 2 && 
                                  Array.from(selectedSentences).every(text => 
                                    this.authData.correctSentences.includes(text)
                                  );

    if (isPasswordCorrect && hasTwoCorrectSentences) {
      this.authenticate(skipNextTime);
    } else {
      // エラー時は質問をシャッフルしてパスワードをクリア
      this.resetAuthModal();
      alert('正しくありません');
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
    this.createAndShowModal();
    
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
    
    const authInfo = {
      isAuthenticated: true
    };
    if (skipNextTime) {
      localStorage.setItem('kosamuraAuth', JSON.stringify(authInfo));
    } else {
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
    
    // 常にトップページ（index.html）に移動
    window.location.href = '/index.html';
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
}

// 初期化
function initAuth() {
  if (window.kosamuraAPI && typeof window.kosamuraAPI.getAuthData === 'function') {
    window.authManager = new AuthManager();
  } else {
    setTimeout(initAuth, 100);
  }
}

// DOMContentLoadedイベントで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
