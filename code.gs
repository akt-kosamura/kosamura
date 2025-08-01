// Code.gs for 考査村

// アップロード先フォルダのID
const FOLDER_ID = '1xx-N4rKwFTk83iIxSOCEhctJQv-3rZrC';
// スプレッドシートID
const SPREADSHEET_ID = '14uI1FoXUWg_deV-ZGSYY85JREyLyZY4YVqpKka35sZw';
const SHEET_NAME = 'シート1';

/**
 * ファイルアップロード＆メタ情報記録
 * @param {string} grade        学年
 * @param {string} year         年度
 * @param {string} type         種類
 * @param {string} subject      科目
 * @param {string} stream       文理区分
 * @param {string} contentType  内容タイプ（問題＆解説等）
 * @param {string} fileFormat   ファイル形式（PDF, Word, Excel, 一太郎, 画像）
 * @param {string} comment      コメント
 * @param {string} filename     元ファイル名
 * @param {string} base64       ファイル本体の Base64
 * @param {Object} deviceInfo   デバイス情報
 * @return {string} アップロード先 URL
 */
function uploadFileAndRecord(
  grade = '', year = '', type = '', subject = '', stream = '',
  contentType = '', fileFormat = '', comment = '',
  filename = '', base64 = '', deviceInfo = {}, fileSizeMB = 0
) {
  try {
    // デバッグ用：受け取った値をログに出力
    Logger.log('uploadFileAndRecord 受け取った値:');
    Logger.log('grade: ' + grade);
    Logger.log('year: ' + year);
    Logger.log('type: ' + type);
    Logger.log('subject: ' + subject);
    Logger.log('stream: ' + stream);
    Logger.log('contentType: ' + contentType);
    Logger.log('fileFormat: ' + fileFormat);
    Logger.log('comment: ' + comment);
    Logger.log('filename: ' + filename);
    Logger.log('fileSizeMB: ' + fileSizeMB);
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(SHEET_NAME + ' が見つかりません');

    // 新規ID（A列の最大値+1で一意に）
    const idRange = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 1).getValues();
    let maxId = 0;
    idRange.forEach(row => {
      const n = Number(row[0]);
      if (!isNaN(n) && n > maxId) maxId = n;
    });
    const id = maxId + 1;

    // 新しいファイル名を作成: 学年_年度_種類_科目_文理区分_内容
    const extension = filename && filename.split('.').pop() ? filename.split('.').pop() : 'pdf';
    const newFileName = `${grade}_${year}_${type}_${subject}_${stream}_${contentType}.${extension}`;

    // ファイル保存
    if (!base64) {
      throw new Error('base64データが提供されていません');
    }
    
    // フォルダIDの検証とファイル保存
    let folder;
    try {
      folder = DriveApp.getFolderById(FOLDER_ID);
    } catch (folderError) {
      Logger.log('フォルダIDエラー: ' + folderError);
      throw new Error('指定されたフォルダIDが無効です。正しいフォルダIDを設定してください。現在のID: ' + FOLDER_ID);
    }
    
    const decoded = Utilities.base64Decode(base64);
    const blob    = Utilities.newBlob(decoded, 'application/octet-stream', newFileName);
    const file    = folder.createFile(blob);
    
    // セキュリティ設定：ダウンロードと印刷を禁止
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // ファイルの詳細設定でダウンロードと印刷を制限
    // 注意：Google Drive APIの制限により、完全な禁止は難しい場合があります
    // 代替案として、ファイル名に制限を示すプレフィックスを追加
    file.setName(newFileName);
    
    // 共有設定をより詳細に制御
    // 閲覧者の権限を制限（ダウンロード、印刷、コピーを制限）
    try {
      // ファイルの共有設定を更新
      const resource = {
        role: 'reader',
        type: 'anyone',
        withLink: true,
        // 以下の設定はGoogle Drive API v3で利用可能
        // ただし、Google Apps ScriptのDriveAppでは直接制御できない場合があります
      };
      
      // 共有リンクの設定を更新
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // 説明文は追加しない
      
    } catch (securityError) {
      Logger.log('セキュリティ設定の適用に失敗しました:' + securityError);
      // セキュリティ設定が失敗しても処理を続行
    }
    
    // Drive APIでダウンロード・印刷・コピーを禁止
    try {
      Drive.Files.update({
        viewersCanCopyContent: false, // 閲覧者によるダウンロード・印刷・コピーを禁止
        copyRequiresWriterPermission: true
      }, file.getId());
    } catch (apiError) {
      Logger.log('Drive API設定の適用に失敗しました:' + apiError);
      // API設定が失敗しても処理を続行
    }
    
    const url = file.getUrl();
    
    // アップロード日を文字列で生成
    const uploadDateStr = new Date().toLocaleString('ja-JP');
    
    // データを追加
    const rowData = [
      id,
      grade,
      year,
      type,
      subject,
      stream,
      contentType,
      fileFormat,
      comment,
      url,
      uploadDateStr,
      0, // likes
      0, // bad
      (deviceInfo && deviceInfo.publicIP) || 'Unknown',
      (deviceInfo && deviceInfo.privateIP) || 'Unknown',
      (deviceInfo && deviceInfo.userAgent) || 'Unknown',
      (deviceInfo && deviceInfo.platform) || 'Unknown',
      (deviceInfo && deviceInfo.screenWidth && deviceInfo.screenHeight) ?
        `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}` : 'Unknown',
      (deviceInfo && deviceInfo.windowWidth && deviceInfo.windowHeight) ?
        `${deviceInfo.windowWidth}x${deviceInfo.windowHeight}` : 'Unknown',
      fileSizeMB || 0
    ];
    
    sheet.appendRow(rowData);
    
    // メール送信
    sendNewPostNotification(id, grade, year, type, subject, stream, contentType, fileFormat, comment, url, uploadDateStr, deviceInfo, fileSizeMB);
    
    return url;
  } catch (error) {
    Logger.log('uploadFileAndRecord error: ' + error);
    throw error;
  }
}

