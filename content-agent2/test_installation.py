#!/usr/bin/env python3
"""
form_filler インストールテストスクリプト
"""

import sys
import importlib

def test_imports():
    """必要なモジュールのインポートテスト"""
    print("=== インポートテスト ===")
    
    modules_to_test = [
        "form_filler",
        "form_filler.core",
        "form_filler.cli",
        "form_filler.models",
        "form_filler.constants",
        "form_filler.utils",
        "form_filler.selectors",
        "form_filler.captcha",
        "playwright",
        "typer",
        "aiofiles",
        "aiolimiter",
        "yaml",
        "aiohttp",
        "bs4",
    ]
    
    failed_imports = []
    
    for module in modules_to_test:
        try:
            importlib.import_module(module)
            print(f"✅ {module}")
        except ImportError as e:
            print(f"❌ {module}: {e}")
            failed_imports.append(module)
    
    return failed_imports

def test_form_filler_class():
    """FormFillerクラスのテスト"""
    print("\n=== FormFillerクラステスト ===")
    
    try:
        from form_filler.core import FormFiller
        print("✅ FormFillerクラスのインポート成功")
        
        # インスタンス作成テスト
        filler = FormFiller()
        print("✅ FormFillerインスタンス作成成功")
        
        return True
    except Exception as e:
        print(f"❌ FormFillerクラステスト失敗: {e}")
        return False

def test_cli():
    """CLIのテスト"""
    print("\n=== CLIテスト ===")
    
    try:
        from form_filler.cli import app
        print("✅ CLI app関数のインポート成功")
        return True
    except Exception as e:
        print(f"❌ CLIテスト失敗: {e}")
        return False

def main():
    """メインテスト関数"""
    print("form_filler インストールテスト")
    print("=" * 50)
    
    # インポートテスト
    failed_imports = test_imports()
    
    # FormFillerクラステスト
    form_filler_ok = test_form_filler_class()
    
    # CLIテスト
    cli_ok = test_cli()
    
    # 結果表示
    print("\n" + "=" * 50)
    print("テスト結果:")
    
    if not failed_imports and form_filler_ok and cli_ok:
        print("🎉 すべてのテストが成功しました！")
        print("form_fillerは正常にインストールされています。")
        return 0
    else:
        print("❌ 一部のテストが失敗しました。")
        if failed_imports:
            print(f"失敗したインポート: {failed_imports}")
        if not form_filler_ok:
            print("FormFillerクラステストが失敗")
        if not cli_ok:
            print("CLIテストが失敗")
        return 1

if __name__ == "__main__":
    sys.exit(main())
