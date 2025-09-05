# フォーム自動入力ツール

CSVファイルからフォームURLを読み込み、自動入力・送信・CAPTCHA解決を行う完全自動化ツールです。

## 機能

- **フィールド自動マッピング**: `name/placeholder/label/aria-label` からスコアリング
- **textarea即決入力**: すべてのtextareaフィールドに即決でお問い合わせテンプレート内容を入力
- **住所関連フィールド対応**: 郵便番号、都道府県、市区町村、番地の分割入力に対応
- **動的フィールド名対応**: `ext_01`、`field_01`、`input_01`などの動的な名前フィールドに対応
- **フリガナ分割機能**: フリガナを姓・名に自動分割して入力
- **CAPTCHA対応**: reCAPTCHA v2/v3, hCaptcha, Turnstile
- **並列実行**: 複数のフォームを同時処理
- **成功判定**: URL変化、DOM文言、JSONレスポンスによる自動判定
- **レート制限**: 60 submit/min の制限機能
- **ブラウザ表示対応**: デバッグ用にブラウザウィンドウ表示とサイズ調整機能
- **モジュラー設計**: 機能別に分割された保守性の高いコード構造

## プロジェクト構造

```
form_filler/
├── __init__.py          # パッケージ初期化
├── cli.py              # Typer CLI エントリポイント
├── core.py             # FormFiller メインクラス
├── models.py           # FormTask, FormResult データクラス
├── constants.py        # 定数・辞書・正規表現パターン
├── utils.py            # 純粋関数（normalize, css_escape, split_name, split_phone）
├── selectors.py        # セレクタ生成・ラベル抽出関数
├── captcha.py          # CaptchaHandler クラス
├── mapping.py          # フィールドマッピング関連（label_mentions）
├── filling.py          # 入力ヘルパー（空）
├── consent.py          # 同意処理ヘルパー（空）
├── success.py          # 成功判定ヘルパー（空）
└── logging_setup.py    # ログ設定

form_filler.py          # 互換性のためのエントリポイント
```

## セットアップ

### 方法1: 自動インストールスクリプト（推奨）

#### Windows
```bash
# インストールスクリプトを実行
install.bat
```

#### macOS/Linux
```bash
# インストールスクリプトを実行
./install.sh
```

### 方法2: 手動セットアップ

#### 1. 仮想環境作成と依存関係インストール

```bash
# 仮想環境作成
python -m venv venv

# 仮想環境アクティベート
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# pipアップグレード
python -m pip install --upgrade pip

# 依存関係インストール
pip install -r requirements.txt

# form_fillerパッケージを開発モードでインストール
pip install -e .

# Playwrightブラウザインストール
playwright install chromium
```

### 3. インストール確認

```bash
# テストスクリプトを実行
python test_installation.py
```

### 2. 環境変数設定（CAPTCHA使用時）

```bash
# Anti-Captcha
export ANTICAPTCHA_KEY="your_api_key"

# 2captcha
export 2CAPTCHA_KEY="your_api_key"

# Capsolver
export CAPSOLVER_KEY="your_api_key"
```

## 使用方法

### 基本的な実行

```bash
python form_filler.py --csv input_forms.csv --data data.yml
```

### オプション付き実行

```bash
python form_filler.py --csv input_forms.csv --data data.yml \
  --output output_report.csv \
  --concurrency 8 \
  --timeout 12 \
  --captcha-api anticaptcha \
  --dry-run
```

### ブラウザ表示でのテスト実行

```bash
# ブラウザウィンドウを表示してデバッグ
python form_filler.py --csv input_forms.csv --data data.yml --show-browser --debug

# ドライラン（送信せずに入力のみ）
python form_filler.py --csv input_forms.csv --data data.yml --show-browser --debug --dry-run

# カスタムウィンドウサイズで実行
set BROWSER_WIDTH=1600
set BROWSER_HEIGHT=900
python form_filler.py --csv input_forms.csv --data data.yml --show-browser --debug
```

### Preflight/観測用オプション

```bash
# 進捗やマッピングをJSON Linesで標準出力へ出力
python form_filler.py --csv input_forms.csv --data data.yml --emit-json

# 先頭5件のみ処理（Preflight用途）
python form_filler.py --csv input_forms.csv --data data.yml --limit 5
```

### オプション説明

#### 必須オプション
- `--csv`: 入力CSVファイルへのパス
- `--data`: 入力データYAMLへのパス

#### オプション
- `--output, -o`: 結果CSVの出力先（デフォルト: result.csv）
- `--concurrency`: 並列数（デフォルト: 3）
- `--timeout`: タイムアウト（秒）（デフォルト: 12）
- `--captcha-api`: CAPTCHA API（anticaptcha/2captcha/capsolver/none）（デフォルト: none）
- `--dry-run`: 送信せずに入力のみ実行
- `--no-submit`: 送信ボタンを押さずに入力のみ実行（テストモード）
- `--show-browser`: ブラウザ画面を表示する（デバッグ用）
- `--fast`: 高速化モード（タイムアウト短縮、待機時間削減）
- `--debug`: デバッグ用: フィールドハイライト＆詳細ログ
- `--emit-json`: 進捗やマッピングをJSON Linesで標準出力へ出す
- `--limit`: 先頭N件のみ処理（Preflight用途）

