from __future__ import annotations

import logging
import os
import asyncio
from typing import Optional

import typer

from .core import FormFiller
from .logging_setup import setup_logging  # 追加

app = typer.Typer(help="フォーム自動入力ツール")

@app.command()
def run(
    # 入出力
    input_file: str = typer.Option(..., "--csv", help="入力CSVへのパス"),
    data_file: str = typer.Option(..., "--data", help="入力データYAMLへのパス"),
    output_file: str = typer.Option("result.csv", "--output", "-o", help="結果CSVの出力先"),
    # 実行制御
    concurrency: int = typer.Option(3, "--concurrency"),
    timeout: int = typer.Option(12, "--timeout"),
    captcha_api: str = typer.Option("none", "--captcha-api"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    no_submit: bool = typer.Option(False, "--no-submit"),
    show_browser: bool = typer.Option(False, "--show-browser"),
    fast: bool = typer.Option(False, "--fast"),
    demo_ms: int = typer.Option(0, "--demo-ms", help="可視デモの待機ミリ秒（例: 600）。0で無効"),
    debug: bool = typer.Option(False, "--debug"),
    # Preflight/観測用
    emit_json: bool = typer.Option(False, "--emit-json", help="進捗やマッピングをJSON Linesで標準出力へ出す"),
    limit: Optional[int] = typer.Option(None, "--limit", help="先頭N件のみ処理（Preflight用途）"),
):
    """フォーム自動入力ツール"""
    try:
        # ログレベル設定（未定義エラー修正）
        log_level = "DEBUG" if debug else "INFO"
        setup_logging(log_level)
        
        logger = logging.getLogger(__name__)

        # ファイル存在チェック
        if not os.path.exists(input_file):
            typer.echo(f"エラー: 入力ファイル '{input_file}' が見つかりません")
            raise typer.Exit(1)
        if not os.path.exists(data_file):
            typer.echo(f"エラー: データファイル '{data_file}' が見つかりません")
            raise typer.Exit(1)
        # 出力先の親ディレクトリが無ければ作成
        out_dir = os.path.dirname(output_file) or "."
        os.makedirs(out_dir, exist_ok=True)

        # フィラー生成
        filler = FormFiller(
            concurrency=concurrency, timeout=timeout, captcha_api=captcha_api,
            dry_run=dry_run, no_submit=no_submit, fast_mode=fast,
            show_browser=show_browser, debug=debug, demo_ms=demo_ms,
        )

        # 実行（emit_json/limit を run に渡す）
        asyncio.run(filler.run(input_file, data_file, output_file, emit_json=emit_json, limit=limit))
        typer.echo(f"処理完了: 結果は '{output_file}' に保存されました")
        
    except Exception as e:
        typer.echo(f"エラー: {e}")
        raise typer.Exit(1)

if __name__ == "__main__":
    app()


