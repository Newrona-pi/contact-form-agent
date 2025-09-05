#!/usr/bin/env python3
"""
フォーム自動入力ツール
CSVファイルからフォームURLを読み込み、自動入力・送信・CAPTCHA解決を行う
"""

import sys
from form_filler.cli import app

if __name__ == "__main__":
    # Typerアプリを実行
    app()


