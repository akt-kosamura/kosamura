// GAS互換APIクライアント
class GASCompatibleAPI {
  constructor(baseURL = null) {
    // ベースURLを動的に決定
    if (baseURL) {
      this.baseURL = baseURL;
    } else {
      // 現在のページのプロトコルとホストを使用
      this.baseURL = window.location.origin;
    }
  }

  // データ取得（GAS互換）
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

  // ファイルアップロード（GAS互換）
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

  // いいね増加（GAS互換）
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

  // いいね取り消し（GAS互換）
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

  // バッド増加（GAS互換）
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

  // バッド取り消し（GAS互換）
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

  // 管理者認証（GAS互換）
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
}

// グローバルに公開
window.GASCompatibleAPI = GASCompatibleAPI; 