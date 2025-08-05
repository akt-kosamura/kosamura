// GAS運用時と同じAPIクライアントライブラリ
class KosamuraAPI {
  constructor(baseURL = null) {
    // ベースURLを動的に決定
    if (baseURL) {
      this.baseURL = baseURL;
    } else {
      // GASのURLをデフォルトとして設定
      this.baseURL = 'https://script.google.com/macros/s/AKfycbwEAhdiJOtbf44ifY-BoAFhLI7eQl_uIJKm9NDTexoWZD7U8l-7wsrT9ufRCZ9d8lZf/exec';
    }
  }

  // データ取得（GAS運用時と同じ）
  async getData() {
    try {
      // タイムアウト設定（25秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const response = await fetch(`${this.baseURL}?function=getData`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('データ取得に失敗しました');
      const result = await response.json();
      // GASの戻り値形式に合わせる（直接データ配列を返す）
      return result.result || result || [];
    } catch (error) {
      console.error('getData error:', error);
      if (error.name === 'AbortError') {
        throw new Error('タイムアウト: データの取得に時間がかかりすぎています');
      }
      return [];
    }
  }

  // ファイルアップロード（GAS運用時と同じ）
  async uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB) {
    try {
      // GASのdoPost関数が期待する形式でURLパラメータを作成
      const params = new URLSearchParams();
      params.append('function', 'uploadFileAndRecord');
      params.append('grade', grade);
      params.append('year', year);
      params.append('type', type);
      params.append('subject', subject);
      params.append('stream', stream);
      params.append('contentType', contentType);
      params.append('fileFormat', fileFormat);
      params.append('comment', comment);
      params.append('fileSizeMB', fileSizeMB);
      params.append('deviceInfo', JSON.stringify(deviceInfo));
      params.append('filename', filename);
      
      // Base64エンコードされたファイルデータをリクエストボディとして送信
      const response = await fetch(`${this.baseURL}?${params.toString()}`, {
        method: 'POST',
        body: base64,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`アップロードに失敗しました: ${errorText}`);
      }
      
      const result = await response.json();
      
      // GASの戻り値形式に合わせる（直接URL文字列を返す）
      if (result.error) {
        throw new Error(result.error);
      }
      
      // resultが直接URL文字列の場合と、result.urlの場合の両方に対応
      return result.url || result || '';
    } catch (error) {
      console.error('uploadFileAndRecord error:', error);
      throw error;
    }
  }

  // いいね増加（GAS運用時と同じ）
  async like(id) {
    try {
      const formData = new FormData();
      formData.append('id', id);

      const response = await fetch(`${this.baseURL}?function=like`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('いいねの処理に失敗しました');
      const result = await response.json();
      // GASの戻り値形式に合わせる（直接数値を返す）
      return result.result || result || 0;
    } catch (error) {
      console.error('like error:', error);
      throw error;
    }
  }

  // いいね取り消し（GAS運用時と同じ）
  async unlike(id) {
    try {
      const formData = new FormData();
      formData.append('id', id);

      const response = await fetch(`${this.baseURL}?function=unlike`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('いいね取り消しに失敗しました');
      const result = await response.json();
      // GASの戻り値形式に合わせる（直接数値を返す）
      return result.result || result || 0;
    } catch (error) {
      console.error('unlike error:', error);
      throw error;
    }
  }

  // バッド増加（GAS運用時と同じ）
  async bad(id) {
    try {
      const formData = new FormData();
      formData.append('id', id);

      const response = await fetch(`${this.baseURL}?function=bad`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('バッドの処理に失敗しました');
      const result = await response.json();
      // GASの戻り値形式に合わせる（直接数値を返す）
      return result.result || result || 0;
    } catch (error) {
      console.error('bad error:', error);
      throw error;
    }
  }

  // バッド取り消し（GAS運用時と同じ）
  async unbad(id) {
    try {
      const formData = new FormData();
      formData.append('id', id);

      const response = await fetch(`${this.baseURL}?function=unbad`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('バッド取り消しに失敗しました');
      const result = await response.json();
      // GASの戻り値形式に合わせる（直接数値を返す）
      return result.result || result || 0;
    } catch (error) {
      console.error('unbad error:', error);
      throw error;
    }
  }

  // 管理者認証（GAS運用時と同じ）
  async checkAdminPassword(password) {
    try {
      const formData = new FormData();
      formData.append('password', password);

      const response = await fetch(`${this.baseURL}?function=checkAdminPassword`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('認証に失敗しました');
      const result = await response.json();
      return result.result === 'ok';
    } catch (error) {
      console.error('checkAdminPassword error:', error);
      return false;
    }
  }

  // 投稿削除（GAS運用時と同じ）
  async deletePost(id) {
    try {
      const formData = new FormData();
      formData.append('id', id);

      const response = await fetch(`${this.baseURL}?function=deletePost`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('削除に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('deletePost error:', error);
      throw error;
    }
  }

  // 投稿更新（GAS運用時と同じ）
  async updatePost(postData) {
    try {
      const formData = new FormData();
      formData.append('postData', JSON.stringify(postData));

      const response = await fetch(`${this.baseURL}?function=updatePost`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('更新に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('updatePost error:', error);
      throw error;
    }
  }

  // 複数投稿削除（GAS運用時と同じ）
  async deletePostsBulk(ids) {
    try {
      const formData = new FormData();
      formData.append('ids', JSON.stringify(ids));

      const response = await fetch(`${this.baseURL}?function=deletePostsBulk`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('一括削除に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('deletePostsBulk error:', error);
      throw error;
    }
  }

  // 統計情報取得（GAS運用時と同じ）
  async getStats() {
    try {
      const response = await fetch(`${this.baseURL}?function=getStats`);
      if (!response.ok) throw new Error('統計情報の取得に失敗しました');
      const result = await response.json();
      return result.result || result || { totalPosts: 0, totalLikes: 0, activeUsers: 0 };
    } catch (error) {
      console.error('getStats error:', error);
      return { totalPosts: 0, totalLikes: 0, activeUsers: 0 };
    }
  }

  // アクセス数を増加（GAS運用時と同じ）
  async incrementAccessCount() {
    try {
      console.log('=== incrementAccessCount 開始 ===');
      
      // localStorageで3時間制限をチェック
      const lastAccessKey = 'kosamura_last_access';
      const now = Date.now();
      const threeHoursInMs = 3 * 60 * 60 * 1000; // 3時間をミリ秒で
      
      const lastAccess = localStorage.getItem(lastAccessKey);
      console.log('localStorage lastAccess:', lastAccess);
      
      if (lastAccess) {
        const timeDiff = now - parseInt(lastAccess);
        console.log('timeDiff (hours):', timeDiff / (1000 * 60 * 60));
        if (timeDiff < threeHoursInMs) {
          console.log('3時間以内にアクセス済みです。カウントを増加しません。');
          return 0; // 3時間以内の場合は増加しない
        }
      }
      
      console.log('3時間制限チェック通過');
      
      // IPアドレスを取得（簡易的な方法）
      console.log('IPアドレスを取得中...');
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ipAddress = ipData.ip;
      console.log('取得したIPアドレス:', ipAddress);
      
      const formData = new FormData();
      formData.append('function', 'incrementAccessCount');
      formData.append('ipAddress', ipAddress);
      formData.append('userAgent', navigator.userAgent);
      formData.append('clientTimestamp', now.toString());

      console.log('GASにリクエスト送信中...');
      console.log('baseURL:', this.baseURL);
      
      const response = await fetch(`${this.baseURL}`, {
        method: 'POST',
        body: formData
      });
      
      console.log('レスポンス status:', response.status);
      console.log('レスポンス ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('レスポンスエラー:', errorText);
        throw new Error('アクセス数の更新に失敗しました');
      }
      
      const result = await response.json();
      console.log('GASからのレスポンス:', result);
      
      // レスポンス形式を確認して適切に処理
      let accessCount;
      if (result.result && result.result.accessCount !== undefined) {
        accessCount = result.result.accessCount;
      } else if (result.accessCount !== undefined) {
        accessCount = result.accessCount;
      } else {
        console.error('アクセス数がレスポンスに含まれていません:', result);
        accessCount = 0;
      }
      
      // 成功した場合、localStorageにアクセス時刻を記録
      if (accessCount > 0) {
        localStorage.setItem(lastAccessKey, now.toString());
        console.log('アクセス数を更新しました。3時間後に再カウント可能になります。');
      }
      
      console.log('=== incrementAccessCount 終了 ===');
      return accessCount;
    } catch (error) {
      console.error('incrementAccessCount error:', error);
      console.error('エラーの詳細:', error.toString());
      return 0;
    }
  }

  // 広告視聴後に一時的なアクセストークンを取得
  async getTemporaryAccessToken(fileId) {
    try {
      const formData = new FormData();
      formData.append('fileId', fileId);

      const response = await fetch(`${this.baseURL}?function=getTemporaryAccessToken`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('アクセストークンの取得に失敗しました');
      const result = await response.json();
      return result.token || result || '';
    } catch (error) {
      console.error('getTemporaryAccessToken error:', error);
      throw error;
    }
  }

  // トークンを使用してファイルにアクセス
  async accessFileWithToken(fileId, token) {
    try {
      const response = await fetch(`${this.baseURL}?function=accessFileWithToken&fileId=${fileId}&token=${token}`);
      if (!response.ok) throw new Error('ファイルアクセスに失敗しました');
      return response;
    } catch (error) {
      console.error('accessFileWithToken error:', error);
      throw error;
    }
  }
}

// グローバルインスタンスを作成
window.kosamuraAPI = new KosamuraAPI();

// Google Apps Script互換性レイヤー（GAS運用時と同じ）
window.google = {
  script: {
    run: {
      getData: function() {
        return new Promise((resolve) => {
          kosamuraAPI.getData()
            .then(data => resolve(data))
            .catch(() => resolve([]));
        });
      },
      
      uploadFileAndRecord: function(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB) {
        return new Promise((resolve, reject) => {
          kosamuraAPI.uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB)
            .then(url => resolve(url))
            .catch(error => reject(error));
        });
      },
      
      like: function(id) {
        return new Promise((resolve) => {
          kosamuraAPI.like(id)
            .then(result => resolve(result))
            .catch(() => resolve(0));
        });
      },
      
      unlike: function(id) {
        return new Promise((resolve) => {
          kosamuraAPI.unlike(id)
            .then(result => resolve(result))
            .catch(() => resolve(0));
        });
      },
      
      bad: function(id) {
        return new Promise((resolve) => {
          kosamuraAPI.bad(id)
            .then(result => resolve(result))
            .catch(() => resolve(0));
        });
      },
      
      unbad: function(id) {
        return new Promise((resolve) => {
          kosamuraAPI.unbad(id)
            .then(result => resolve(result))
            .catch(() => resolve(0));
        });
      },
      
      checkAdminPassword: function(password) {
        return new Promise((resolve) => {
          kosamuraAPI.checkAdminPassword(password)
            .then(result => {
              // GAS運用時と同じlocalStorage管理
              if (result) {
                localStorage.setItem('admin_auth', 'ok');
                resolve('ok');
              } else {
                resolve('ng');
              }
            })
            .catch(() => resolve('ng'));
        });
      },
      
      deletePost: function(id) {
        kosamuraAPI.deletePost(id).catch(console.error);
      },
      
      updatePost: function(postData) {
        kosamuraAPI.updatePost(postData).catch(console.error);
      },
      
      deletePostsBulk: function(ids) {
        kosamuraAPI.deletePostsBulk(ids).catch(console.error);
      },
      
      getStats: function() {
        return new Promise((resolve) => {
          kosamuraAPI.getStats()
            .then(stats => resolve(stats))
            .catch(() => resolve({ totalPosts: 0, totalLikes: 0, activeUsers: 0 }));
        });
      },
      
      incrementAccessCount: function() {
        return new Promise((resolve) => {
          kosamuraAPI.incrementAccessCount()
            .then(count => resolve(count))
            .catch(() => resolve(0));
        });
      }
    }
  }
}; 