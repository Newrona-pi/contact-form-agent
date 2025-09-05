@echo off
echo ========================================
echo form_filler インストールスクリプト
echo ========================================

echo.
echo 1. 仮想環境の作成...
python -m venv venv

echo.
echo 2. 仮想環境のアクティベート...
call venv\Scripts\activate.bat

echo.
echo 3. pipのアップグレード...
python -m pip install --upgrade pip

echo.
echo 4. 依存関係のインストール...
pip install -r requirements.txt

echo.
echo 5. form_fillerパッケージのインストール...
pip install -e .

echo.
echo 6. Playwrightブラウザのインストール...
playwright install chromium

echo.
echo ========================================
echo インストール完了！
echo ========================================
echo.
echo 使用方法:
echo 1. 仮想環境をアクティベート: venv\Scripts\activate.bat
echo 2. form_fillerを実行: python form_filler.py --help
echo.
pause
