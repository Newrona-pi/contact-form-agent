from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from playwright.async_api import Page

from .utils import normalize
from .selectors import extract_labels_bulk

_PLACEHOLDER_RE = re.compile(r"(選択してください|please select|choose|未選択)", re.I)


def _is_placeholder(text: str, value: str) -> bool:
    t = (text or "").strip()
    v = (value or "").strip()
    if v == "":
        return True
    return bool(_PLACEHOLDER_RE.search(t))


def _norm(s: Optional[str]) -> str:
    return normalize(s or "")


def _attr_text(field: Dict[str, Any]) -> str:
    parts = [
        field.get("name") or "",
        field.get("id") or "",
        field.get("class") or "",
        field.get("ariaLabel") or "",
        field.get("labelText") or "",
        field.get("placeholder") or "",
    ]
    return _norm(" ".join(parts))


async def _get_options(page: Page, selector: str) -> List[Tuple[str, str, bool]]:
    try:
        return await page.evaluate(
            """(sel) => {
                const el = document.querySelector(sel);
                if (!el) return [];
                const arr = [];
                for (const o of el.querySelectorAll('option')) {
                    arr.push([(o.textContent||'').trim(), (o.value||'').trim(), !!o.disabled]);
                }
                return arr;
            }""",
            selector,
        )
    except Exception:
        return []


def _classify_select(field: Dict[str, Any], options: List[Tuple[str, str, bool]]) -> str:
    attrs = _attr_text(field)
    if len(options) >= 20:
        return "prefecture"
    if re.search(r"(inquiry|category|question)", attrs, re.I):
        return "inquiry"
    if re.search(r"position", attrs, re.I):
        return "position"
    return "unknown"


_PREF_SUFFIX = re.compile(r"[都道府県]$")


def _get_pref_from_data(data: Dict[str, Any]) -> Optional[str]:
    keys = [
        "prefecture",
        "address_prefecture",
        "pref",
        "region",
        "state",
        "都道府県",
        "都道府県名",
    ]
    for k in keys:
        v = data.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def _best_pref_match(options: List[Tuple[str, str, bool]], pref: str) -> Optional[str]:
    """Prefecture picker: no fuzzy fallback; canonical exact/contains only."""
    def _canon_pref(s: str) -> str:
        t = _norm(s)
        t = re.sub(r"\s+", "", t)
        if not t:
            return ""
        if "北海道" in t:
            return "北海道"  # special-case
        return _PREF_SUFFIX.sub("", t)  # strip one trailing suffix

    target = _canon_pref(pref)
    if not target:
        return None

    # 1) exact canonical match (label/value)
    for text, value, disabled in options:
        if disabled or _is_placeholder(text, value):
            continue
        lab = (text or "").strip()
        val = (value or "").strip()
        if _canon_pref(lab) == target or _canon_pref(val) == target:
            return lab

    # 2) safe contains on canonical
    for text, value, disabled in options:
        if disabled or _is_placeholder(text, value):
            continue
        lab = (text or "").strip()
        val = (value or "").strip()
        if target in _canon_pref(lab) or target in _canon_pref(val):
            return lab

    return None


def _get_inquiry_phrase(data: Dict[str, Any]) -> Optional[str]:
    keys = ["inquiry_preference", "inquiry_intent", "inquiry", "subject", "category"]
    for k in keys:
        v = data.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def _bigrams(s: str) -> List[str]:
    s = f" {s} "
    return [s[i:i+2] for i in range(max(len(s)-1, 1))]


def _cosine_sim(a: List[str], b: List[str]) -> float:
    from collections import Counter
    ca, cb = Counter(a), Counter(b)
    common = set(ca) & set(cb)
    dot = sum(ca[x]*cb[x] for x in common)
    na = sum(v*v for v in ca.values()) ** 0.5
    nb = sum(v*v for v in cb.values()) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _score_inquiry_option(label: str, query: str) -> float:
    t = _norm(label)
    q = _norm(query)
    score = 0.0
    if t == q:
        score += 1.5
    if q in t:
        score += 1.0
    score += 0.9 * _cosine_sim(_bigrams(t), _bigrams(q))
    toks_t = set([x for x in re.split(r"[\s/・,、]+", t) if x])
    toks_q = set([x for x in re.split(r"[\s/・,、]+", q) if x])
    if toks_q:
        score += 0.6 * (len(toks_t & toks_q) / len(toks_q))
    score += min(len(label), 60) * 0.005
    return score


def _choose_inquiry(options: List[Tuple[str, str, bool]], phrase: str) -> Optional[str]:
    scored: List[Tuple[float, str]] = []
    for text, value, disabled in options:
        if disabled or _is_placeholder(text, value):
            continue
        s = _score_inquiry_option(text, phrase)
        if re.search(r"(解約|退会|請求|返金|キャンセル)", text):
            s -= 5.0
        scored.append((s, text.strip()))
    if not scored:
        return None
    scored.sort(reverse=True)
    best_s, best_label = scored[0]
    return best_label if best_s >= 1.2 else None


