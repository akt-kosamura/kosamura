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
    const decoded = Utilities.base64Decode(base64);
    const blob    = Utilities.newBlob(decoded, 'application/octet-stream', newFileName);
    const file    = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    
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
    } catch (apiErr) {
      Logger.log('Drive APIによるダウンロード・印刷・コピー禁止設定に失敗:' + apiErr);
    }
    
    const url = file.getUrl();

    // アップロード日を文字列で生成
    const tz            = ss.getSpreadsheetTimeZone();
    const uploadDateStr = Utilities.formatDate(new Date(), tz, 'yyyy/MM/dd HH:mm:ss');

          // --- LockServiceによる排他制御を追加 ---
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000); // 最大10秒待つ
                // デバッグ用：スプレッドシートに書き込む値をログに出力
        const rowData = [
          id,             // A列: ID
          grade,          // B列: 学年
          year,           // C列: 年度
          type,           // D列: 種類
          subject,        // E列: 科目
          stream,         // F列: 文理区分
          contentType,    // G列: 内容タイプ
          fileFormat,     // H列: ファイル形式
          comment,        // I列: コメント
          url,            // J列: URL
          uploadDateStr,  // K列: 日付
          0,              // L列: likes 初期値
          0,              // M列: bad 初期値
          (deviceInfo && deviceInfo.publicIP) || 'Unknown',      // N列: 公開IPアドレス
          (deviceInfo && deviceInfo.privateIP) || 'Unknown',     // O列: プライベートIPアドレス
          (deviceInfo && deviceInfo.userAgent) || 'Unknown',     // P列: User-Agent
          (deviceInfo && deviceInfo.platform) || 'Unknown',      // Q列: プラットフォーム
          (deviceInfo && deviceInfo.screenWidth && deviceInfo.screenHeight) ?
            `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}` : 'Unknown',  // R列: 画面解像度
          (deviceInfo && deviceInfo.windowWidth && deviceInfo.windowHeight) ?
            `${deviceInfo.windowWidth}x${deviceInfo.windowHeight}` : 'Unknown',  // S列: ウィンドウサイズ
          fileSizeMB || 0  // T列: ファイルサイズ（MB）
        ];
        
        Logger.log('スプレッドシートに書き込む値:');
        Logger.log('rowData: ' + JSON.stringify(rowData));
        
        // シートに書き込み
        sheet.appendRow(rowData);
      } finally {
        lock.releaseLock();
      }

    // メール送信
    sendNewPostNotification(id, grade, year, type, subject, stream, contentType, fileFormat, comment, url, uploadDateStr, deviceInfo, fileSizeMB);

    return url;
  } catch (error) {
    console.error('uploadFileAndRecord error:', error);
    throw error;
  }
}

/**
 * 新しい投稿の通知メールを送信
 * @param {number} id           投稿ID
 * @param {string} grade        学年
 * @param {string} year         年度
 * @param {string} type         種類
 * @param {string} subject      科目
 * @param {string} stream       文理区分
 * @param {string} contentType  内容タイプ
 * @param {string} fileFormat   ファイル形式
 * @param {string} comment      コメント
 * @param {string} url          ファイルURL
 * @param {string} uploadDate   アップロード日時
 * @param {Object} deviceInfo   デバイス情報
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
 * データ取得（検索用）
 * @return {Object[]} 各行のデータオブジェクト配列
 */