/**
 * 新しい投稿の通知メールを送信
 */
function sendNewPostNotification(id, grade, year, type, subject, stream, contentType, fileFormat, comment, url, uploadDate, deviceInfo, fileSizeMB) {
  try {
    // デバイス情報を解析（安全チェック付き）
    const userAgent = (deviceInfo && deviceInfo.userAgent) || 'Unknown';
    const platform = (deviceInfo && deviceInfo.platform) || 'Unknown';
    const screenInfo = (deviceInfo && deviceInfo.screenWidth && deviceInfo.screenHeight) ? 
      `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}` : 'Unknown';
    const windowInfo = (deviceInfo && deviceInfo.windowWidth && deviceInfo.windowHeight) ? 
      `${deviceInfo.windowWidth}x${deviceInfo.windowHeight}` : 'Unknown';
    const publicIP = (deviceInfo && deviceInfo.publicIP) || 'Unknown';
    const privateIP = (deviceInfo && deviceInfo.privateIP) || 'Unknown';
    
    // メール本文を作成
    const subjectLine = `【考査村】新しい投稿が追加されました (ID: ${id})`;
    
    let body = `新しい投稿が考査村に追加されました。

【投稿詳細】
ID: ${id}
学年: ${grade}
年度: ${year}
種類: ${type}
科目: ${subject}
文理区分: ${stream}
内容: ${contentType}
      ファイル形式: ${fileFormat}
      ファイルサイズ: ${fileSizeMB} MB
      コメント: ${comment || 'なし'}
      アップロード日時: ${uploadDate}
      ファイルURL: ${url}

【デバイス情報】
公開IPアドレス: ${publicIP}
プライベートIPアドレス: ${privateIP}
User-Agent: ${userAgent}
プラットフォーム: ${platform}
画面解像度: ${screenInfo}
ウィンドウサイズ: ${windowInfo}

---
このメールは考査村の自動通知システムから送信されています。
`;

    // メール送信
    GmailApp.sendEmail(
      'kosamura.akita@gmail.com',
      subjectLine,
      body
    );
    
    Logger.log('新規投稿通知メールを送信しました: ID=' + id);
    
  } catch (error) {
    Logger.log('メール送信に失敗しました: ' + error.message);
    // メール送信が失敗してもアップロード処理は続行
  }
}

/**
 * データ取得
 */
function getData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return [];
    
    const data = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 20).getValues();
    
    return data.map((row, index) => ({
      id: Number(row[0]) || (index + 1),
      grade: String(row[1] || ''),
      year: String(row[2] || ''),
      type: String(row[3] || ''),
      subject: String(row[4] || ''),
      stream: String(row[5] || ''),
      contentType: String(row[6] || ''),
      format: String(row[7] || ''),
      comment: String(row[8] || ''),
      url: String(row[9] || ''),
      date: String(row[10] || ''),
      likes: Number(row[11]) || 0,
      bad: Number(row[12]) || 0,
      publicIP: String(row[13] || ''),
      privateIP: String(row[14] || ''),
      userAgent: String(row[15] || ''),
      platform: String(row[16] || ''),
      screenResolution: String(row[17] || ''),
      windowSize: String(row[18] || ''),
      fileSize: Number(row[19]) || 0
    }));
  } catch (error) {
    Logger.log('getData error: ' + error);
    return [];
  }
}

/**
 * いいね増加
 */
function like(id) {
  return updateCount(id, 11, +1);
}

/**
 * いいね取り消し
 */
function unlike(id) {
  return updateCount(id, 11, -1);
}

/**
 * バッド増加
 */
function bad(id) {
  return updateCount(id, 12, +1);
}