#### ブラウザウィンドウサイズ設定
環境変数でカスタムサイズを指定可能：
- `BROWSER_WIDTH`: ブラウザウィンドウの幅（デフォルト: 1366）
- `BROWSER_HEIGHT`: ブラウザウィンドウの高さ（デフォルト: 768）

## ファイル形式

### 入力CSVファイル (input_forms.csv)

```csv
form_url
https://example.com/contact
https://example2.com/contact
```

### データYAMLファイル (data.yml)

```yaml
# フォーム入力用のデフォルトデータ
# すべてのフォームに共通して使用されるデータ

# 基本情報
name: "田中 太郎"
last_name: "田中"
first_name: "太郎"
furigana: "タナカ タロウ"
email: "tanaka@example.com"
email_confirm: ""  # 空でOK（自動で email の値が入る）
phone: "090-1234-5678"
company: "株式会社サンプル"
position: "営業部長"

# 問い合わせ内容
message: "こんにちは。製品について詳しく知りたいです。"
subject: "パートナー応募について"

# 即決お問い合わせテンプレート（textarea用）
inquiry_template: |
  お問い合わせありがとうございます。

  製品・サービスについて詳しく知りたいです。

  具体的には以下の点について教えていただけますでしょうか：
  ・料金体系
  ・導入事例
  ・サポート体制
  ・導入までの流れ
  ・他社との違い

  よろしくお願いいたします。

# 住所関連情報
address: "東京都渋谷区代々木1-1-1"
postal_code: "151-0053"
prefecture: "東京都"
city: "渋谷区"
street: "代々木1-1-1"

# 追加情報（網羅性のため）
website: "https://example.com"
budget: "100万円以下"
timeline: "3ヶ月以内"
department: "営業部"

# 分離された名前フィールド用（placeholder="例）山田"等に対応）
nameSei: "田中"
nameMei: "太郎"
sei: "田中"
mei: "太郎"
```

### 出力CSVファイル (output_report.csv)

```csv
form_url,status,note,timestamp,unmapped_fields
https://example.com/contact,OK,phrase_match: お問い合わせありがとうございました,2024-01-01T12:00:00,
https://example2.com/contact,CAPTCHA_FAIL,recaptcha解決失敗,2024-01-01T12:01:00,
```

## ステータスコード

| ステータス | 説明 |
|-----------|------|
| `OK` | 正常送信 |
| `CAPTCHA_TIMEOUT` | CAPTCHA解決タイムアウト |
| `CAPTCHA_FAIL` | CAPTCHA解決失敗 |
| `SUBMIT_FAIL` | 送信失敗 |
| `TIMEOUT` | ページ読み込みタイムアウト |
| `ERROR` | その他のエラー |
| `DRY_RUN` | ドライラン（送信スキップ） |

## モジュール詳細

### core.py
メインの `FormFiller` クラスを含み、フォーム処理の全体的な流れを制御します。
- **textareaの即決入力**: すべてのtextareaフィールドに即決でお問い合わせテンプレート内容を入力（スコア判定なし）
- **ブラウザウィンドウサイズ調整**: デバッグ用にブラウザウィンドウのサイズと位置を自動調整
- **即決カスケード判定**: type/autocomplete/placeholder/name/id/labelTextの順で即決マッピング
- Angular.jsなどのフレームワーク対応
- 人間らしい入力動作のシミュレーション

### models.py
- `FormTask`: フォーム処理タスクの情報
- `FormResult`: フォーム送信結果の情報

### constants.py
フィールドマッピング用の定数、辞書、正規表現パターンを定義します。
- **STRONG_TOKENS**: 即決カスケード判定用の強トークンパターン
- **CONFIRM_TOKENS**: 確認欄（email_confirm等）検出用トークン
- **SEARCH_TOKENS**: 検索欄除外用トークン
- **AUTOCOMPLETE_MAP**: autocomplete属性のマッピング

### utils.py
純粋関数（副作用のない関数）を提供：
- `normalize()`: テキスト正規化
- `css_escape()`: CSSセレクタ用エスケープ
- `split_name()`: 名前の分割
- `split_phone()`: 電話番号の分割

### selectors.py
CSSセレクタ生成とラベル抽出機能：
- `selector_for()`: 要素からCSSセレクタ生成
- `selector_for_locator()`: Playwrightロケーターからセレクタ生成
- `get_label_text_for_locator()`: ラベルテキスト取得
- `extract_label_text()`: ラベルテキスト抽出
- `extract_labels_bulk()`: 一括ラベル抽出（即決カスケード用）

### captcha.py
`CaptchaHandler` クラスでCAPTCHA解決機能を提供：
- reCAPTCHA v2/v3 対応
- hCaptcha 対応
- 複数のCAPTCHA解決サービス対応

## サンプルファイル

### input_forms.csv
```csv
form_url
https://httpbin.org/post
https://example.com/contact
```

