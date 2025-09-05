from __future__ import annotations

import logging
import re
from typing import Any, Optional

from playwright.async_api import Page

logger = logging.getLogger(__name__)


from .constants import (
    RADIO_NEGATIVE_TOKENS, RADIO_MARKETING_TOKENS,
    RADIO_POSITIVE_TOKENS, RADIO_REQUIRED_ATTRS,
)

async def ensure_required_radio_groups(page: Page, *, logger: Optional[logging.Logger] = None) -> int:
    """
    必須ラジオグループで未選択のものを安全側で選択する。
    - required / aria-required / role=group[aria-required=true] 等をヒントに判定
    - yes/同意 系があればそれを優先、それ以外は最初の有効な選択肢
    戻り値: 選択を行ったグループ数
    """
    log = logger or globals().get("logger") or logging.getLogger(__name__)
    toggled = 0
    try:
        frames = [page] + list(page.frames)
        for fr in frames:
            try:
                radios = await fr.query_selector_all('input[type="radio"]:not([disabled])')
            except Exception:
                radios = []
            by_name = {}
            for r in radios:
                try:
                    nm = await r.get_attribute("name")
                    if not nm:
                        continue
                    by_name.setdefault(nm, []).append(r)
                except Exception:
                    continue
            for nm, group in by_name.items():
                # 既に選択済みならスキップ
                try:
                    if any([await g.is_checked() for g in group]):
                        continue
                except Exception:
                    pass
                # 必須っぽいか
                required_like = False
                try:
                    # name を持つ要素の中で required/aria-required を持つか
                    for g in group:
                        if (await g.get_attribute('required')) is not None:
                            required_like = True; break
                        ar = await g.get_attribute('aria-required')
                        if ar and ar.lower() in ("true","1"):
                            required_like = True; break
                    # fieldset/role=group に aria-required
                    if not required_like:
                        try:
                            ctx = await group[0].evaluate("""
                                (el) => {
                                  const fs = el.closest('fieldset,[role=group]');
                                  const reqAttr = (el.required ? 'required ' : '') + (el.getAttribute('aria-required') || '');
                                  let text = '';
                                  if (fs) {
                                    const lg = fs.querySelector('legend');
                                    if (lg) text += ' ' + (lg.innerText||'');
                                  }
                                  const lab = el.closest('label');
                                  if (lab) text += ' ' + (lab.innerText||'');
                                  const nearTh = el.closest('tr')?.querySelector('th')?.innerText || '';
                                  const nearDt = el.closest('dd')?.previousElementSibling?.innerText || '';
                                  return { text: (text + ' ' + nearTh + ' ' + nearDt).toLowerCase(), reqAttr: (reqAttr||'').toLowerCase() };
                                }
                            """)
                        except Exception:
                            ctx = {"text": "", "reqAttr": ""}
                        reqAttr = ctx.get("reqAttr") or ""
                        if any(attr in reqAttr for attr in RADIO_REQUIRED_ATTRS):
                            required_like = True
                except Exception:
                    pass
                # マーケ/購読系は（必須でない限り）触らない
                try:
                    group_text = ctx.get("text") if isinstance(ctx, dict) else ""
                except Exception:
                    group_text = ""
                if (not required_like) and any(tok in (group_text or "") for tok in RADIO_MARKETING_TOKENS):
                    continue
                # yes/同意 を優先
                prefer = None
                for r in group:
                    try:
                        label = await fr.evaluate("n => (n.closest('label') && n.closest('label').innerText) || ''", r)
                        val = (await r.get_attribute('value') or '').lower()
                        blob = ((label or '').lower() + ' ' + val)
                        if any(tok in blob for tok in RADIO_POSITIVE_TOKENS):
                            prefer = r
                            break
                    except Exception:
                        continue
                target = prefer or group[0]
                try:
                    await target.check(force=True)
                except Exception:
                    try:
                        rid = await target.get_attribute("id")
                        if rid:
                            lab = await fr.query_selector(f'label[for="{rid}"]')
                            if lab:
                                await lab.click(force=True)
                            else:
                                await target.evaluate("e => e.click()")
                        else:
                            await target.evaluate("e => e.click()")
                    except Exception:
                        await target.evaluate("""e => { e.checked = true; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }""")
                toggled += 1
    except Exception:
        pass
    try:
        if toggled:
            log.info(f"必須ラジオグループを {toggled} 件、選択しました")
    except Exception:
        pass
    return toggled

