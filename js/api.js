// API クライアントライブラリ
class KosamuraAPI {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  // データ取得
  async getData() {
    try {
      const response = await fetch(`${this.baseURL}/api/data`);
      if (!response.ok) throw new Error('データ取得に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('getData error:', error);
      return [];
    }
  }

  // ファイルアップロード
  async uploadFile(formData) {
    try {
      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('アップロードに失敗しました');
      return await response.json();
    } catch (error) {
      console.error('uploadFile error:', error);
      throw error;
    }
  }

  // いいね増加
  async like(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/like/${id}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('いいねの処理に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('like error:', error);
      throw error;
    }
  }

  // いいね取り消し
  async unlike(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/unlike/${id}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('いいね取り消しに失敗しました');
      return await response.json();
    } catch (error) {
      console.error('unlike error:', error);
      throw error;
    }
  }

  // バッド増加
  async bad(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/bad/${id}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('バッドの処理に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('bad error:', error);
      throw error;
    }
  }

  // バッド取り消し
  async unbad(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/unbad/${id}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('バッド取り消しに失敗しました');
      return await response.json();
    } catch (error) {
      console.error('unbad error:', error);
      throw error;
    }
  }

  // 管理者認証
  async adminAuth(password) {
    try {
      const response = await fetch(`${this.baseURL}/api/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      if (!response.ok) throw new Error('認証に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('adminAuth error:', error);
      throw error;
    }
  }

  // 管理者用データ取得
  async getAdminData(token) {
    try {
      const response = await fetch(`${this.baseURL}/api/admin/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('データ取得に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('getAdminData error:', error);
      throw error;
    }
  }

  // 投稿削除
  async deletePost(id, token) {
    try {
      const response = await fetch(`${this.baseURL}/api/post/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('削除に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('deletePost error:', error);
      throw error;
    }
  }

  // 投稿更新
  async updatePost(id, postData, token) {
    try {
      const response = await fetch(`${this.baseURL}/api/admin/post/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });
      if (!response.ok) throw new Error('更新に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('updatePost error:', error);
      throw error;
    }
  }

  // 複数投稿削除
  async deletePostsBulk(ids, token) {
    try {
      const response = await fetch(`${this.baseURL}/api/admin/posts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids })
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

// Google Apps Script互換性レイヤー
window.google = {
  script: {
    run: {
      // データ取得
      withSuccessHandler: function(callback) {
        return {
          getData: function() {
            kosamuraAPI.getData().then(callback).catch(console.error);
          }
        };
      },
      
      // いいね・バッド
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
      
      // 管理者機能
      checkAdminPassword: function(password) {
        return new Promise((resolve) => {
          kosamuraAPI.adminAuth(password)
            .then(result => resolve('ok'))
            .catch(() => resolve('ng'));
        });
      },
      
      deletePost: function(id) {
        const token = localStorage.getItem('adminToken');
        if (token) {
          kosamuraAPI.deletePost(id, token).catch(console.error);
        }
      },
      
      updatePost: function(postData) {
        const token = localStorage.getItem('adminToken');
        if (token) {
          kosamuraAPI.updatePost(postData.id, postData, token).catch(console.error);
        }
      },
      
      deletePostsBulk: function(ids) {
        const token = localStorage.getItem('adminToken');
        if (token) {
          kosamuraAPI.deletePostsBulk(ids, token).catch(console.error);
        }
      }
    }
  }
}; 