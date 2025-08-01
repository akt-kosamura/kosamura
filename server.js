const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Google Drive API設定
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1xx-N4rKwFTk83iIxSOCEhctJQv-3rZrC';
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '14uI1FoXUWg_deV-ZGSYY85JREyLyZY4YVqpKka35sZw';
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ]
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // ルートディレクトリを静的ファイルとして提供

// ファイルアップロード設定（一時保存用）
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB制限
});

// データストア（Google Sheetsから読み込み）
let posts = [];
let nextId = 1;

// Google Sheetsからデータを読み込み
async function loadDataFromSheets() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:T`
    });

    const rows = response.data.values || [];
    posts = rows.map((row, index) => ({
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

    // 最大IDを設定
    if (posts.length > 0) {
      nextId = Math.max(...posts.map(p => p.id)) + 1;
    }

    console.log(`${posts.length}件のデータをGoogle Sheetsから読み込みました`);
  } catch (error) {
    console.error('Google Sheetsからのデータ読み込みエラー:', error);
    // エラーの場合は空の配列で開始
    posts = [];
    nextId = 1;
  }
}

// Google Sheetsにデータを書き込み
async function saveDataToSheets() {
  try {
    const values = posts.map(post => [
      post.id,
      post.grade,
      post.year,
      post.type,
      post.subject,
      post.stream,
      post.contentType,
      post.format,
      post.comment,
      post.url,
      post.date,
      post.likes,
      post.bad,
      post.publicIP,
      post.privateIP,
      post.userAgent,
      post.platform,
      post.screenResolution,
      post.windowSize,
      post.fileSize
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:T${posts.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });

    console.log('データをGoogle Sheetsに保存しました');
  } catch (error) {
    console.error('Google Sheetsへのデータ保存エラー:', error);
  }
}

// サーバー起動時にデータを読み込み
loadDataFromSheets();

// メール送信設定
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'kosamura.akita@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// 管理者パスワード（環境変数から取得、カンマ区切りで複数設定可能）
const ADMIN_PASSWORDS = process.env.ADMIN_PASSWORDS ? 
  process.env.ADMIN_PASSWORDS.split(',').map(p => p.trim()) : 
  ['0611']; // GAS運用時のデフォルトパスワード

// Google Driveにファイルをアップロード
async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID]
    };

    const media = {
      mimeType: mimeType,
      body: require('stream').Readable.from(fileBuffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });

    // 共有設定：閲覧のみ許可（GAS運用時と同じ）
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // セキュリティ設定（GAS運用時と同じ）
    try {
      await drive.files.update({
        fileId: file.data.id,
        requestBody: {
          viewersCanCopyContent: false,
          copyRequiresWriterPermission: true
        }
      });
    } catch (securityError) {
      console.log('セキュリティ設定の適用に失敗しました:', securityError);
    }

    return {
      fileId: file.data.id,
      url: file.data.webViewLink
    };
  } catch (error) {
    console.error('Google Driveアップロードエラー:', error);
    throw error;
  }
}

// GAS運用時と同じ関数群

/**
 * ファイルアップロード＆メタ情報記録（GAS運用時と同じ）
 */
async function uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, filename, base64, deviceInfo, fileSizeMB) {
  try {
    // デバッグ用：受け取った値をログに出力
    console.log('uploadFileAndRecord 受け取った値:');
    console.log('grade: ' + grade);
    console.log('year: ' + year);
    console.log('type: ' + type);
    console.log('subject: ' + subject);
    console.log('stream: ' + stream);
    console.log('contentType: ' + contentType);
    console.log('fileFormat: ' + fileFormat);
    console.log('comment: ' + comment);
    console.log('filename: ' + filename);
    console.log('fileSizeMB: ' + fileSizeMB);

    // 新規ID（A列の最大値+1で一意に）
    let maxId = 0;
    posts.forEach(post => {
      if (post.id > maxId) maxId = post.id;
    });
    const id = maxId + 1;

    // 新しいファイル名を作成: 学年_年度_種類_科目_文理区分_内容
    const extension = filename && filename.split('.').pop() ? filename.split('.').pop() : 'pdf';
    const newFileName = `${grade}_${year}_${type}_${subject}_${stream}_${contentType}.${extension}`;

    // ファイル保存
    if (!base64) {
      throw new Error('base64データが提供されていません');
    }
    
    // Base64をバッファに変換
    const decoded = Buffer.from(base64, 'base64');
    
    // Google Driveにアップロード
    const driveResult = await uploadToGoogleDrive(decoded, newFileName, 'application/octet-stream');
    const url = driveResult.url;

    // アップロード日を文字列で生成
    const uploadDateStr = new Date().toLocaleString('ja-JP');

    // データを追加
    const post = {
      id,
      grade,
      year,
      type,
      subject,
      stream,
      contentType,
      format: fileFormat,
      comment,
      url,
      date: uploadDateStr,
      likes: 0,
      bad: 0,
      publicIP: (deviceInfo && deviceInfo.publicIP) || 'Unknown',
      privateIP: (deviceInfo && deviceInfo.privateIP) || 'Unknown',
      userAgent: (deviceInfo && deviceInfo.userAgent) || 'Unknown',
      platform: (deviceInfo && deviceInfo.platform) || 'Unknown',
      screenResolution: (deviceInfo && deviceInfo.screenWidth && deviceInfo.screenHeight) ?
        `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}` : 'Unknown',
      windowSize: (deviceInfo && deviceInfo.windowWidth && deviceInfo.windowHeight) ?
        `${deviceInfo.windowWidth}x${deviceInfo.windowHeight}` : 'Unknown',
      fileSize: fileSizeMB || 0
    };

    posts.push(post);

    // Google Sheetsに保存
    await saveDataToSheets();

    // メール送信
    await sendNewPostNotification(id, grade, year, type, subject, stream, contentType, fileFormat, comment, url, uploadDateStr, deviceInfo, fileSizeMB);

    return url;
  } catch (error) {
    console.error('uploadFileAndRecord error:', error);
    throw error;
  }
}

/**
 * 新しい投稿の通知メールを送信（GAS運用時と同じ）
 */
async function sendNewPostNotification(id, grade, year, type, subject, stream, contentType, fileFormat, comment, url, uploadDate, deviceInfo, fileSizeMB) {
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
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'kosamura.akita@gmail.com',
      to: 'kosamura.akita@gmail.com',
      subject: subjectLine,
      text: body
    });
    
    console.log('新規投稿通知メールを送信しました: ID=' + id);
    
  } catch (error) {
    console.log('メール送信に失敗しました: ' + error.message);
    // メール送信が失敗してもアップロード処理は続行
  }
}

/**
 * データ取得（GAS運用時と同じ）
 */
function getData() {
  try {
    return posts.map((post, index) => ({
      id: post.id || (index + 1),
      grade: String(post.grade || ''),
      year: String(post.year || ''),
      type: String(post.type || ''),
      subject: String(post.subject || ''),
      stream: String(post.stream || ''),
      contentType: String(post.contentType || ''),
      format: String(post.format || ''),
      comment: String(post.comment || ''),
      url: String(post.url || ''),
      date: String(post.date || ''),
      likes: Number(post.likes) || 0,
      bad: Number(post.bad) || 0,
      publicIP: String(post.publicIP || ''),
      privateIP: String(post.privateIP || ''),
      userAgent: String(post.userAgent || ''),
      platform: String(post.platform || ''),
      screenResolution: String(post.screenResolution || ''),
      windowSize: String(post.windowSize || ''),
      fileSize: Number(post.fileSize) || 0
    }));
  } catch (error) {
    console.error('getData error:', error);
    return [];
  }
}

/**
 * いいね増加（GAS運用時と同じ）
 */
async function like(id) {
  return updateCount(id, 'likes', +1);
}

/**
 * いいね取り消し（GAS運用時と同じ）
 */
async function unlike(id) {
  return updateCount(id, 'likes', -1);
}

/**
 * バッド増加（GAS運用時と同じ）
 */
async function bad(id) {
  return updateCount(id, 'bad', +1);
}

/**
 * バッド取り消し（GAS運用時と同じ）
 */
async function unbad(id) {
  return updateCount(id, 'bad', -1);
}

/**
 * ID指定でカウント増減共通処理（GAS運用時と同じ）
 */
async function updateCount(id, field, delta) {
  try {
    const post = posts.find(p => Number(p.id) === Number(id));
    if (post) {
      post[field] = Math.max(0, (Number(post[field]) || 0) + delta);
      await saveDataToSheets();
      return post[field];
    }
    throw new Error('ID が見つかりません: ' + id);
  } catch (error) {
    console.error('updateCount error:', error);
    throw error;
  }
}

/**
 * 投稿削除（GAS運用時と同じ）
 */
async function deletePost(id) {
  const postIndex = posts.findIndex(p => String(p.id) === String(id));
  if (postIndex !== -1) {
    const post = posts[postIndex];
    
    // ファイル削除
    const fileId = extractFileIdFromUrl(post.url);
    if (fileId) {
      try {
        await drive.files.delete({ fileId });
      } catch (e) {
        console.log('ファイル削除失敗: ' + fileId + ' ' + e);
      }
    }
    
    // データから削除
    posts.splice(postIndex, 1);
    await saveDataToSheets();
    return true;
  }
  return false;
}

/**
 * 投稿更新（GAS運用時と同じ）
 */
async function updatePost(postData) {
  try {
    const postIndex = posts.findIndex(p => String(p.id) === String(postData.id));
    
    if (postIndex === -1) {
      throw new Error('指定されたIDの投稿が見つかりません: ' + postData.id);
    }
    
    // 各フィールドを更新（IDは変更しない）
    const post = posts[postIndex];
    post.grade = postData.grade || '';
    post.year = postData.year || '';
    post.type = postData.type || '';
    post.subject = postData.subject || '';
    post.stream = postData.stream || '';
    post.contentType = postData.contentType || '';
    post.format = postData.format || '';
    post.comment = postData.comment || '';
    post.likes = Number(postData.likes) || 0;
    post.bad = Number(postData.bad) || 0;
    
    await saveDataToSheets();
    
    console.log('投稿更新完了: ID=' + postData.id);
    return 'ok';
    
  } catch (error) {
    console.error('updatePost error:', error);
    return error.message;
  }
}

/**
 * 複数投稿の一括削除（GAS運用時と同じ）
 */
async function deletePostsBulk(ids) {
  if (!Array.isArray(ids)) return false;
  
  // IDの降順で処理（削除時のインデックスずれ防止）
  const sortedIds = [...ids].sort((a, b) => Number(b) - Number(a));
  for (let i = 0; i < sortedIds.length; i++) {
    await deletePost(sortedIds[i]);
  }
  return true;
}

/**
 * 管理者認証（GAS運用時と同じSHA-256ハッシュ認証）
 */
function checkAdminPassword(input) {
  try {
    // SHA-256ハッシュ計算
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    
    // 管理者パスワードのハッシュ値と比較
    const validHashes = ADMIN_PASSWORDS.map(pwd => 
      crypto.createHash('sha256').update(pwd).digest('hex')
    );
    
    console.log('=== 認証デバッグ情報 ===');
    console.log('入力値: "' + input + '"');
    console.log('入力値の長さ: ' + input.length);
    console.log('計算したハッシュ値: "' + hash + '"');
    console.log('計算したハッシュ値の長さ: ' + hash.length);
    console.log('有効なハッシュ値: ' + JSON.stringify(validHashes));
    console.log('比較結果: ' + validHashes.includes(hash));
    console.log('=======================');
    
    return validHashes.includes(hash) ? 'ok' : 'ng';
  } catch (error) {
    console.error('checkAdminPassword error:', error);
    return 'ng';
  }
}

/**
 * GoogleドライブのURLからファイルIDを抽出（GAS運用時と同じ）
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

// GAS互換エンドポイント（doGet/doPostパターン）
app.get('/exec', (req, res) => {
  const { function: funcName } = req.query;
  
  switch (funcName) {
    case 'getData':
      res.json(getData());
      break;
    default:
      res.status(404).json({ error: 'Function not found' });
  }
});

// GAS互換のPOSTエンドポイント
app.post('/exec', upload.single('file'), async (req, res) => {
  const { function: funcName } = req.query;
  
  try {
    switch (funcName) {
      case 'uploadFileAndRecord':
        const {
          grade, year, type, subject, stream, contentType, fileFormat, comment, fileSizeMB
        } = req.body;

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        // デバイス情報を解析
        const deviceInfo = req.body.deviceInfo ? JSON.parse(req.body.deviceInfo) : {};

        // Base64エンコード
        const base64 = file.buffer.toString('base64');

        const url = await uploadFileAndRecord(grade, year, type, subject, stream, contentType, fileFormat, comment, file.originalname, base64, deviceInfo, fileSizeMB);
        res.json({ url });
        break;

      case 'like':
        const likeId = req.body.id;
        const likeResult = await like(likeId);
        res.json(likeResult);
        break;

      case 'unlike':
        const unlikeId = req.body.id;
        const unlikeResult = await unlike(unlikeId);
        res.json(unlikeResult);
        break;

      case 'bad':
        const badId = req.body.id;
        const badResult = await bad(badId);
        res.json(badResult);
        break;

      case 'unbad':
        const unbadId = req.body.id;
        const unbadResult = await unbad(unbadId);
        res.json(unbadResult);
        break;

      case 'checkAdminPassword':
        const password = req.body.password;
        const authResult = checkAdminPassword(password);
        res.json({ result: authResult });
        break;

      case 'deletePost':
        const deleteId = req.body.id;
        const deleteResult = await deletePost(deleteId);
        res.json({ success: deleteResult });
        break;

      case 'updatePost':
        const postData = JSON.parse(req.body.postData);
        const updateResult = await updatePost(postData);
        res.json({ result: updateResult });
        break;

      case 'deletePostsBulk':
        const ids = JSON.parse(req.body.ids);
        const bulkDeleteResult = await deletePostsBulk(ids);
        res.json({ success: bulkDeleteResult });
        break;

      default:
        res.status(404).json({ error: 'Function not found' });
    }
  } catch (error) {
    console.error('GAS互換エンドポイントエラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// 静的ファイル配信
app.use('/uploads', express.static('uploads'));

// HTMLファイルの配信
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

app.get('/search.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/share.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'share.html'));
});

app.get('/ph-index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'ph-index.html'));
});

// フロントエンドファイル配信（デフォルト）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
}); 