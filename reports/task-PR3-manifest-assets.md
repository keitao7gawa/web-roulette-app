# PR3 タスク: マニフェスト/README のアセット整合

## 目的
- 参照切れのアセットを解消し、PWA/SEO 品質を改善

## スコープ
- `app/manifest.json` のアイコン参照を見直し
- README の `public/screenshot.png` の参照解消
- `/x-icon.png` の最終的なアイコン差し替え（PR1での暫定対応の恒久化）

## 受け入れ基準
- Lighthouse でアイコン/マニフェストのエラーが出ない
- ビルド後の 404 がない

## 変更対象
- `app/manifest.json`
- `README.md`
- `public/`（必要に応じて画像追加 or 参照先を既存に変更）

## 手順
1) 既存 `public/*.png|*.svg` を確認し、`manifest.json` の `icons` を既存ファイルに合わせる or 画像を追加
2) README のスクリーンショット参照を既存に合わせる（画像追加する場合は配置）
3) フッターのアイコン参照を確定（`/x-icon.png` を置くか、SVGに統一）
4) `npm run build` と Lighthouse 簡易確認

## ブランチ/PR情報
- Branch: `fix/manifest-assets`
- Title: `fix: align manifest and README with existing public assets`
- Body: 参照切れ修正と確認手順を記載
