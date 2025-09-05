from __future__ import annotations

import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Optional, Union

__all__ = ["setup_logging"]

_DEFAULT_FMT = "%(asctime)s %(levelname)s %(name)s - %(message)s"
_CONFIGURED = False  # 2重設定防止


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # 依存なしの簡易JSON
        msg = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            msg["exc_info"] = self.formatException(record.exc_info)
        # シリアライズ（依存なし）
        import json as _json

        return _json.dumps(msg, ensure_ascii=False)


def setup_logging(
    level: Union[int, str] = logging.INFO,
    *,
    json: bool = False,
    file: Optional[str] = None,
) -> logging.Logger:
    """
    ログ初期化（多重呼び出し安全）
    - level は int か 文字列（DEBUG/INFO/...）
    - json=True で簡易JSON出力
    - file にパス指定でファイルにも出力（ローテーション5MB×3）
    既存のAPI互換: setup_logging(level=int) としても利用可能
    """
    global _CONFIGURED
    if isinstance(level, str):
        level = getattr(logging, level.upper(), logging.INFO)

    # 環境変数で上書き可
    env_level = os.getenv("FORM_FILLER_LOG_LEVEL")
    if env_level:
        try:
            level = getattr(logging, env_level.upper())
        except Exception:
            pass

    logger = logging.getLogger()  # root
    if not _CONFIGURED:
        # 既存ハンドラをクリアして統一
        for h in list(logger.handlers):
            logger.removeHandler(h)

        fmt = _JsonFormatter() if json else logging.Formatter(_DEFAULT_FMT)

        stream_handler = logging.StreamHandler()
        stream_handler.setLevel(level)
        stream_handler.setFormatter(fmt)
        logger.addHandler(stream_handler)

        if file:
            try:
                os.makedirs(os.path.dirname(file) or ".", exist_ok=True)
                fh = RotatingFileHandler(file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
                fh.setLevel(level)
                fh.setFormatter(fmt)
                logger.addHandler(fh)
            except Exception:
                # ファイルが作れない環境でも動作は継続
                pass

        logger.setLevel(level)
        _CONFIGURED = True
    else:
        # 2回目以降はレベルだけ反映
        logger.setLevel(level)
        for h in logger.handlers:
            h.setLevel(level)

    return logging.getLogger(__name__)
