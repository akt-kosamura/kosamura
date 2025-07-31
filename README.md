# 考査村 (Kosamura)

考査村は、教育関係者が試験問題や教材を共有するためのプラットフォームです。

## 🚀 本番環境デプロイ

### 対応プラットフォーム
- **Heroku**
- **Railway**
- **Render**
- **Vercel** (Serverless Functions)
- **Google Cloud Run**
- **AWS Elastic Beanstalk**

### デプロイ手順

1. **リポジトリをGitにプッシュ**
   ```bash
   git add .
   git commit -m "本番環境対応"
   git push origin main
   ```

2. **環境変数の設定**
   各プラットフォームの管理画面で以下の環境変数を設定：
   ```
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id
   GOOGLE_SPREADSHEET_ID=14uI1FoXUWg_deV-ZGSYY85JREyLyZY4YVqpKka35sZw
   GOOGLE_SHEET_NAME=シート1
   EMAIL_USER=kosamura.akita@gmail.com
   EMAIL_PASS=your-app-password
   ADMIN_PASSWORDS=your-admin-passwords
   PORT=8080
   ```

3. **Google Cloud認証情報の設定**
   - `credentials.json` ファイルをプラットフォームにアップロード
   - または環境変数 `GOOGLE_APPLICATION_CREDENTIALS_JSON` として設定

4. **デプロイ実行**
   プラットフォームの指示に従ってデプロイを実行

### 重要な注意事項

- **HTTPS対応**: 本番環境では自動的にHTTPSが有効になります
- **CORS設定**: 本番環境のドメインに合わせてCORS設定を調整
- **ファイルサイズ制限**: 50MBまで対応
- **同時接続数**: プラットフォームの制限に注意

## 特徴

- **GAS互換性**: 既存のGASコードと同じAPIエンドポイントを提供
- **Google Drive連携**: ファイルの自動アップロードとセキュリティ設定
- **Google Sheets連携**: データの永続化と管理
- **メール通知**: 新規投稿時の自動通知機能
- **管理者機能**: パスワード認証による管理画面
- **レスポンシブデザイン**: モダンなUI/UX

## セットアップ

詳細なセットアップ手順は [SETUP.md](SETUP.md) を参照してください。

### クイックスタート

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **環境変数の設定**
   ```bash
   cp env.example .env
   # .envファイルを編集して必要な設定を行ってください
   ```

3. **Google Cloud Platform設定**
   - Google Drive API と Google Sheets API を有効化
   - サービスアカウントを作成し、credentials.json をダウンロード
   - プロジェクトルートに credentials.json を配置

4. **サーバー起動**
   ```bash
   npm run dev  # 開発モード
   # または
   npm start    # 本番モード
   ```

## 主要機能

### 1. ファイルアップロード
- 複数のファイル形式に対応（PDF, Word, Excel, 画像等）
- 自動的なファイル名生成（学年_年度_種類_科目_文理区分_内容）
- Google Driveへの自動アップロード
- セキュリティ設定（ダウンロード・印刷制限）

### 2. データ管理
- Google Sheetsでのデータ永続化
- 詳細なメタデータ記録（デバイス情報、IPアドレス等）
- いいね・バッド機能
- 検索・フィルタリング機能

### 3. 管理者機能
- パスワード認証
- 投稿の編集・削除
- 一括削除機能
- 統計情報の表示

### 4. 通知機能
- 新規投稿時のメール通知
- 詳細な投稿情報とデバイス情報を含む

## API仕様

### GAS互換エンドポイント

#### データ取得
```
GET /exec?function=getData
```

#### ファイルアップロード
```
POST /exec?function=uploadFileAndRecord
```

#### いいね機能
```
POST /exec?function=like
POST /exec?function=unlike
```

#### バッド機能
```
POST /exec?function=bad
POST /exec?function=unbad
```

#### 管理者認証
```
POST /exec?function=checkAdminPassword
```

### 通常のREST API

#### データ取得
```
GET /api/data
```

#### ファイルアップロード
```
POST /api/upload
```

#### いいね・バッド
```
POST /api/like/:id
POST /api/unlike/:id
POST /api/bad/:id
POST /api/unbad/:id
```

## ファイル構成

```
kosamura/
├── server.js              # メインサーバーファイル
├── package.json           # 依存関係定義
├── env.example           # 環境変数設定例
├── SETUP.md              # 詳細セットアップ手順
├── credentials.json      # Google Cloud認証情報（要配置）
├── .env                  # 環境変数（要作成）
├── js/
│   ├── api.js           # メインAPIクライアント
│   └── gas-api.js       # GAS互換APIクライアント
├── GAS運用時のファイル/   # 元のGASコード
├── index.html           # メインページ
├── upload.html          # アップロードページ
├── search.html          # 検索ページ
├── share.html           # 共有ページ
├── admin.html           # 管理者ページ
└── ph-index.html        # モバイル版メインページ
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `GOOGLE_DRIVE_FOLDER_ID` | Google DriveフォルダID | ○ |
| `GOOGLE_SPREADSHEET_ID` | Google SheetsスプレッドシートID | ○ |
| `GOOGLE_SHEET_NAME` | 使用するシート名 | ○ |
| `GOOGLE_APPLICATION_CREDENTIALS` | 認証情報ファイルパス | ○ |
| `EMAIL_USER` | メール送信元アドレス | ○ |
| `EMAIL_PASS` | Gmailアプリパスワード | ○ |
| `ADMIN_PASSWORDS` | 管理者パスワード（カンマ区切り） | ○ |
| `PORT` | サーバーポート | × |

## トラブルシューティング

### よくある問題

1. **Google Drive API エラー**
   - サービスアカウントの権限を確認
   - APIが有効化されているか確認
   - credentials.json ファイルが正しく配置されているか確認

2. **Google Sheets API エラー**
   - スプレッドシートIDが正しいか確認
   - サービスアカウントに編集権限が付与されているか確認

3. **メール送信エラー**
   - Gmailのアプリパスワードが正しく設定されているか確認
   - 2段階認証が有効化されているか確認

4. **ファイルアップロードエラー**
   - ファイルサイズ制限（50MB）を確認
   - フォルダIDが正しく設定されているか確認

## GAS版との違い

### 1. 認証方式
- **GAS版**: Googleアカウントでの自動認証
- **Node.js版**: サービスアカウントによる認証

### 2. エンドポイント
- **GAS版**: `/exec?function=関数名`
- **Node.js版**: `/exec?function=関数名` (互換性維持)

### 3. セキュリティ
- **GAS版**: Googleのセキュリティ機能を利用
- **Node.js版**: 独自のセキュリティ設定が必要

## 開発

### 開発モードでの起動
```bash
npm run dev
```

### 本番環境へのデプロイ
詳細は [SETUP.md](SETUP.md) の「本番環境へのデプロイ」セクションを参照してください。

## ライセンス

MIT License

## サポート

問題が発生した場合は、以下を確認してください：
1. ログファイルの確認
2. 環境変数の設定確認
3. Google Cloud ConsoleでのAPI使用量確認
4. サービスアカウントの権限確認

詳細なセットアップ手順は [SETUP.md](SETUP.md) を参照してください。
