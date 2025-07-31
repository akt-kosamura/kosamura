# 考査村 (Kosamura)

秋高秋高考査村のWebアプリケーションです。以前はGoogle Apps Script (GAS) で運用していましたが、フロントエンドをGitに移行しました。

## 🔄 GAS運用時との互換性

### ✅ 完全互換機能
- **ファイルアップロード**: 同じパラメータ構造とGoogle Drive保存
- **データ管理**: Google Sheetsとの完全連携
- **管理者機能**: 同じパスワード認証システム
- **いいね・バッド機能**: 同じ動作とデータ構造
- **検索・フィルタ機能**: 同じUIと動作
- **デバイス情報表示**: 同じフィールドと表示形式

### 🔧 変更点
- **バックエンド**: GAS → Express.js
- **認証**: Googleアカウント → JWT + パスワード
- **ファイル保存**: Google Drive（変更なし）
- **データ保存**: Google Sheets（変更なし）

## 🚀 セットアップ手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env` ファイルを作成し、以下の設定を追加してください：

```env
# サーバー設定
PORT=3000

# Google Drive API設定
GOOGLE_DRIVE_FOLDER_ID=1xx-N4rKwFTk83iIxSOCEhctJQv-3rZrC
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Google Sheets設定
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_NAME=シート1

# メール設定
EMAIL_USER=kosamura.akita@gmail.com
EMAIL_PASS=your-app-password

# JWT設定
JWT_SECRET=your-secret-key

# 管理者パスワード（複数設定可能、カンマ区切り）
ADMIN_PASSWORDS=admin123,password123,secure456
```

### 3. Google Cloud Console設定
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Google Drive APIを有効化
3. Google Sheets APIを有効化
4. サービスアカウントを作成
5. 認証情報（JSON）をダウンロードし、`credentials.json` として保存
6. Google Driveのフォルダにサービスアカウントのメールアドレスを共有設定で追加
7. Google Sheetsにサービスアカウントのメールアドレスを共有設定で追加

### 4. サーバーの起動
```bash
# 開発モード
npm run dev

# 本番モード
npm start
```

## 📁 ファイル構成

```
kosamura/
├── js/
│   ├── api.js          # APIクライアントライブラリ（GAS互換）
│   └── code.gs.js      # 元のGASコード（参考用）
├── server.js           # Express.jsサーバー
├── package.json        # 依存関係
├── .env               # 環境変数（要作成）
├── credentials.json   # Google API認証情報（要作成）
├── GAS運用時のファイル/  # 元のファイル（参考用）
└── HTMLファイル群
    ├── index.html      # ホームページ
    ├── upload.html     # アップロードページ
    ├── search.html     # 検索ページ
    ├── admin.html      # 管理ページ
    └── ...
```

## 🔄 移行の主な変更点

### 1. バックエンド
- **GAS → Express.js**: Google Apps ScriptからNode.js/Express.jsに変更
- **Google Drive API**: ファイル保存をGoogle Driveに統合（変更なし）
- **Google Sheets API**: データ管理をGoogle Sheetsに統合（変更なし）
- **認証システム**: Googleアカウント認証からJWT + パスワード認証に変更

### 2. フロントエンド
- **API互換性レイヤー**: `google.script.run` の呼び出しを維持
- **ファイルアップロード**: Base64エンコードからFormDataに変更（内部処理のみ）
- **エラーハンドリング**: より詳細なエラー処理を追加

### 3. データストア
- **Google Sheets**: 元のスプレッドシートを継続使用
- **リアルタイム同期**: サーバー起動時にデータ読み込み、変更時に自動保存

## ⚠️ 注意点

### 1. データの永続化
- Google Sheetsを使用しているため、データは永続化されます
- サーバー再起動時もデータは失われません

### 2. セキュリティ
- 管理者パスワードは環境変数で管理
- JWTシークレットキーは強力なものを使用
- Google Drive APIの認証情報は適切に管理

### 3. ファイルサイズ制限
- 現在50MBまで対応
- 必要に応じて調整可能

## 🐛 トラブルシューティング

### 1. Google Drive APIエラー
```
Google Driveアップロードエラー: [Error]
```
- 認証情報ファイルが正しく設定されているか確認
- Google Drive APIが有効化されているか確認
- フォルダの共有設定を確認

### 2. Google Sheets APIエラー
```
Google Sheetsからのデータ読み込みエラー: [Error]
```
- Google Sheets APIが有効化されているか確認
- スプレッドシートの共有設定を確認
- スプレッドシートIDが正しいか確認

### 3. メール送信エラー
```
メール送信エラー: [Error]
```
- Gmailのアプリパスワードが正しく設定されているか確認
- 2段階認証が有効化されているか確認

### 4. 管理者認証エラー
```
認証に失敗しました
```
- 環境変数のADMIN_PASSWORDSが正しく設定されているか確認
- パスワードがカンマ区切りで設定されているか確認

## 📝 開発者向け情報

### API エンドポイント
- `GET /api/data` - データ取得
- `POST /api/upload` - ファイルアップロード
- `POST /api/like/:id` - いいね増加
- `POST /api/unlike/:id` - いいね取り消し
- `POST /api/bad/:id` - バッド増加
- `POST /api/unbad/:id` - バッド取り消し
- `DELETE /api/post/:id` - 投稿削除
- `POST /api/admin/auth` - 管理者認証
- `GET /api/admin/data` - 管理者用データ取得
- `PUT /api/admin/post/:id` - 投稿更新
- `DELETE /api/admin/posts` - 複数投稿削除

### 互換性レイヤー
`js/api.js` でGoogle Apps Script互換性レイヤーを提供しています：

```javascript
// 従来のGAS呼び出し（変更不要）
google.script.run.withSuccessHandler(callback).getData();
google.script.run.withSuccessHandler(success).withFailureHandler(error).uploadFileAndRecord(...);
google.script.run.checkAdminPassword(password);
```

### データ構造
Google Sheetsの列構造（A〜T列）：
- A: ID
- B: 学年
- C: 年度
- D: 種類
- E: 科目
- F: 文理区分
- G: 内容タイプ
- H: ファイル形式
- I: コメント
- J: URL
- K: 日付
- L: likes
- M: bad
- N: 公開IPアドレス
- O: プライベートIPアドレス
- P: User-Agent
- Q: プラットフォーム
- R: 画面解像度
- S: ウィンドウサイズ
- T: ファイルサイズ

## 🤝 貢献

バグ報告や機能要望は、GitHubのIssuesでお知らせください。

## 📄 ライセンス

MIT License
