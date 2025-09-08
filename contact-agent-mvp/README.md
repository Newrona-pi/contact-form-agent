# 問い合わせフォーム自動入力ツール MVP

Next.js 14 (App Router, TypeScript) + Tailwind + shadcn/ui で実装された問い合わせフォーム自動入力ツールのMVPです。

## 環境変数設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を設定してください：

```env
# Python 実行コマンド（例: python / python3 / Windowsは "py -3" も可）
ENGINE_PYTHON=python

# "python -m <これ>" で起動するパッケージエントリ（例: yourtool.cli）
ENGINE_ENTRY=yourtool.cli

# Python ツールのリポジトリ絶対パス（cli.py があるルート）
ENGINE_WORKDIR=/absolute/path/to/python-engine-repo

# 常時付けたい共通フラグ（任意）
ENGINE_DEFAULT_ARGS=--fast

# ライセンス認証APIのベースURL
LICENSE_SYSTEM_URL=http://localhost:3001
```

## 開発サーバー起動

```bash
npm run dev
```

## 機能

- データセット複数選択（業界別CSVを複数選択可）
- 本文テンプレ＋差し込み変数（少数）
- 送信者プロファイル（氏名／メール／電話）
- 実行設定（dry-run, 並列, タイムアウト, 可視デバッグ, CAPTCHAの有無）
- 事前テスト（1件プレビュー＋マッピング表）
- 実行＆リアルタイムモニタ＋結果CSV
- Pythonエンジン統合（child_process経由）
- リアルタイム進捗更新（JSON Lines）
- グローバルジョブ管理（開発環境対応）
- 404エラー自動検出・クリーンアップ

## 動作確認手順

### 1. 環境変数設定
`.env.local` の以下を実環境に合わせる：
- `ENGINE_PYTHON`（例: `python` / `python3` / Windowsは `py -3`）
- `ENGINE_ENTRY`（例: `yourtool.cli`）
- `ENGINE_WORKDIR`（Pythonツールのリポジトリ絶対パス）
- `ENGINE_DEFAULT_ARGS`（任意）

### 2. データセット確認
`public/datasets/meta.json` と CSV 群が存在することを確認：
- `meta.json` 内の `file` パスは `/datasets/xxx.csv`（`public` 直下）を指す

### 3. Webアプリ起動
```bash
npm run dev
```

### 4. 画面操作
- データセットを1つ以上選択
- 本文テンプレとプロフィール（姓/名/メール）を入力
- **Dry-run ON**、並列/タイムアウトはデフォルトでOK
- 「Run開始」→ 進捗が `queued → running → done` になれば成功
- **リアルタイム進捗**: 実行中は2秒間隔で進捗が更新される
- 完了後「CSVエクスポート」から `result-<id>.csv` がダウンロードできること
- **404対応**: ジョブが存在しない場合は自動的にモニタが停止する

### よくあるハマりポイント

- **Edge Runtime で child_process が使えない**
  → 各 API の先頭に `export const runtime = "nodejs"` があるか確認

- **パス解決エラー**
  → `.env.local` の `ENGINE_WORKDIR` が **cli.py のあるルート**か
  → `meta.json` の `file` が `/datasets/*.csv` になっているか
  → Windows で `ENGINE_PYTHON=py -3` の場合でも `engine.ts` は分割済み

- **結果CSVが無い**
  → まず Python ツールを単体で `--dry-run --no-submit` で実行し、
    出力を `result.csv` に書けるようにする（最短は CLI に `--output` を追加）

- **進捗が固定のまま**
  → **実装済み**: Python側で **JSON Lines ログ**を stdout に出し、`engine.ts` の `child.stdout.on("line")` で行単位に parse して `success/failed` を更新する仕組みが完成済み

- **開発環境でホットリロード時にジョブが消える**
  → **実装済み**: `globalThis.__FORMFILLER_JOBS__` でグローバルジョブ管理を実装済み

- **404エラーでモニタが止まらない**
  → **実装済み**: `RunMonitor` で404エラーを検出して自動的に `runId` をクリアする仕組みが完成済み