function getData() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      console.error('シートが見つかりません:', SHEET_NAME);
      return [];
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    // A〜T 列 (20 列)
    const rows = sheet.getRange(2, 1, lastRow - 1, 20).getValues();

    return rows.map((row, index) => ({
      id:      row[0] || (index + 1),  // A
      grade:   String(row[1] || ''),   // B
      year:    String(row[2] || ''),   // C
      type:    String(row[3] || ''),   // D
      subject: String(row[4] || ''),   // E
      stream:  String(row[5] || ''),   // F
      contentType: String(row[6] || ''),// G
      format:  String(row[7] || ''),   // H
      comment: String(row[8] || ''),   // I
      url:     String(row[9] || ''),   // J
      date:    String(row[10] || ''),  // K
      likes:   Number(row[11]) || 0,   // L
      bad:     Number(row[12]) || 0,   // M
      publicIP: String(row[13] || ''), // N
      privateIP: String(row[14] || ''),// O
      userAgent: String(row[15] || ''),// P
      platform: String(row[16] || ''), // Q
      screenResolution: String(row[17] || ''), // R
      windowSize: String(row[18] || ''), // S
      fileSize: Number(row[19]) || 0 // T
    }));
  } catch (error) {
    console.error('getData error:', error);
    return [];
  }
}

/** いいね増加 */
function like(id) {
  return updateCount(id, 12, +1);
}

/** いいね取り消し */
function unlike(id) {
  return updateCount(id, 12, -1);
}

/** バッド増加 */
function bad(id) {
  return updateCount(id, 13, +1);
}

/** バッド取り消し */
function unbad(id) {
  return updateCount(id, 13, -1);
}

/**
 * ID指定でカウント増減共通処理
 * @param {number|string} id
 * @param {number} colIndex  更新する列番号 (1-based)
 * @param {number} delta     増減値 (+1 or -1)
 */
function updateCount(id, colIndex, delta) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (Number(data[i][0]) === Number(id)) {
        const cell = sheet.getRange(i + 2, colIndex);
        const newVal = Math.max(0, (Number(cell.getValue()) || 0) + delta);
        cell.setValue(newVal);
        SpreadsheetApp.flush();
        return newVal;
      }
    }
    throw new Error('ID が見つかりません: ' + id);
  } catch (error) {
    console.error('updateCount error:', error);
    throw error;
  }
}

/**
 * 投稿削除（ファイルも削除）
 * @param {number|string} id
 */
function deletePost(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;
    const data = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      // ファイル削除
      const url = data[i][9];
      const fileId = extractFileIdFromUrl(url);
      if (fileId) {
        try {
          const file = DriveApp.getFileById(fileId);
          file.setTrashed(true); // 完全削除したい場合は file.setTrashed(true)
        } catch (e) {
          Logger.log('ファイル削除失敗: ' + fileId + ' ' + e);
        }
      }
      // シートの行削除
      sheet.deleteRow(i + 2); // 2行目がデータの先頭
      return true;
    }
  }
  return false;
}

/**
 * 投稿更新
 * @param {Object} postData 更新する投稿データ
 * @return {string} 結果 ('ok' または エラーメッセージ)
 */
function updatePost(postData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      throw new Error('データが見つかりません');
    }
    
    // IDで該当行を検索
    const data = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
    let targetRow = -1;
    
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(postData.id)) {
        targetRow = i + 2; // シートの行番号（ヘッダー行を考慮）
        break;
      }
    }
    
    if (targetRow === -1) {
      throw new Error('指定されたIDの投稿が見つかりません: ' + postData.id);
    }
    
    // LockServiceによる排他制御
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // 最大10秒待つ
      
      // 各フィールドを更新（IDは変更しない）
      // B列: 学年
      sheet.getRange(targetRow, 2).setValue(postData.grade || '');
      // C列: 年度
      sheet.getRange(targetRow, 3).setValue(postData.year || '');
      // D列: 種類
      sheet.getRange(targetRow, 4).setValue(postData.type || '');
      // E列: 科目
      sheet.getRange(targetRow, 5).setValue(postData.subject || '');
      // F列: 文理区分
      sheet.getRange(targetRow, 6).setValue(postData.stream || '');
      // G列: 内容タイプ
      sheet.getRange(targetRow, 7).setValue(postData.contentType || '');
      // H列: ファイル形式
      sheet.getRange(targetRow, 8).setValue(postData.format || '');
      // I列: コメント
      sheet.getRange(targetRow, 9).setValue(postData.comment || '');
      // J列: URL（変更不可のため既存値を保持）
      // K列: 日付（変更不可のため既存値を保持）
      // L列: likes
      sheet.getRange(targetRow, 12).setValue(Number(postData.likes) || 0);
      // M列: bad
      sheet.getRange(targetRow, 13).setValue(Number(postData.bad) || 0);
      // T列: ファイルサイズ（読み取り専用のため既存値を保持）
      
      // 変更を確定
      SpreadsheetApp.flush();
      
      Logger.log('投稿更新完了: ID=' + postData.id);
      return 'ok';
      
    } finally {
      lock.releaseLock();
    }
    
  } catch (error) {
    console.error('updatePost error:', error);
    Logger.log('投稿更新エラー: ' + error.message);
    return error.message;
  }
}

