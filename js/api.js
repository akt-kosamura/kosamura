// GAS運用時と同じAPIクライアントライブラリ
class KosamuraAPI {
  constructor(baseURL = null) {
    // ベースURLを動的に決定
    if (baseURL) {
      this.baseURL = baseURL;
    } else {
      // 現在のページのプロトコルとホストを使用
      this.baseURL = window.location.origin;
    }
    // GAS互換APIのみを使用
    this.gasAPI = new GASCompatibleAPI(this.baseURL);
  }

  // データ取得（GAS運用時と同じ）
  async getData() {
    try {
      const response = await fetch(`${this.baseURL}/exec?function=getData`);
      if (!response.ok) throw new Error('データ取得に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('getData error:', error);
      return [];
    }
  }

  // ファイルアップロード（GAS運用時と同じ）
  async uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB) {
    try {
      // Base64をBlobに変換
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('grade', grade);
      formData.append('year', year);
      formData.append('type', type);
      formData.append('subject', subject);
      formData.append('stream', stream);
      formData.append('contentType', contentType);
      formData.append('fileFormat', fileFormat);
      formData.append('comment', comment);
      formData.append('fileSizeMB', fileSizeMB);
      formData.append('deviceInfo', JSON.stringify(deviceInfo));

      const response = await fetch(`${this.baseURL}/exec?function=uploadFileAndRecord`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('アップロードに失敗しました');
      const result = await response.json();
      return result.url; // GASの戻り値と合わせる
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

      const response = await fetch(`${this.baseURL}/exec?function=like`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('いいねの処理に失敗しました');
      return await response.json();
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

      const response = await fetch(`${this.baseURL}/exec?function=unlike`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('いいね取り消しに失敗しました');
      return await response.json();
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

      const response = await fetch(`${this.baseURL}/exec?function=bad`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('バッドの処理に失敗しました');
      return await response.json();
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

      const response = await fetch(`${this.baseURL}/exec?function=unbad`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('バッド取り消しに失敗しました');
      return await response.json();
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

      const response = await fetch(`${this.baseURL}/exec?function=checkAdminPassword`, {
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

      const response = await fetch(`${this.baseURL}/exec?function=deletePost`, {
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

      const response = await fetch(`${this.baseURL}/exec?function=updatePost`, {
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

      const response = await fetch(`${this.baseURL}/exec?function=deletePostsBulk`, {
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
}

// グローバルAPIインスタンス
window.kosamuraAPI = new KosamuraAPI();

// Google Apps Script互換性レイヤー（GAS運用時と同じ）
window.google = {
  script: {
    run: {
      // データ取得（withSuccessHandler対応）
      withSuccessHandler: function(callback) {
        return {
          getData: function() {
            kosamuraAPI.getData().then(callback).catch(console.error);
          }
        };
      },
      
      // いいね・バッド（直接呼び出し対応）
      like: function(id) {
        kosamuraAPI.like(id).catch(console.error);
      },
      unlike: function(id) {
        kosamuraAPI.unlike(id).catch(console.error);
      },
      bad: function(id) {
        kosamuraAPI.bad(id).catch(console.error);
      },
      unbad: function(id) {
        kosamuraAPI.unbad(id).catch(console.error);
      },
      
      // ファイルアップロード（withSuccessHandler/withFailureHandler対応）
      withSuccessHandler: function(successCallback) {
        return {
          withFailureHandler: function(failureCallback) {
            return {
              uploadFileAndRecord: function(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB) {
                kosamuraAPI.uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB)
                  .then(successCallback)
                  .catch(failureCallback);
              }
            };
          }
        };
      },
      
      // 管理者機能（GAS運用時と同じ動作）
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
      }
    }
  }
}; 