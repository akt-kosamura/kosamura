# 考査村 Node.js版 セットアップ手順

## 概要
このプロジェクトは、Google Apps Script (GAS) で動作していた「考査村」を Node.js で再実装したものです。GAS運用時と同じ動作を実現します。

## 前提条件
- Node.js (v14以上)
- npm または yarn
- Google Cloud Platform アカウント
- Google Drive API と Google Sheets API の有効化

## セットアップ手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. Google Cloud Platform での設定

#### 2.1 プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクトIDをメモ

#### 2.2 APIの有効化
以下のAPIを有効化してください：
- Google Drive API
- Google Sheets API
- Gmail API

#### 2.3 サービスアカウントの作成
1. 「IAM と管理」→「サービスアカウント」に移動
2. 「サービスアカウントを作成」をクリック
3. 名前を入力（例：kosamura-api）
4. 「キーを作成」→「JSON」を選択
5. ダウンロードしたJSONファイルを `credentials.json` としてプロジェクトルートに配置

### 3. 環境変数の設定

#### 3.1 .env ファイルの作成
プロジェクトルートに `.env` ファイルを作成し、以下の内容を設定：

```env
# Google Drive API設定
GOOGLE_DRIVE_FOLDER_ID=1xx-N4rKwFTk83iIxSOCEhctJQv-3rZrC
GOOGLE_SPREADSHEET_ID=14uI1FoXUWg_deV-ZGSYY85JREyLyZY4YVqpKka35sZw
GOOGLE_SHEET_NAME=シート1
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# メール設定
EMAIL_USER=kosamura.akita@gmail.com
EMAIL_PASS=your-app-password

# 管理者パスワード（カンマ区切りで複数設定可能）
ADMIN_PASSWORDS=admin123,password123,secure456

# サーバー設定
PORT=3000
```

#### 3.2 設定値の説明
- `GOOGLE_DRIVE_FOLDER_ID`: ファイルアップロード先のGoogle DriveフォルダID
- `GOOGLE_SPREADSHEET_ID`: データ保存用のGoogle SheetsのID
- `GOOGLE_SHEET_NAME`: 使用するシート名（通常は「シート1」）
- `EMAIL_USER`: 通知メール送信元のGmailアドレス
- `EMAIL_PASS`: Gmailのアプリパスワード（2段階認証が必要）
- `ADMIN_PASSWORDS`: 管理者パスワード（カンマ区切りで複数設定可能）

### 4. Google Drive フォルダの設定

#### 4.1 フォルダの作成
1. Google Driveで新しいフォルダを作成
2. フォルダの共有設定で「リンクを知っている全員」に「閲覧者」権限を付与
3. フォルダIDをコピー（URLの `/folders/` の後の文字列）

#### 4.2 サービスアカウントへの権限付与
1. 作成したフォルダを右クリック
2. 「共有」→「詳細設定」
3. サービスアカウントのメールアドレスを追加（編集者権限）

### 5. Google Sheets の設定

#### 5.1 スプレッドシートの作成
1. Google Sheetsで新しいスプレッドシートを作成
2. 最初のシート名を「シート1」に変更
3. 以下のヘッダー行を追加：

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ID | 学年 | 年度 | 種類 | 科目 | 文理区分 | 内容タイプ | ファイル形式 | コメント | URL | 日付 | likes | bad | 公開IP | プライベートIP | User-Agent | プラットフォーム | 画面解像度 | ウィンドウサイズ | ファイルサイズ |

#### 5.2 サービスアカウントへの権限付与
1. スプレッドシートを右クリック
2. 「共有」→「詳細設定」
3. サービスアカウントのメールアドレスを追加（編集者権限）

### 6. Gmail アプリパスワードの設定

#### 6.1 2段階認証の有効化
1. Google アカウントの設定に移動
2. 「セキュリティ」→「2段階認証プロセス」を有効化

#### 6.2 アプリパスワードの生成
1. 「アプリパスワード」を選択
2. 「アプリを選択」→「その他（カスタム名）」を選択
3. 名前を入力（例：考査村API）
4. 生成されたパスワードを `.env` ファイルの `EMAIL_PASS` に設定

### 7. サーバーの起動

#### 7.1 開発モード
```bash
npm run dev
```

#### 7.2 本番モード
```bash
npm start
```

### 8. 動作確認

#### 8.1 基本動作確認
1. ブラウザで `http://localhost:3000` にアクセス
2. 各ページ（upload, search, share, admin）が正常に表示されることを確認

#### 8.2 API動作確認
1. `http://localhost:3000/exec?function=getData` にアクセス
2. JSONデータが正常に返されることを確認

## トラブルシューティング

### よくある問題

#### 1. Google Drive API エラー
- サービスアカウントの権限を確認
- APIが有効化されているか確認
- credentials.json ファイルが正しく配置されているか確認

#### 2. Google Sheets API エラー
- スプレッドシートIDが正しいか確認
- サービスアカウントに編集権限が付与されているか確認

#### 3. メール送信エラー
- Gmailのアプリパスワードが正しく設定されているか確認
- 2段階認証が有効化されているか確認

#### 4. ファイルアップロードエラー
- ファイルサイズ制限（50MB）を確認
- フォルダIDが正しく設定されているか確認

## GAS版との違い

### 1. 認証方式
- GAS版: Googleアカウントでの自動認証
- Node.js版: サービスアカウントによる認証

### 2. エンドポイント
- GAS版: `/exec?function=関数名`
- Node.js版: `/exec?function=関数名` (互換性維持)

### 3. セキュリティ
- GAS版: Googleのセキュリティ機能を利用
- Node.js版: 独自のセキュリティ設定が必要

## 本番環境へのデプロイ

### Heroku でのデプロイ例
1. Heroku CLI をインストール
2. プロジェクトをGitリポジトリに初期化
3. Herokuアプリを作成
4. 環境変数を設定
5. デプロイ

```bash
heroku create kosamura-api
heroku config:set GOOGLE_DRIVE_FOLDER_ID=your-folder-id
heroku config:set GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
# その他の環境変数も同様に設定
git push heroku main
```

## サポート

問題が発生した場合は、以下を確認してください：
1. ログファイルの確認
2. 環境変数の設定確認
3. Google Cloud ConsoleでのAPI使用量確認
4. サービスアカウントの権限確認 