/**
 * 複数投稿の一括削除（ファイルも削除）
 * @param {string[]} ids
 */
function deletePostsBulk(ids) {
  if (!Array.isArray(ids)) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  // IDの降順で処理（行削除時のインデックスずれ防止）
  const sortedIds = [...ids].sort((a, b) => Number(b) - Number(a));
  for (let i = 0; i < sortedIds.length; i++) {
    deletePost(sortedIds[i]);
  }
  return true;
}

/**
 * GoogleドライブのURLからファイルIDを抽出
 * @param {string} url
 * @return {string|null}
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
 * シート2のA1〜A3のいずれかのセルの値をパスワードとして返す
 * @return {string[]} パスワード配列
 */
function getAdminPasswords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート2');
  if (!sheet) throw new Error('シート2が見つかりません');
  const values = sheet.getRange(1, 1, 3, 1).getValues();
  return values.map(row => String(row[0])).filter(v => v);
}

/**
 * 入力値がシート2のA1〜A3のいずれかの値と一致すればtrue
 * @param {string} input
 * @return {boolean}
 */
function checkAdminPassword(input) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート2');
  if (!sheet) {
    Logger.log('シート2が見つかりません');
    return 'ng';
  }
  const hashInSheet = String(sheet.getRange(1, 1).getValue()).trim();
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8)
    .map(function(b){return ('0'+(b&0xFF).toString(16)).slice(-2)}).join('');
  
  Logger.log('=== 認証デバッグ情報 ===');
  Logger.log('入力値: "' + input + '"');
  Logger.log('入力値の長さ: ' + input.length);
  Logger.log('シートのハッシュ値: "' + hashInSheet + '"');
  Logger.log('シートのハッシュ値の長さ: ' + hashInSheet.length);
  Logger.log('計算したハッシュ値: "' + hash + '"');
  Logger.log('計算したハッシュ値の長さ: ' + hash.length);
  Logger.log('比較結果: ' + (hashInSheet === hash));
  Logger.log('シートの値が空か: ' + (hashInSheet === ''));
  Logger.log('=======================');
  
  return hashInSheet === hash ? 'ok' : 'ng';
}

function testPasswordHash() {
  const password = "Password Input";
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8)
    .map(function(b){return ('0'+(b&0xFF).toString(16)).slice(-2)}).join('');
  Logger.log('パスワード "' + password + '" のハッシュ値: ' + hash);
  return hash;
}

/**
 * Web アプリ振り分け
 */
function doGet(e) {
  const page = e.parameter.page;
  const validPages = [ 'index', 'upload', 'search',  'share', 'ph-index', 'admin', ];
  const fileName = validPages.includes(page) ? page : 'index';

  // 管理画面も通常のHTMLテンプレートとして返す（Googleログイン強制なし）
  if (fileName === 'admin') {
    const template = HtmlService.createTemplateFromFile(fileName + '.html');
    template.logoutUrl = 'https://accounts.google.com/Logout';
    return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService
    .createHtmlOutputFromFile(fileName + '.html')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}