async def choose_second_option_in_form(page: Page, active_form_handle: Optional[Any] = None, *, logger: Optional[logging.Logger] = None) -> int:
    """
    単一選択<select>で未選択（先頭が空/disabled）の場合、2番目以降の最初の有効な選択肢を選ぶ。
    - active_form_handle が与えられた場合はその配下を優先。
    戻り値: 変更した<select>の件数
    """
    log = logger or globals().get("logger") or logging.getLogger(__name__)
    try:
        base = active_form_handle or (await page.query_selector('form')) or page
    except Exception:
        base = page

    changed = 0
    try:
        selects = await base.query_selector_all('select:not([multiple]):not([disabled])')
    except Exception:
        selects = []

    for sel in selects:
        try:
            state = await sel.evaluate("""el => ({
                selectedIndex: el.selectedIndex,
                values: Array.from(el.options).map(o => ({value: (o.value||'').trim(), disabled: !!o.disabled}))
            })""")
            if state["selectedIndex"] and state["selectedIndex"] > 0:
                continue
            vals = state["values"]
            if len(vals) <= 1:
                continue
            idx = 1
            if vals[1]["disabled"] or vals[1]["value"] == "":
                idx = -1
                for i in range(2, len(vals)):
                    if not vals[i]["disabled"] and vals[i]["value"] != "":
                        idx = i
                        break
                if idx == -1:
                    continue
            try:
                await sel.select_option(index=idx)
                changed += 1
            except Exception:
                try:
                    await sel.evaluate(
                        """
                        (el, i) => {
                            if (!el || !el.options || !el.options[i]) return;
                            el.selectedIndex = i;
                            el.dispatchEvent(new Event('input',  {bubbles:true}));
                            el.dispatchEvent(new Event('change', {bubbles:true}));
                            const dd = el.closest('.ui.dropdown');
                            if (dd) {
                                const val = el.options[i].value;
                                const item = dd.querySelector('.menu .item[data-value="'+val+'"]');
                                if (item) item.click();
                            }
                        }
                        """, idx,
                    )
                    changed += 1
                except Exception:
                    pass
        except Exception:
            continue

    if changed:
        try:
            log.info(f"選択式リストを {changed} 件、2番目に設定しました")
        except Exception:
            pass
    return changed


