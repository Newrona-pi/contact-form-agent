from __future__ import annotations

from typing import Iterable, List


# check_success は FormFiller に依存するため、現時点では core 内に保持。
# ここでは有用な成功判定の語彙と軽量ユーティリティのみ提供する。

DEFAULT_SUCCESS_PHRASES_JA: List[str] = [
    "お問い合わせありがとうございました",
    "送信が完了",
    "送信完了",
    "送信されました",
    "お問い合わせを受け付けました",
    "送信ありがとうございます",
    "受け付けました",
    "受付完了",
    "ありがとうございました",
]

DEFAULT_SUCCESS_PHRASES_EN: List[str] = [
    "thank you",
    "submitted successfully",
    "submission complete",
    "your message has been sent",
    "we have received",
    "successfully sent",
]


def get_default_success_phrases() -> List[str]:
    return DEFAULT_SUCCESS_PHRASES_JA + DEFAULT_SUCCESS_PHRASES_EN


def looks_like_success_text(text: str, *, phrases: Iterable[str] | None = None) -> bool:
    """可視テキストに成功らしさが含まれるかをざっくり判定する"""
    if not text:
        return False
    txt = text.lower()
    for p in (phrases or get_default_success_phrases()):
        if p.lower() in txt:
            return True
    return False
