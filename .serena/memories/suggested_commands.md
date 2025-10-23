# 推奨コマンド集

## 開発環境セットアップ
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動（Turbopack使用）
npm run dev

# 本番ビルド
npm run build

# 本番サーバーの起動
npm start
```

## コード品質管理
```bash
# ESLintでコードチェック
npm run lint

# TypeScriptの型チェック
npm run typecheck

# テスト実行
npm test
```

## システムユーティリティ（macOS）
```bash
# ファイル検索
find . -name "*.tsx" -type f

# 文字列検索
grep -r "pattern" . --include="*.tsx"

# ディレクトリ一覧
ls -la

# 現在のディレクトリ確認
pwd

# Git操作
git status
git add .
git commit -m "message"
git push
```

## 開発時の推奨ワークフロー
1. `npm run dev` で開発サーバー起動
2. コード編集
3. `npm run typecheck` で型チェック
4. `npm run lint` でコード品質チェック
5. `npm test` でテスト実行
6. コミット・プッシュ