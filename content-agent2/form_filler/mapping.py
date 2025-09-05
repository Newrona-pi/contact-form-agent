from __future__ import annotations

import re
from typing import Dict, Optional

from .utils import normalize
from .constants import CANDIDATES

__all__ = [
    "label_mentions",
    "penalty_for_name_like_mismatch",
    "bonus_for_message_like",
    "score_adjustment",
]


def label_mentions(label: str, key: str) -> bool:
    """ラベル文字列が指定キーのシノニムにマッチするか（互換維持）。"""
    pats = CANDIDATES.get(key, [])
    nl = normalize(label)
    for p in pats:
        pat = p.pattern if hasattr(p, "pattern") else str(p)
        if re.search(pat, nl):
            return True
    return False


# ------------------------------
# Heuristics to reduce common mis-mapping
# ------------------------------
_NEG_TEXT_HINT = re.compile(r"(お問い合わせ|ご相談|自由記入|メッセージ|詳細|内容|備考|本文|comment|message|free[-_ ]?text)", re.I)
_URLISH = re.compile(r"https?://|www\.", re.I)


def penalty_for_name_like_mismatch(
    *, tag: str, input_type: str, placeholder: str = "", aria_label: str = "", value: str = ""
) -> int:
    """名前フィールドに長文やURLっぽい特徴がある場合の減点。"""
    penalty = 0
    # textareaの場合は即決でお問い合わせ内容を入力するため、スコア判定は不要
    # if tag == "textarea":
    #     penalty -= 12
    if _NEG_TEXT_HINT.search(placeholder) or _NEG_TEXT_HINT.search(aria_label):
        penalty -= 6
    if len(value) > 80:
        penalty -= 4
    if "\n" in value or "\r" in value:
        penalty -= 4
    if _URLISH.search(value):
        penalty -= 6
    if input_type in {"email", "url"}:
        penalty -= 8
    return penalty


def bonus_for_message_like(*, tag: str, rows: Optional[int] = None, placeholder: str = "", aria_label: str = "") -> int:
    """message/subject 系の加点（textareaや自由記述の示唆がある場合）。"""
    # textareaの場合は即決でお問い合わせ内容を入力するため、スコア判定は不要
    return 0


def score_adjustment(
    key: str,
    *,
    tag: str,
    input_type: str,
    attrs: Dict[str, str] | None = None,
    candidate_label_text: str = "",
    tentative_value: str = "",
) -> int:
    """
    マッピング候補の追加スコア（減点/加点）を返す。
    既存スコアリングにこの返り値を足すことで誤割当を抑制できる。
    （使用側は None を許容してください。互換のための補助関数です。）
    """
    a = {k: (attrs.get(k) if attrs else "") or "" for k in ("placeholder", "aria-label", "rows", "maxlength")}
    adj = 0

    if key in {"name", "first_name", "last_name"}:
        adj += penalty_for_name_like_mismatch(
            tag=tag,
            input_type=input_type.lower() if input_type else "",
            placeholder=a["placeholder"],
            aria_label=a["aria-label"],
            value=tentative_value,
        )

    # textareaの場合は即決でお問い合わせ内容を入力するため、スコア判定は不要
    # if key in {"message", "subject", "content", "inquiry", "comment"}:
    #     rows = 0
    #     try:
    #         rows = int(a["rows"]) if a["rows"] else 0
    #     except Exception:
    #         rows = 0
    #     adj += bonus_for_message_like(tag=tag, rows=rows, placeholder=a["placeholder"], aria_label=a["aria-label"])

    # email / phone は型一致が強い
    # textareaの場合は即決でお問い合わせ内容を入力するため、スコア判定は不要
    # if key.startswith("email"):
    #     if (input_type or "").lower() == "email":
    #         adj += 4
    #     elif tag == "textarea":
    #         adj -= 10
    # if key.startswith("phone"):
    #     if (input_type or "").lower() == "tel":
    #         adj += 3
    #     elif tag == "textarea":
    #         adj -= 8

    # labelにもヒントがある場合は微加点
    if candidate_label_text and label_mentions(candidate_label_text, key):
        adj += 2

    return adj
