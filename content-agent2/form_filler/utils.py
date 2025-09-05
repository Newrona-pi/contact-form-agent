from __future__ import annotations

import re
import unicodedata

__all__ = ["normalize", "css_escape", "split_name", "split_phone"]


# ------------------------------
# Text normalization
# ------------------------------
_ZERO_WIDTH = re.compile(r"[\u200B-\u200D\uFEFF]")
_WS = re.compile(r"\s+")


def normalize(s: str | None) -> str:
    """Unicode NFKC正規化 + 小文字化 + 余分な空白/不可視文字の除去。
    - None/空値は空文字にする
    - NBSP/全角スペースを半角スペースへ揃える
    - ゼロ幅文字(BOM/ZWSP/ZWNJ/ZWJ)を除去
    """
    if not s:
        return ""
    t = unicodedata.normalize("NFKC", str(s))
    t = t.replace("\u00A0", " ").replace("\u3000", " ")
    t = _ZERO_WIDTH.sub("", t)
    t = t.strip().lower()
    return t


# ------------------------------
# CSS selector escaping
# ------------------------------
def css_escape(s: str | None) -> str:
    """CSS.escape相当の簡易版。
    - 英数/ハイフン/アンダースコア以外は \ を付与
    - 先頭が数字の場合は '\\3HEX ' 形式でエスケープ（ブラウザ互換性）
    - スペースは '\\ ' にする
    参考: https://www.w3.org/TR/cssom-1/#serialize-an-identifier
    """
    if not s:
        return ""
    out: list[str] = []
    for i, ch in enumerate(str(s)):
        code = ord(ch)
        # 安全文字
        if ("0" <= ch <= "9") or ("A" <= ch <= "Z") or ("a" <= ch <= "z") or ch in "-_":
            # 先頭が数字は特殊エスケープ
            if i == 0 and "0" <= ch <= "9":
                out.append(f"\\3{code:X} ")
            else:
                out.append(ch)
            continue
        if ch == " ":
            out.append("\\ ")
            continue
        # 制御文字やその他は単純バックスラッシュ + HEX
        if code < 0x20 or code == 0x7F:
            out.append(f"\\{code:02X} ")
        else:
            out.append("\\" + ch)
    return "".join(out)


# ------------------------------
# Human name heuristics
# ------------------------------
def split_name(full: str | None) -> tuple[str, str]:
    """氏名を姓・名に分割（汎用）
    - 「山田 太郎」「山田　太郎」「Yamada Taro」「山田・太郎」「山田、太郎」に対応
    - 区切り文字が無ければ (s, "") を返す（安全側）
    """
    if not full or not str(full).strip():
        return "", ""
    s = str(full).replace("　", " ").strip()
    # 区切り候補
    for sep in [" ", "　", "・", "、", ","]:
        if sep in s:
            parts = [p for p in s.split(sep) if p != ""]
            if len(parts) >= 2:
                return parts[0].strip(), sep.join(parts[1:]).strip()
    # 区切りがない場合は安全にフルを姓扱い
    return s, ""


# ------------------------------
# Phone splitting heuristics
# ------------------------------
_MOBILE_PREFIX = ("070", "080", "090")


def split_phone(phone: str | None) -> tuple[str, str, str]:
    """電話番号を3分割（日本向けの簡易ヒューリスティック）。
    - '+81' 始まりは '0' 始まりへ変換
    - 11桁の携帯(070/080/090)は 3-4-4
    - 10桁は 2-4-4（03/06など市外局番2桁のケースを優先）
    - それ以外は 3分割の近似
    """
    if not phone:
        return "", "", ""
    raw = str(phone).strip()
    # 国番号 +81 の扱い
    if raw.startswith("+81"):
        digits = "0" + re.sub(r"\D", "", raw)[2:]
    else:
        digits = re.sub(r"\D", "", raw)

    if len(digits) == 11 and digits.startswith(_MOBILE_PREFIX):
        return digits[:3], digits[3:7], digits[7:]
    if len(digits) == 10:
        # 東京(03)・大阪(06)など
        if digits.startswith(("03", "06")):
            return digits[:2], digits[2:6], digits[6:]
        # それ以外は 3-3-4 と迷うが、誤入力を減らすため 2-4-4 を既定に
        return digits[:2], digits[2:6], digits[6:]
    if len(digits) >= 6:
        first = digits[:3] if len(digits) >= 7 else digits[:2]
        rest = digits[len(first):]
        if len(rest) >= 2:
            mid_len = len(rest) // 2
            return first, rest[:mid_len], rest[mid_len:]
        return first, rest, ""
    return digits, "", ""
