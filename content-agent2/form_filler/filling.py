from __future__ import annotations

import asyncio
import logging
import random
import re
from typing import Any, Dict, Optional, Tuple

from playwright.async_api import Locator

from .utils import normalize

__all__ = [
    "sanitize_name",
    "sanitize_email",
    "sanitize_phone",
    "preflight_check",
    "human_like_fill",
    "focus_and_blur",
    "scroll_into_view",
    "set_select_value",
    "check_checkbox",
]


# ------------------------------
# Value normalizers
# ------------------------------
_NAME_MAXLEN = 64


def sanitize_name(value: str) -> str:
    """Name向けの簡易正規化(改行除去・長さ制限・空白正規化)"""
    if value is None:
        return ""
    v = str(value)
    v = v.replace("\r", " ").replace("\n", " ").strip()
    v = re.sub(r"\s+", " ", v)
    if len(v) > _NAME_MAXLEN:
        v = v[:_NAME_MAXLEN]
    return v


_EMAIL_RE = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)


def sanitize_email(value: str) -> str:
    """Emailの正規化(空白除去・小文字化・簡易検証)"""
    if value is None:
        return ""
    v = str(value).strip()
    # よくある全角@/ドットの修正(最低限)
    v = v.replace("＠", "@").replace("．", ".").replace("：", ":")
    v = v.lower()
    return v


def sanitize_phone(value: str) -> str:
    """電話番号の正規化（全角→半角、各種ダッシュ統一、許可文字以外の除去）"""
    if value is None:
        return ""
    v = str(value)
    _DIGIT_MAP = {ord(a): ord("0") + i for i, a in enumerate("０１２３４５６７８９")}
    _HYPHEN_MAP = {"ー": "-", "―": "-", "−": "-", "－": "-"}
    v = v.translate(_DIGIT_MAP).translate(str.maketrans({**_HYPHEN_MAP, "＋": "+"}))
    v = re.sub(r"[^0-9+()\-\s]", "", v)
    v = re.sub(r"\s+", " ", v).strip()
    return v


# ------------------------------
# Preflight checks
# ------------------------------
_NEG_KWS_LONG_TEXT = re.compile(r"(お問い合わせ|ご相談|自由記入|メッセージ|詳細|内容)", re.I)


def preflight_check(
    field_key: str,
    tag_name: str,
    input_type: str,
    attrs: Dict[str, str] | None,
    value: str | None,
) -> Tuple[bool, list[str]]:
    """
    入力前の簡易チェック。Trueなら続行、Falseなら再探索/スキップを推奨。
    ここで弾きたい典型:
      - name に textarea
      - name に長文/URL/記号だらけ
      - email 形式不正
    戻り値: (ok, reasons)
    """
    reasons: list[str] = []
    a = {k: (attrs.get(k) if attrs else "") or "" for k in ("placeholder", "aria-label", "maxlength")}
    v = value or ""

    # 禁止/減点ケース
    if field_key in {"name", "first_name", "last_name"}:
        if tag_name == "textarea":
            reasons.append("name-looks-like-textarea")
            return False, reasons
        if len(v) > _NAME_MAXLEN or "\n" in v or "\r" in v:
            reasons.append("name-too-long-or-has-newlines")
            return False, reasons
        if _NEG_KWS_LONG_TEXT.search(a["placeholder"]) or _NEG_KWS_LONG_TEXT.search(a["aria-label"]):
            reasons.append("name-placeholder-smells-like-message")
            return False, reasons

    if field_key in {"email", "email_confirm"}:
        if not _EMAIL_RE.match(v or ""):
            reasons.append("email-format-invalid")
            return False, reasons

    if field_key == "phone":
        if not re.search(r"[0-9]{2,}", v or ""):
            reasons.append("phone-digits-too-few")
            return False, reasons

    # OK
    return True, reasons


# ------------------------------
# Fill helpers (simulate human-ish behavior safely)
# ------------------------------
async def human_like_fill(locator: Locator, text: str, *, fast: bool = False) -> None:
    """人間風の入力。高速化フラグで delay を詰める。"""
    delay_min, delay_max = (20, 40) if fast else (40, 110)
    try:
        await locator.click()
    except Exception:
        pass
    try:
        await locator.fill("")
    except Exception:
        # 古いサイトで .fill に失敗する場合のフォールバック
        await locator.evaluate("el => { el.value=''; el.dispatchEvent(new Event('input', {bubbles:true})); }" )
    # Playwrightのtypeでdelayを掛ける
    try:
        await locator.type(str(text), delay=random.randint(delay_min, delay_max))
    except Exception:
        # 最後の手段
        await locator.evaluate(
            """(el, v) => {
                el.value = v;
                el.dispatchEvent(new Event('input', {bubbles:true}));
                el.dispatchEvent(new Event('change', {bubbles:true}));
            }""", str(text),
        )


async def focus_and_blur(locator: Locator) -> None:
    try:
        await locator.focus()
    except Exception:
        pass
    try:
        await locator.evaluate("el => el.dispatchEvent(new Event('blur', {bubbles:true}))")
    except Exception:
        pass


async def scroll_into_view(locator: Locator) -> None:
    try:
        await locator.scroll_into_view_if_needed(timeout=2000)
    except Exception:
        try:
            await locator.evaluate("el => el.scrollIntoView({behavior:'auto', block:'center'})")
        except Exception:
            pass


async def set_select_value(locator: Locator, value: str) -> None:
    try:
        await locator.select_option(value=str(value))
    except Exception:
        await locator.evaluate(
            """(el, v) => { 
                el.value = String(v); 
                el.dispatchEvent(new Event('input', {bubbles:true}));
                el.dispatchEvent(new Event('change', {bubbles:true})); 
            }""", str(value),
        )


async def check_checkbox(locator: Locator, desired: bool = True) -> None:
    try:
        if desired:
            await locator.check(force=True)
        else:
            await locator.uncheck(force=True)
    except Exception:
        await locator.evaluate(
            """(el, on) => {
                el.checked = !!on;
                el.dispatchEvent(new Event('input', {bubbles:true}));
                el.dispatchEvent(new Event('change', {bubbles:true}));
            }""", bool(desired),
        )
