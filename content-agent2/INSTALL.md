# form_filler インストールガイド

## 概要

form_fillerは、CSVファイルからフォームURLを読み込み、自動入力・送信・CAPTCHA解決を行う完全自動化ツールです。このガイドでは、仮想環境でのセットアップ手順を説明します。

## 前提条件

- Python 3.8以上
- pip（Pythonパッケージマネージャー）
- インターネット接続（依存関係のダウンロード用）

## インストール方法

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

#### 1. 仮想環境の作成
```bash
# 仮想環境を作成
python -m venv venv
```

#### 2. 仮想環境のアクティベート

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

#### 3. pipのアップグレード
```bash
python -m pip install --upgrade pip
```

#### 4. 依存関係のインストール
```bash
pip install -r requirements.txt
```

#### 5. form_fillerパッケージのインストール
```bash
pip install -e .
```

#### 6. Playwrightブラウザのインストール
```bash
playwright install chromium
```

## インストール確認

インストールが正しく完了したかを確認するには、テストスクリプトを実行してください：

```bash
python test_installation.py
```

すべてのテストが成功すれば、インストールは完了です。

## 使用方法

### 基本的な使用方法

```bash
# ヘルプを表示
python form_filler.py --help

# 基本的な実行
python form_filler.py input_forms.csv data.yml output_report.csv

# ドライラン（送信せずに入力のみ）
python form_filler.py input_forms.csv data.yml output_report.csv --dry-run

# デバッグモード
python form_filler.py input_forms.csv data.yml output_report.csv --debug --show-browser
```

### オプション一覧

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--concurrency, -c` | 並列数 | 1 |
| `--timeout, -t` | タイムアウト（秒） | 8 |
| `--captcha-api` | CAPTCHA API | anticaptcha |
| `--dry-run` | 送信せずに入力のみ実行 | False |
| `--no-submit` | 送信ボタンを押さずに入力のみ | False |
| `--show-browser` | ブラウザ画面を表示 | False |
| `--debug` | デバッグモード | False |
| `--fast` | 高速化モード | False |
| `--learn` | 学習モード | False |
| `--log-level` | ログレベル | INFO |

## トラブルシューティング

### よくある問題

#### 1. 仮想環境がアクティベートされていない
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

#### 2. 依存関係のインストールエラー
```bash
# pipをアップグレード
python -m pip install --upgrade pip

# 依存関係を再インストール
pip install -r requirements.txt
```

#### 3. Playwrightブラウザのインストールエラー
```bash
# Chromiumを再インストール
playwright install chromium
```

#### 4. インポートエラー
```bash
# パッケージを再インストール
pip install -e .
```

### ログの確認

デバッグ情報を確認するには：

```bash
python form_filler.py input_forms.csv data.yml output_report.csv --log-level DEBUG
```

## アンインストール

仮想環境を削除するには：

```bash
# 仮想環境を非アクティベート
deactivate

# 仮想環境フォルダを削除
rm -rf venv  # macOS/Linux
# または
rmdir /s venv  # Windows
```

## 開発者向け情報

### 開発モードでのインストール

開発中は、以下のコマンドでパッケージを開発モードでインストールしてください：

```bash
pip install -e .
```

これにより、ソースコードの変更が即座に反映されます。

### 依存関係の追加

新しい依存関係を追加する場合は、`requirements.txt`を更新してください：

```bash
pip freeze > requirements.txt
```

### テストの実行

```bash
python test_installation.py
```

## サポート

問題が発生した場合は、以下を確認してください：

1. Pythonのバージョン（3.8以上が必要）
2. 仮想環境が正しくアクティベートされているか
3. すべての依存関係がインストールされているか
4. Playwrightブラウザがインストールされているか

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