/**
 * バッド取り消し
 */
function unbad(id) {
  return updateCount(id, 12, -1);
}

/**
 * ID指定でカウント増減共通処理
 */
function updateCount(id, colIndex, delta) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('シートが見つかりません');
    
    const data = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 20).getValues();
    const rowIndex = data.findIndex(row => Number(row[0]) === Number(id));
    
    if (rowIndex === -1) {
      throw new Error('ID が見つかりません: ' + id);
    }
    
    const currentValue = Number(data[rowIndex][colIndex - 1]) || 0;
    const newValue = Math.max(0, currentValue + delta);
    
    sheet.getRange(rowIndex + 2, colIndex).setValue(newValue);
    
    return newValue;
  } catch (error) {
    Logger.log('updateCount error: ' + error);
    throw error;
  }
}

/**
 * 投稿削除
 */
function deletePost(id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return false;
    
    const data = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 20).getValues();
    const rowIndex = data.findIndex(row => String(row[0]) === String(id));
    
    if (rowIndex === -1) return false;
    
    // ファイル削除
    const url = data[rowIndex][9];
    const fileId = extractFileIdFromUrl(url);
    if (fileId) {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch (e) {
        Logger.log('ファイル削除失敗: ' + fileId + ' ' + e);
      }
    }
    
    // 行削除
    sheet.deleteRow(rowIndex + 2);
    return true;
  } catch (error) {
    Logger.log('deletePost error: ' + error);
    return false;
  }
}

/**
 * 投稿更新
 */
function updatePost(postData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('シートが見つかりません');
    
    const data = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 20).getValues();
    const rowIndex = data.findIndex(row => String(row[0]) === String(postData.id));
    
    if (rowIndex === -1) {
      throw new Error('指定されたIDの投稿が見つかりません: ' + postData.id);
    }
    
    // 各フィールドを更新（IDは変更しない）
    const row = rowIndex + 2;
    sheet.getRange(row, 2).setValue(postData.grade || '');
    sheet.getRange(row, 3).setValue(postData.year || '');
    sheet.getRange(row, 4).setValue(postData.type || '');
    sheet.getRange(row, 5).setValue(postData.subject || '');
    sheet.getRange(row, 6).setValue(postData.stream || '');
    sheet.getRange(row, 7).setValue(postData.contentType || '');
    sheet.getRange(row, 8).setValue(postData.format || '');
    sheet.getRange(row, 9).setValue(postData.comment || '');
    sheet.getRange(row, 11).setValue(Number(postData.likes) || 0);
    sheet.getRange(row, 12).setValue(Number(postData.bad) || 0);
    
    Logger.log('投稿更新完了: ID=' + postData.id);
    return 'ok';
    
  } catch (error) {
    Logger.log('updatePost error: ' + error);
    return error.message;
  }
}

/**
 * 複数投稿の一括削除
 */
function deletePostsBulk(ids) {
  if (!Array.isArray(ids)) return false;
  
  // IDの降順で処理（削除時のインデックスずれ防止）
  const sortedIds = [...ids].sort((a, b) => Number(b) - Number(a));
  for (let i = 0; i < sortedIds.length; i++) {
    deletePost(sortedIds[i]);
  }
  return true;
}

/**
 * GoogleドライブのURLからファイルIDを抽出
 */
function extractFileIdFromUrl(url) {
  if (!url) return null;
  // 例: https://drive.google.com/file/d/FILEID/view?usp=drivesdk
  const m = url.match(/\/d\/([\w-]+)/);
  if (m && m[1]) return m[1];
  // 例: https://drive.google.com/open?id=FILEID
  const m2 = url.match(/[?&]id=([\w-]+)/);
  if (m2 && m2[1]) return m2[1];
  return null;
}

/**
 * 管理者パスワード取得
 */
function getAdminPasswords() {
  return ['0611']; // GAS運用時のデフォルトパスワード
}

/**
 * 管理者認証（SHA-256ハッシュ認証）
 */
function checkAdminPassword(input) {
  try {
    // SHA-256ハッシュ計算
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
    
    // 管理者パスワードのハッシュ値と比較
    const validPasswords = getAdminPasswords();
    const validHashes = validPasswords.map(pwd => 
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pwd).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('')
    );
    
    Logger.log('=== 認証デバッグ情報 ===');
    Logger.log('入力値: "' + input + '"');
    Logger.log('入力値の長さ: ' + input.length);
    Logger.log('計算したハッシュ値: "' + hash + '"');
    Logger.log('計算したハッシュ値の長さ: ' + hash.length);
    Logger.log('有効なハッシュ値: ' + JSON.stringify(validHashes));
    Logger.log('比較結果: ' + validHashes.includes(hash));
    Logger.log('=======================');
    
    return validHashes.includes(hash) ? 'ok' : 'ng';
  } catch (error) {
    Logger.log('checkAdminPassword error: ' + error);
    return 'ng';
  }
}

