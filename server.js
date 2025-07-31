const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Google Drive API設定
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1xx-N4rKwFTk83iIxSOCEhctJQv-3rZrC';
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ファイルアップロード設定（一時保存用）
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB制限
});

// データストア（本番環境ではMongoDB等を使用）
let posts = [];
let nextId = 1;

// メール送信設定
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'kosamura.akita@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// 管理者パスワード（本番環境では環境変数から取得）
const ADMIN_PASSWORDS = ['admin123', 'password123', 'secure456'];

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

    // 共有設定：閲覧のみ許可
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    return {
      fileId: file.data.id,
      url: file.data.webViewLink
    };
  } catch (error) {
    console.error('Google Driveアップロードエラー:', error);
    throw error;
  }
}

// API エンドポイント

// データ取得
app.get('/api/data', (req, res) => {
  res.json(posts);
});

// ファイルアップロード
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const {
      grade, year, type, subject, stream, contentType, fileFormat, comment, fileSizeMB
    } = req.body;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }

    // デバイス情報を解析
    const deviceInfo = req.body.deviceInfo ? JSON.parse(req.body.deviceInfo) : {};

    // 新しいファイル名を作成
    const extension = path.extname(file.originalname);
    const newFileName = `${grade}_${year}_${type}_${subject}_${stream}_${contentType}${extension}`;

    // Google Driveにアップロード
    const driveResult = await uploadToGoogleDrive(
      file.buffer,
      newFileName,
      file.mimetype
    );

    const uploadDate = new Date().toLocaleString('ja-JP');

    const post = {
      id: nextId++,
      grade,
      year,
      type,
      subject,
      stream,
      contentType,
      format: fileFormat,
      comment,
      url: driveResult.url,
      date: uploadDate,
      likes: 0,
      bad: 0,
      publicIP: deviceInfo.publicIP || req.ip,
      privateIP: deviceInfo.privateIP || req.ip,
      userAgent: deviceInfo.userAgent || req.get('User-Agent'),
      platform: deviceInfo.platform || req.get('User-Agent'),
      screenResolution: deviceInfo.screenResolution || 'Unknown',
      windowSize: deviceInfo.windowSize || 'Unknown',
      fileSize: parseFloat(fileSizeMB) || 0
    };

    posts.push(post);

    // メール通知
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'kosamura.akita@gmail.com',
        to: 'kosamura.akita@gmail.com',
        subject: `【考査村】新しい投稿が追加されました (ID: ${post.id})`,
        text: `
新しい投稿が考査村に追加されました。

【投稿詳細】
ID: ${post.id}
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
ファイルURL: ${driveResult.url}

【デバイス情報】
公開IPアドレス: ${deviceInfo.publicIP || req.ip}
プライベートIPアドレス: ${deviceInfo.privateIP || req.ip}
User-Agent: ${deviceInfo.userAgent || req.get('User-Agent')}
プラットフォーム: ${deviceInfo.platform || req.get('User-Agent')}
画面解像度: ${deviceInfo.screenResolution || 'Unknown'}
ウィンドウサイズ: ${deviceInfo.windowSize || 'Unknown'}

---
このメールは考査村の自動通知システムから送信されています。
        `
      });
    } catch (emailError) {
      console.error('メール送信エラー:', emailError);
    }

    res.json({ url: driveResult.url, id: post.id });
  } catch (error) {
    console.error('アップロードエラー:', error);
    res.status(500).json({ error: 'アップロードに失敗しました' });
  }
});

// いいね増加
app.post('/api/like/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.likes++;
    res.json({ likes: post.likes });
  } else {
    res.status(404).json({ error: '投稿が見つかりません' });
  }
});

// いいね取り消し
app.post('/api/unlike/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.likes = Math.max(0, post.likes - 1);
    res.json({ likes: post.likes });
  } else {
    res.status(404).json({ error: '投稿が見つかりません' });
  }
});

// バッド増加
app.post('/api/bad/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.bad++;
    res.json({ bad: post.bad });
  } else {
    res.status(404).json({ error: '投稿が見つかりません' });
  }
});

// バッド取り消し
app.post('/api/unbad/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.bad = Math.max(0, post.bad - 1);
    res.json({ bad: post.bad });
  } else {
    res.status(404).json({ error: '投稿が見つかりません' });
  }
});

// 投稿削除
app.delete('/api/post/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === id);
  if (postIndex !== -1) {
    const post = posts[postIndex];
    
    // Google Driveからファイル削除
    try {
      const fileId = extractFileIdFromUrl(post.url);
      if (fileId) {
        await drive.files.delete({ fileId });
      }
    } catch (error) {
      console.error('Google Driveファイル削除エラー:', error);
    }
    
    posts.splice(postIndex, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '投稿が見つかりません' });
  }
});

// 管理者認証
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  const isValid = ADMIN_PASSWORDS.includes(password);
  if (isValid) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: '認証に失敗しました' });
  }
});

// 管理者用データ取得
app.get('/api/admin/data', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'トークンが必要です' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    res.json(posts);
  } catch (error) {
    res.status(401).json({ error: '無効なトークンです' });
  }
});

// 投稿更新
app.put('/api/admin/post/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'トークンが必要です' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const id = parseInt(req.params.id);
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex !== -1) {
      const updatedPost = { ...posts[postIndex], ...req.body };
      posts[postIndex] = updatedPost;
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '投稿が見つかりません' });
    }
  } catch (error) {
    res.status(401).json({ error: '無効なトークンです' });
  }
});

// 複数投稿削除
app.delete('/api/admin/posts', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'トークンが必要です' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const { ids } = req.body;
    
    if (Array.isArray(ids)) {
      for (const id of ids) {
        const postIndex = posts.findIndex(p => p.id === parseInt(id));
        if (postIndex !== -1) {
          const post = posts[postIndex];
          
          // Google Driveからファイル削除
          try {
            const fileId = extractFileIdFromUrl(post.url);
            if (fileId) {
              await drive.files.delete({ fileId });
            }
          } catch (error) {
            console.error('Google Driveファイル削除エラー:', error);
          }
          
          posts.splice(postIndex, 1);
        }
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: '無効なリクエストです' });
    }
  } catch (error) {
    res.status(401).json({ error: '無効なトークンです' });
  }
});

// Google DriveのURLからファイルIDを抽出
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

// 静的ファイル配信
app.use('/uploads', express.static('uploads'));

// フロントエンドファイル配信
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
}); 