### data.yml
```yaml
# フォーム入力用のデフォルトデータ
name: "田中 太郎"
email: "tanaka@example.com"
phone: "090-1234-5678"
company: "株式会社サンプル"
subject: "お問い合わせ"
message: "こんにちは。製品について詳しく知りたいです。"
```

### 使用方法の例

```bash
# 基本的な実行
python form_filler.py --csv sample_input_forms.csv --data sample_data.yml

# 別のデータセットを使用
python form_filler.py --csv sample_input_forms.csv --data sample_data_alternatives.yml

# デバッグモードで実行（ブラウザ表示）
python form_filler.py --csv sample_input_forms.csv --data sample_data.yml --debug --show-browser

# ドライラン（送信せずに入力のみ）
python form_filler.py --csv sample_input_forms.csv --data sample_data.yml --debug --show-browser --dry-run
```

## 開発・カスタマイズ

### 新しいフィールドタイプの追加
`constants.py` の `CANDIDATES` 辞書に新しいフィールドの正規表現パターンを追加してください。

### textareaの即決入力テンプレートのカスタマイズ
`sample_data.yml` の `inquiry_template` フィールドを編集して、textareaに入力する内容をカスタマイズできます。

### ブラウザウィンドウサイズのカスタマイズ
環境変数 `BROWSER_WIDTH` と `BROWSER_HEIGHT` でブラウザウィンドウのサイズを指定できます。

### カスタムセレクタの追加
`selectors.py` に新しいセレクタ生成関数を追加できます。

### CAPTCHA解決サービスの追加
`captcha.py` の `CaptchaHandler` クラスに新しいサービスを追加できます。

## 新機能・改善点

### textareaの即決入力機能
- すべてのtextareaフィールドに即決でお問い合わせテンプレート内容を入力
- スコア判定なしで、textarea要素を検出した時点で即座に入力
- 設定ファイルでテンプレート内容をカスタマイズ可能

### 住所関連フィールド対応
- 郵便番号、都道府県、市区町村、番地の分割入力に対応
- 動的な名前フィールド（`ext_01`、`field_01`、`input_01`など）に対応
- ラベルテキスト「郵便番号」からの自動認識

### フリガナ分割機能
- フリガナを姓・名に自動分割して入力
- `kanaSei`、`kanaMei`フィールドへの自動マッピング
- 分割フィールドが存在しない場合は単一フィールドに統合

### ブラウザウィンドウサイズ調整
- デバッグ用にブラウザウィンドウのサイズと位置を自動調整
- デフォルトサイズ: 1366x768（ノートPCに適したサイズ）
- 環境変数でカスタムサイズ指定可能

### 即決カスケード判定
- type/autocomplete/placeholder/name/id/labelTextの順で即決マッピング
- `placeholder`は完全一致判定、その他は部分一致判定
- 従来のスコア判定よりも高速で確実なフィールド識別
- 一括ラベル抽出による処理効率の向上

### 動的フィールド名対応
- `ext_01`、`field_01`、`input_01`などの動的な名前フィールドに対応
- ラベルテキストからの自動認識による補完
- 一般的なフォームシステムの命名規則に対応

### JSON Lines出力機能
- `--emit-json`オプションで進捗やマッピング情報をJSON Lines形式で標準出力に出力
- 結果イベント（`event: "result"`）: フォーム処理の結果をリアルタイムで監視
- マッピングイベント（`event: "mapping"`）: フィールドマッピング情報を可視化
- Preflight用途の`--limit`オプションで先頭N件のみ処理可能

## 注意事項

1. **CAPTCHA API**: 使用するCAPTCHA解決サービスに応じてAPIキーを設定してください
2. **レート制限**: 60 submit/min の制限があります
3. **ブラウザ**: Chromiumを使用します（headlessモード）
4. **画像ブロック**: パフォーマンス向上のため画像・フォントファイルはブロックされます
5. **モジュール構造**: 機能別に分割されているため、特定の機能を修正する際は対応するモジュールを編集してください
6. **textarea即決入力**: すべてのtextareaに同じテンプレートが入力されるため、用途に応じてテンプレート内容を調整してください
7. **住所関連フィールド**: 郵便番号、都道府県、市区町村、番地の分割入力に対応していますが、フォームの構造によっては手動調整が必要な場合があります
8. **動的フィールド名**: `ext_01`などの動的な名前フィールドは、ラベルテキストからの認識に依存します

## トラブルシューティング

### よくあるエラー

1. **CAPTCHA API キーエラー**
   ```
   エラー: ANTICAPTCHA_KEY 環境変数が設定されていません
   ```
   → 環境変数を正しく設定してください

2. **ファイルが見つからない**
   ```
   エラー: 入力ファイル 'input_forms.csv' が見つかりません
   ```
   → ファイルパスを確認してください

3. **Playwright エラー**
   ```
   playwright install chromium
   ```
   → 上記コマンドでChromiumをインストールしてください

4. **インポートエラー**
   ```
   ModuleNotFoundError: No module named 'form_filler'
   ```
   → パッケージが正しくインストールされているか確認してください

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