/**
 * パスワードハッシュテスト用
 */
function testPasswordHash() {
  const testPassword = '0611';
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, testPassword).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  Logger.log('テストパスワード "' + testPassword + '" のハッシュ値: ' + hash);
}

/**
 * フォルダIDを取得するヘルパー関数
 * この関数を実行して、正しいフォルダIDを取得してください
 */
function getFolderId() {
  try {
    // ルートフォルダを取得
    const rootFolder = DriveApp.getRootFolder();
    Logger.log('ルートフォルダID: ' + rootFolder.getId());
    
    // ルートフォルダ内のフォルダ一覧を取得
    const folders = rootFolder.getFolders();
    Logger.log('=== 利用可能なフォルダ一覧 ===');
    while (folders.hasNext()) {
      const folder = folders.next();
      Logger.log('フォルダ名: ' + folder.getName() + ' | ID: ' + folder.getId());
    }
    Logger.log('=============================');
    
    return 'フォルダ一覧をログで確認してください';
  } catch (error) {
    Logger.log('フォルダID取得エラー: ' + error);
    return 'エラーが発生しました: ' + error.message;
  }
}

/**
 * 現在のフォルダIDをテストする関数
 */
function testCurrentFolderId() {
  try {
    Logger.log('現在のフォルダID: ' + FOLDER_ID);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('フォルダ名: ' + folder.getName());
    Logger.log('フォルダID: ' + folder.getId());
    return 'フォルダIDは有効です。フォルダ名: ' + folder.getName();
  } catch (error) {
    Logger.log('フォルダIDテストエラー: ' + error);
    return 'フォルダIDが無効です: ' + error.message;
  }
}

/**
 * GASのdoGet/doPost関数
 */
function doGet(e) {
  const { function: funcName } = e.parameter;
  
  switch (funcName) {
    case 'getData':
      return ContentService.createTextOutput(JSON.stringify(getData()))
        .setMimeType(ContentService.MimeType.JSON);
    case 'testFolderId':
      return ContentService.createTextOutput(JSON.stringify({ result: testCurrentFolderId() }))
        .setMimeType(ContentService.MimeType.JSON);
    case 'getFolderList':
      return ContentService.createTextOutput(JSON.stringify({ result: getFolderId() }))
        .setMimeType(ContentService.MimeType.JSON);
    default:
      return ContentService.createTextOutput(JSON.stringify({ error: 'Function not found' }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const { function: funcName } = e.parameter;
  
  try {
    switch (funcName) {
      case 'uploadFileAndRecord':
        const {
          grade, year, type, subject, stream, contentType, fileFormat, comment, fileSizeMB, filename
        } = e.parameter;
        
        // リクエストボディからBase64データを直接取得
        const base64 = e.postData.getDataAsString();
        
        // デバイス情報を解析
        const deviceInfo = e.parameter.deviceInfo ? JSON.parse(e.parameter.deviceInfo) : {};
        
        const url = uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB);
        return ContentService.createTextOutput(JSON.stringify({ url }))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'like':
        const likeId = e.parameter.id;
        const likeResult = like(likeId);
        return ContentService.createTextOutput(JSON.stringify(likeResult))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'unlike':
        const unlikeId = e.parameter.id;
        const unlikeResult = unlike(unlikeId);
        return ContentService.createTextOutput(JSON.stringify(unlikeResult))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'bad':
        const badId = e.parameter.id;
        const badResult = bad(badId);
        return ContentService.createTextOutput(JSON.stringify(badResult))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'unbad':
        const unbadId = e.parameter.id;
        const unbadResult = unbad(unbadId);
        return ContentService.createTextOutput(JSON.stringify(unbadResult))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'checkAdminPassword':
        const password = e.parameter.password;
        const authResult = checkAdminPassword(password);
        return ContentService.createTextOutput(JSON.stringify({ result: authResult }))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'deletePost':
        const deleteId = e.parameter.id;
        const deleteResult = deletePost(deleteId);
        return ContentService.createTextOutput(JSON.stringify({ success: deleteResult }))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'updatePost':
        const postData = JSON.parse(e.parameter.postData);
        const updateResult = updatePost(postData);
        return ContentService.createTextOutput(JSON.stringify({ result: updateResult }))
          .setMimeType(ContentService.MimeType.JSON);
        
      case 'deletePostsBulk':
        const ids = JSON.parse(e.parameter.ids);
        const bulkDeleteResult = deletePostsBulk(ids);
        return ContentService.createTextOutput(JSON.stringify({ success: bulkDeleteResult }))
          .setMimeType(ContentService.MimeType.JSON);
        
      default:
        return ContentService.createTextOutput(JSON.stringify({ error: 'Function not found' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('doPost error: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
} 