async def try_check_any_non_consent_checkbox(page: Page, *, logger: Optional[logging.Logger] = None, debug: bool = False) -> bool:
    """
    同意（agree/consent/privacy/規約 等）以外のチェックボックスに、最低1つチェックを入れる。
    - 対象: input[type=checkbox]:not([disabled])
    - 除外ワード: 同意/承諾/プライバシー/個人情報/利用規約/規約/privacy/consent/agree/policy/terms
    - 優先ワード: カテゴリ/カテゴリー/種別/種類/件名/ご用件/subject/category/type/topic
    戻り値: 何か1つでもONにできたら True
    """
    log = logger or globals().get("logger") or logging.getLogger(__name__)
    deny_pat = re.compile(r"(同意|承諾|プライバシー|個人情報|利用規約|規約|privacy|consent|agree|policy|terms)", re.I)
    prefer_pat = re.compile(r"(カテゴリ|カテゴリー|種別|種類|件名|ご用件|subject|category|type|topic)", re.I)

    async def _label_text(fr, el):
        # 1) label[for=id]
        try:
            el_id = await el.get_attribute("id")
            if el_id:
                lab = await fr.query_selector(f'label[for="{el_id}"]')
                if lab:
                    txt = await lab.inner_text()
                    if txt:
                        return txt.strip()
        except Exception:
            pass
        # 2) 祖先<label>
        try:
            txt = await el.evaluate("n => (n.closest('label') && n.closest('label').innerText) || ''")
            if txt:
                return txt.strip()
        except Exception:
            pass
        # 3) CF7等の <dl><dt>…</dt><dd>…<input/></dd>
        try:
            txt = await el.evaluate("""n => {
                const dd = n.closest('dd');
                if (dd && dd.previousElementSibling && dd.previousElementSibling.tagName.toLowerCase()==='dt') {
                    return dd.previousElementSibling.innerText.trim();
                }
                return '';
            }""")
            if txt:
                return txt.strip()
        except Exception:
            pass
        # 4) aria-labelledby
        try:
            txt = await el.evaluate("""n => {
                const ids = (n.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
                let out = [];
                for (const id of ids){
                    const t = document.getElementById(id);
                    if (t) out.push(t.innerText.trim());
                }
                return out.join(' ').trim();
            }""")
            if txt:
                return txt.strip()
        except Exception:
            pass
        # 5) 近傍テキスト（親の中の先頭テキスト）
        try:
            txt = await el.evaluate("""n => {
                const p = n.parentElement;
                if (!p) return '';
                const text = p.innerText || '';
                return text.trim().slice(0,64);
            }""")
            if txt:
                return txt.strip()
        except Exception:
            pass
        # 6) 直前の兄弟要素（と親の直前兄弟）
        try:
            txt = await el.evaluate("""(n) => {
                function labelish(e){
                    if (!e) return '';
                    if (e.querySelector('input,textarea,select,button')) return '';
                    const t = (e.innerText||'').trim();
                    return t && t.length <= 80 ? t : '';
                }
                // 直前の兄弟
                let s = n.previousElementSibling;
                for (let i=0;i<3 && s;i++, s = s.previousElementSibling) {
                    const t = labelish(s); if (t) return t;
                }
                // 親の直前兄弟
                const p = n.parentElement;
                if (p) {
                    let s2 = p.previousElementSibling;
                    for (let i=0;i<3 && s2;i++, s2 = s2.previousElementSibling) {
                        const t = labelish(s2); if (t) return t;
                    }
                }
                return '';
            }""")
            if txt:
                return txt.strip()
        except Exception:
            pass
        return ""

    try:
        frames = [page] + list(page.frames)
        candidates = []
        for fr in frames:
            try:
                cbs = await fr.query_selector_all('input[type="checkbox"]:not([disabled])')
            except Exception:
                continue
            for cb in cbs:
                try:
                    # 既にチェック済みならスキップ
                    try:
                        if await cb.is_checked():
                            continue
                    except Exception:
                        pass
                    name = (await cb.get_attribute("name") or "")
                    idv  = (await cb.get_attribute("id") or "")
                    cls  = (await cb.get_attribute("class") or "")
                    label = await _label_text(fr, cb)
                    blob = " ".join([name, idv, cls, label]).lower()
                    # 同意系は除外
                    if deny_pat.search(blob):
                        continue
                    prefer = bool(prefer_pat.search(blob))
                    candidates.append((prefer, fr, cb, label or name or idv or "(no label)"))
                except Exception:
                    continue

        if not candidates:
            return False

        candidates.sort(key=lambda t: (not t[0]))  # prefer=True を先に

        for prefer, fr, cb, label in candidates:
            try:
                # check(force=True) + イベント発火
                try:
                    await cb.check(force=True)
                except Exception:
                    # ラベルクリックで代替
                    try:
                        el_id = await cb.get_attribute("id")
                        if el_id:
                            lab = await fr.query_selector(f'label[for="{el_id}"]')
                            if lab:
                                await lab.click(force=True)
                            else:
                                await cb.evaluate("el => el.click()")
                        else:
                            await cb.evaluate("el => el.click()")
                    except Exception:
                        # 最終手段：checked=TRUE + input/change
                        await cb.evaluate("""el => {
                            el.checked = true;
                            el.dispatchEvent(new Event('input', {bubbles:true}));
                            el.dispatchEvent(new Event('change', {bubbles:true}));
                        }""")
                # 確認
                try:
                    if await cb.is_checked():
                        log.info(f"任意チェックボックスを選択: {label}")
                        return True
                except Exception:
                    log.info(f"任意チェックボックスを選択（状態未確認）: {label}")
                    return True
            except Exception:
                continue
        return False
    except Exception as e:
        if debug or (logger and logger.isEnabledFor(logging.DEBUG)):
            log.debug(f"非同意チェックボックス処理エラー: {e}")
        return False


