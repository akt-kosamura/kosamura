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
      const response = await fetch(`${this.baseURL}?function=getData`);
      if (!response.ok) throw new Error('データ取得に失敗しました');
      const result = await response.json();
      // GASの戻り値形式に合わせる（直接データ配列を返す）
      return result.result || result || [];
    } catch (error) {
      console.error('getData error:', error);
      return [];
    }
  }

  // ファイルアップロード（GAS運用時と同じ）
  async uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB) {
    try {
      // GASのdoPost関数が期待する形式でFormDataを作成
      const formData = new FormData();
      
      // ファイルデータをBlobとして追加
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      
      // GASのdoPost関数が期待する形式でデータを追加
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
      
      // GASのdoPost関数が期待する形式でファイルデータを追加
      // GASでは e.postData.getBlob() でファイルデータを取得し、
      // fileBlob.getName() でファイル名を取得する
      formData.append('file', blob, filename);

      const response = await fetch(`${this.baseURL}?function=uploadFileAndRecord`, {
        method: 'POST',
        body: formData
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
      }
    }
  }
}; 