# 考査村 GAS + GitHub Pages 設定手順

## 概要
Google Apps Script (GAS) + GitHub Pages での運用により、完全無料で24時間稼働する考査村を構築します。

## メリット
- ✅ **完全無料**
- ✅ **24時間稼働**
- ✅ **パソコンの電源に依存しない**
- ✅ **Googleサービスとの連携が簡単**
- ✅ **既存のGASコードがそのまま使える**

## 設定手順

### 1. Google Apps Script の設定

#### 1.1 GASプロジェクトの作成
1. [Google Apps Script](https://script.google.com/) にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「考査村」に変更

#### 1.2 コードの配置
1. `code.gs` ファイルの内容をコピー
2. GASエディタの `Code.gs` に貼り付け
3. 保存（Ctrl+S）

#### 1.3 必要なサービスを有効化
1. 左側の「サービス」をクリック
2. 以下のサービスを追加：
   - **Google Drive API**
   - **Google Sheets API**
   - **Gmail API**

#### 1.4 スプレッドシートの設定
1. Google Sheetsで新しいスプレッドシートを作成
2. シート名を「シート1」に変更
3. 以下のヘッダー行を追加：
   ```
   A: ID | B: 学年 | C: 年度 | D: 種類 | E: 科目 | F: 文理区分 | G: 内容 | H: ファイル形式 | I: コメント | J: URL | K: 日付 | L: likes | M: bad | N: 公開IP | O: プライベートIP | P: User-Agent | Q: プラットフォーム | R: 画面解像度 | S: ウィンドウサイズ | T: ファイルサイズ
   ```
4. シート2を作成し、A1セルに管理者パスワードのハッシュ値を設定

#### 1.5 デプロイ設定
1. 「デプロイ」→「新しいデプロイ」をクリック
2. 種類：「ウェブアプリ」
3. 次のユーザーとして実行：「自分」
4. アクセスできるユーザー：「全員」
5. 「デプロイ」をクリック
6. **URLをコピー**（例：`https://script.google.com/macros/s/AKfycbz.../exec`）

### 2. GitHub Pages の設定

#### 2.1 GitHubリポジトリの作成
1. GitHubで新しいリポジトリを作成
2. リポジトリ名：`kosamura`
3. 公開リポジトリにする

#### 2.2 ファイルのアップロード
以下のファイルをGitHubにアップロード：
- `gas-index.html` → `index.html`
- `gas-upload.html` → `upload.html`
- `gas-search.html` → `search.html`
- `gas-share.html` → `share.html`
- `gas-admin.html` → `admin.html`
- `gas-ph-index.html` → `ph-index.html`
- `js/api.js`
- `js/gas-api.js`

#### 2.3 GAS URLの設定
各HTMLファイル内の `YOUR_GAS_SCRIPT_ID` を実際のGASスクリプトIDに置換：
```javascript
const GAS_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec';
```

#### 2.4 GitHub Pagesの有効化
1. リポジトリの「Settings」タブをクリック
2. 左側の「Pages」をクリック
3. Source：「Deploy from a branch」を選択
4. Branch：「main」を選択
5. 「Save」をクリック
6. **サイトURLをコピー**（例：`https://username.github.io/kosamura/`）

### 3. 環境設定

#### 3.1 Google Drive フォルダの設定
1. Google Driveで新しいフォルダを作成
2. フォルダIDをコピー（URLの最後の部分）
3. `code.gs` の `FOLDER_ID` を更新

#### 3.2 スプレッドシートIDの設定
1. Google SheetsのURLからスプレッドシートIDをコピー
2. `code.gs` の `SPREADSHEET_ID` を更新

#### 3.3 管理者パスワードの設定
1. シート2のA1セルに管理者パスワードのSHA-256ハッシュ値を設定
2. デフォルトパスワード：`0611`

### 4. 動作確認

#### 4.1 基本動作確認
1. GitHub PagesのURLにアクセス
2. 各機能が正常に動作するか確認：
   - ファイルアップロード
   - データ検索
   - いいね・バッド機能
   - 管理者機能

#### 4.2 エラー対処
- **CORSエラー**：GASのデプロイ設定を確認
- **認証エラー**：Google Drive/Sheetsの権限を確認
- **ファイルアップロードエラー**：フォルダIDと権限を確認

## 運用上の注意点

### セキュリティ
- 管理者パスワードは定期的に変更
- Google Driveの共有設定を適切に管理
- 不要なファイルは定期的に削除

### パフォーマンス
- 大量のファイルアップロード時は時間がかかる場合がある
- GASの実行時間制限（6分）に注意

### バックアップ
- スプレッドシートの定期的なバックアップ
- 重要なファイルは別途保存

## トラブルシューティング

### よくある問題
1. **GASが動作しない**
   - サービスが有効化されているか確認
   - デプロイ設定を再確認

2. **ファイルアップロードが失敗**
   - Google Driveの権限を確認
   - フォルダIDが正しいか確認

3. **データが表示されない**
   - スプレッドシートIDが正しいか確認
   - シート名が「シート1」になっているか確認

### サポート
問題が発生した場合は、以下を確認してください：
- GASの実行ログ
- ブラウザの開発者ツールのコンソール
- ネットワークタブでのエラー

## 完了
これで、完全無料で24時間稼働する考査村が完成します！ 