async def ensure_acceptance(page: Page, *, logger: Optional[logging.Logger] = None, debug: bool = False) -> bool:
    """
    同意/規約/プライバシー等の同意系チェック/ラジオをONにする。
    戻り値: 何か1つでもONにできたら True
    """
    log = logger or globals().get("logger") or logging.getLogger(__name__)
    consent_kw = re.compile(r"(同意|承諾|プライバシー|個人情報|利用規約|規約|privacy|consent|agree|policy|terms)", re.I)
    prefer_yes_kw = re.compile(r"(同意する|はい|agree|accept|yes)", re.I)

    async def _label_text(fr, el):
        # label[for=id]
        try:
            el_id = await el.get_attribute("id")
            if el_id:
                lab = await fr.query_selector(f'label[for="{el_id}"]')
                if lab:
                    t = (await lab.inner_text() or "").strip()
                    if t:
                        return t
        except Exception:
            pass
        # 祖先<label>
        try:
            t = await el.evaluate("n => (n.closest('label') && n.closest('label').innerText) || ''")
            if t:
                return t.strip()
        except Exception:
            pass
        # CF7の<dl><dt>…</dt><dd>…</dd>
        try:
            t = await el.evaluate("""n => {
                const dd = n.closest('dd');
                if (dd && dd.previousElementSibling && dd.previousElementSibling.tagName.toLowerCase()==='dt') {
                    return dd.previousElementSibling.innerText.trim();
                }
                return '';
            }""")
            if t:
                return t.strip()
        except Exception:
            pass
        # aria-labelledby
        try:
            t = await el.evaluate("""n => {
                const ids = (n.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
                let out = [];
                for (const id of ids){
                    const t = document.getElementById(id);
                    if (t) out.push(t.innerText.trim());
                }
                return out.join(' ').trim();
            }""")
            if t:
                return t.strip()
        except Exception:
            pass
        # 近傍
        try:
            t = await el.evaluate("n => (n.parentElement && n.parentElement.innerText || '').trim().slice(0,64)")
            if t:
                return t.strip()
        except Exception:
            pass
        # 直前の兄弟/親の直前兄弟
        try:
            t = await el.evaluate("""(n) => {
                function labelish(e){
                    if (!e) return '';
                    if (e.querySelector('input,textarea,select,button')) return '';
                    const t = (e.innerText||'').trim();
                    return t && t.length <= 80 ? t : '';
                }
                // 直前の兄弟
                let s = n.previousElementSibling;
                for (let i=0;i<3 && s;i++, s = s.previousElementSibling) {
                    const t = labelish(s); if (t) return t;
                }
                // 親の直前兄弟
                const p = n.parentElement;
                if (p) {
                    let s2 = p.previousElementSibling;
                    for (let i=0;i<3 && s2;i++, s2 = s2.previousElementSibling) {
                        const t = labelish(s2); if (t) return t;
                    }
                }
                return '';
            }""")
            if t:
                return t.strip()
        except Exception:
            pass
        return ""

    toggled = False
    frames = [page] + list(page.frames)
    # 1) ピンポイント探索
    css_targets = [
        'input#wpcf7-acceptance',
        '.wpcf7-acceptance input[type="checkbox"]',
        'input#agree', 'input[name*="agree" i]', 'input[class*="agree" i]',
        'input[name*="consent" i]', 'input[class*="consent" i]',
        'input[name*="privacy" i]', 'input[class*="privacy" i]',
        'input[name*="policy" i]',  'input[class*="policy" i]',
        'input[name*="terms" i]',   'input[class*="terms" i]',
        'input[type="checkbox"][aria-label*="同意"]',
    ]
    try:
        for fr in frames:
            found = False
            for sel in css_targets:
                try:
                    elems = await fr.query_selector_all(sel)
                except Exception:
                    elems = []
                for el in elems:
                    try:
                        if await el.is_disabled():
                            continue
                    except Exception:
                        pass
                    try:
                        await el.check(force=True)
                    except Exception:
                        try:
                            el_id = await el.get_attribute("id")
                            if el_id:
                                lab = await fr.query_selector(f'label[for="{el_id}"]')
                                if lab:
                                    await lab.click(force=True)
                                else:
                                    await el.evaluate("e => e.click()")
                            else:
                                await el.evaluate("e => e.click()")
                        except Exception:
                            await el.evaluate("""e => {
                                e.checked = true;
                                e.dispatchEvent(new Event('input', {bubbles:true}));
                                e.dispatchEvent(new Event('change', {bubbles:true}));
                            }""")
                    # 確認
                    try:
                        if hasattr(el, "is_checked") and await el.is_checked():
                            found = True
                            toggled = True
                            break
                    except Exception:
                        found = True
                        toggled = True
                        break
                if found:
                    break
            if found:
                break
    except Exception:
        pass

    # 2) 走査して判定
    if not toggled:
        for fr in frames:
            try:
                elems = await fr.query_selector_all('input[type="checkbox"]:not([disabled])')
            except Exception:
                continue
            for el in elems:
                try:
                    name = (await el.get_attribute("name") or "")
                    idv  = (await el.get_attribute("id") or "")
                    cls  = (await el.get_attribute("class") or "")
                    txt  = await _label_text(fr, el)
                    blob = " ".join([name, idv, cls, txt]).lower()
                    if not consent_kw.search(blob):
                        continue
                    try:
                        await el.check(force=True)
                    except Exception:
                        try:
                            el_id = await el.get_attribute("id")
                            if el_id:
                                lab = await fr.query_selector(f'label[for="{el_id}"]')
                                if lab:
                                    await lab.click(force=True)
                                else:
                                    await el.evaluate("e => e.click()")
                            else:
                                await el.evaluate("e => e.click()")
                        except Exception:
                            await el.evaluate("""e => {
                                e.checked = true;
                                e.dispatchEvent(new Event('input', {bubbles:true}));
                                e.dispatchEvent(new Event('change', {bubbles:true}));
                            }""")
                    toggled = True
                    break
                except Exception:
                    continue
            if toggled:
                break

    # 3) ラジオ yes 系
    if not toggled:
        for fr in frames:
            try:
                radios = await fr.query_selector_all('input[type="radio"]:not([disabled])')
            except Exception:
                radios = []
            by_name = {}
            for r in radios:
                try:
                    nm = await r.get_attribute("name")
                    if not nm:
                        continue
                    by_name.setdefault(nm, []).append(r)
                except Exception:
                    continue
            for nm, group in by_name.items():
                group_blob = nm.lower()
                any_label = ""
                for r in group:
                    try:
                        any_label += " " + (await _label_text(fr, r))
                    except Exception:
                        pass
                if consent_kw.search(group_blob + " " + any_label.lower()):
                    chosen = None
                    for r in group:
                        try:
                            t = (await _label_text(fr, r)).lower()
                            val = (await r.get_attribute("value") or "").lower()
                            if prefer_yes_kw.search(t) or prefer_yes_kw.search(val):
                                chosen = r
                                break
                        except Exception:
                            continue
                    if not chosen:
                        chosen = group[0]
                    try:
                        await chosen.check(force=True)
                    except Exception:
                        try:
                            rid = await chosen.get_attribute("id")
                            if rid:
                                lab = await fr.query_selector(f'label[for="{rid}"]')
                                if lab:
                                    await lab.click(force=True)
                                else:
                                    await chosen.evaluate("e => e.click()")
                            else:
                                await chosen.evaluate("e => e.click()")
                        except Exception:
                            await chosen.evaluate("""e => {
                                e.checked = true;
                                e.dispatchEvent(new Event('input', {bubbles:true}));
                                e.dispatchEvent(new Event('change', {bubbles:true}));
                            }""")
                    toggled = True
                    break
            if toggled:
                break

    if toggled:
        try:
            log.info("同意チェックを自動ON")
        except Exception:
            pass
    return toggled