_JOB_RULES = [
    ("executive", [r"代表取締役|取締役|役員|経営者|ceo|cfo|coo|cto|cmo|社長"]),
    ("director",  [r"本部長|統括|事業部長|部長|ヘッド"]),
    ("manager",   [r"課長|マネージャ"]),
    ("junior_mgr",[r"係長|主任"]),
    ("specialist",[r"技術|エンジニア|デザイナ|アナリスト|研究|スペシャリスト"]),
    ("staff",     [r"一般|メンバー|担当|社員"]),
]


def _job_level_from_data(data: Dict[str, Any]) -> Optional[str]:
    src_keys = ["job_title", "position", "title", "役職"]
    src = ""
    for k in src_keys:
        v = data.get(k)
        if isinstance(v, str):
            src = v
            break
    t = _norm(src)
    if not t:
        return None
    for lvl, pats in _JOB_RULES:
        if any(re.search(p, t) for p in pats):
            if re.search(r"\bct[om]\b|ceo|cfo|coo", t):
                return "executive"
            return lvl
    return None


def _choose_job_option(options: List[Tuple[str, str, bool]], level: str) -> Optional[str]:
    mapping = {
        "executive": ["経営者", "役員", "取締役", "社長"],
        "director":  ["部長", "本部長", "事業部長"],
        "manager":   ["課長", "マネージャ"],
        "junior_mgr":["係長", "主任"],
        "specialist":["技術", "スペシャリスト", "エンジニア", "デザイナ", "専門"],
        "staff":     ["一般", "社員", "メンバー", "担当"],
    }
    for word in mapping.get(level, []):
        for text, value, disabled in options:
            if disabled or _is_placeholder(text, value):
                continue
            if _norm(word) in _norm(text):
                return text.strip()
    for text, value, disabled in options:
        if disabled or _is_placeholder(text, value):
            continue
        if re.search(r"(一般|その他)", text):
            return text.strip()
    return None


async def auto_select_all(page: Page, data: Dict[str, Any]) -> List[Dict[str, Any]]:
    logs: List[Dict[str, Any]] = []
    fields = await extract_labels_bulk(page, None)
    selects = [f for f in fields if str(f.get("tag", "")).lower() == "select" and f.get("selector")]
    for field in selects:
        selector = field["selector"]
        try:
            vis = await page.evaluate(
                "(sel)=>{const el=document.querySelector(sel); if(!el) return false; const r=el.getClientRects(); return !!(r && r.length>0) && window.getComputedStyle(el).visibility!=='hidden' && window.getComputedStyle(el).display!=='none'; }",
                selector,
            )
            if not vis:
                continue
        except Exception:
            pass

        options = await _get_options(page, selector)
        stype = _classify_select(field, options)
        if stype == "unknown":
            continue

        chosen_label: Optional[str] = None
        reason = ""
        if stype == "prefecture":
            pref = _get_pref_from_data(data)
            if pref:
                chosen_label = _best_pref_match(options, pref)
                reason = f"pref={pref}"
        elif stype == "inquiry":
            phrase = _get_inquiry_phrase(data)
            if phrase:
                chosen_label = _choose_inquiry(options, phrase)
                reason = f"phrase={phrase}"
        elif stype == "position":
            lvl = _job_level_from_data(data)
            if lvl:
                chosen_label = _choose_job_option(options, lvl)
                reason = f"level={lvl}"

        if not chosen_label:
            for text, value, disabled in options:
                if disabled or _is_placeholder(text, value):
                    continue
                if re.search(r"(その他|お問い合わせ|general|contact)", text, re.I):
                    chosen_label = text.strip()
                    reason = (reason + " fallback=other").strip()
                    break

        if chosen_label:
            try:
                # Try label first
                await page.select_option(selector, label=chosen_label)
            except Exception:
                # Fallback: resolve value by label and select by value
                try:
                    value = await page.evaluate("""(sel, lbl)=>{
                        const el=document.querySelector(sel); if(!el) return null;
                        const opt=[...el.options].find(o=>(o.textContent||'').trim()===lbl); return opt? (opt.value||null): null; }""", selector, chosen_label)
                    if value:
                        await page.select_option(selector, value=value)
                except Exception:
                    pass
                await page.evaluate(
                    """(sel, label) => {
                        const el = document.querySelector(sel); if(!el) return;
                        const opt = Array.from(el.options).find(o => (o.textContent||'').trim() === label);
                        if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', {bubbles:true})); }
                    }""",
                    selector,
                    chosen_label,
                )
            logs.append({"selector": selector, "type": stype, "chosen_label": chosen_label, "reason": reason})
    return logs


