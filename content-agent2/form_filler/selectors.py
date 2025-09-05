from __future__ import annotations

from bs4 import BeautifulSoup, Tag
from .utils import css_escape, normalize


def selector_for(el: Tag) -> str:
    """Tagから安定CSSセレクタを生成"""
    if not isinstance(el, Tag):
        raise TypeError(f"Expected Tag, got {type(el)}")
    if (idv := el.get("id")):
        return f"#{css_escape(idv)}"
    if (name := el.get("name")):
        return f'{el.name}[name="{css_escape(name)}"]'
    if (al := el.get("aria-label")):
        return f'{el.name}[aria-label="{css_escape(al)}"]'
    if (ph := el.get("placeholder")):
        return f'{el.name}[placeholder="{css_escape(ph)}"]'
    idx = 1 + sum(1 for sib in el.previous_siblings if getattr(sib, "name", None) == el.name)
    return f"{el.name}:nth-of-type({idx})"


async def selector_for_locator(el) -> str:
    """Playwright Locator/ElementHandle から安定CSSセレクタを生成（バグ修正: ElementHandleに対してawaitしない）"""
    try:
        # Locator なら element_handle() を await、ElementHandle ならそのまま使う
        if hasattr(el, "element_handle"):
            eh = await el.element_handle()
        else:
            eh = el  # ElementHandle のはず

        tag = (await eh.evaluate("e => e.tagName.toLowerCase()")) or ""
        tag = tag.strip() or "input"

        _id = await eh.get_attribute("id")
        if _id:
            return f"#{css_escape(_id)}"

        name = await eh.get_attribute("name")
        if name:
            return f'{tag}[name="{css_escape(name)}"]'

        al = await eh.get_attribute("aria-label")
        if al:
            return f'{tag}[aria-label="{css_escape(al)}"]'

        ph = await eh.get_attribute("placeholder")
        if ph:
            return f'{tag}[placeholder="{css_escape(ph)}"]'

        idx = await eh.evaluate(
            """
            e => {
              const p = e.parentNode; if (!p) return 1;
              const list = p.querySelectorAll(e.tagName);
              return 1 + Array.from(list || []).indexOf(e);
            }
            """
        )
        try:
            idx = int(idx) if idx is not None else 1
        except Exception:
            idx = 1
        return f"{tag}:nth-of-type({idx})"
    except Exception:
        # 可能な限りタグでフォールバック
        try:
            if hasattr(el, "evaluate"):
                tag = (await el.evaluate("e => e.tagName.toLowerCase()")) or "input"
            else:
                tag = "input"
            return tag
        except Exception:
            return "input"


async def get_label_text_for_locator(frame, locator) -> str:
    """Locator から関連ラベルテキストを推定して返す（frameは互換用引数）"""
    try:
        return (await locator.evaluate("""n => {
            const byFor = (() => {
                const id=n.getAttribute('id'); if(!id) return '';
                const l=document.querySelector(`label[for="${id}"]`);
                return l ? l.innerText.trim() : '';
            })();
            if (byFor) return byFor;
            const wrap = n.closest('label'); if (wrap) return wrap.innerText.trim();
            const dd = n.closest('dd'); if (dd && dd.previousElementSibling && dd.previousElementSibling.tagName.toLowerCase()==='dt') return dd.previousElementSibling.innerText.trim();
            const ids=(n.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
            const al = ids.map(id=>document.getElementById(id)?.innerText.trim()||'').filter(Boolean).join(' ');
            if (al) return al;
            const fs = n.closest('fieldset'); if (fs){ const lg=fs.querySelector('legend'); if(lg) return lg.innerText.trim(); }
            let s=n.previousElementSibling; for(let i=0;i<3 && s;i++,s=s.previousElementSibling){ const t=(s.innerText||'').trim(); if(t && !s.querySelector('input,textarea,select,button')) return t.slice(0,64); }
            const p = n.parentElement; if(p){ let s2=p.previousElementSibling; for(let i=0;i<3 && s2;i++,s2=s2.previousElementSibling){ const t=(s2.innerText||'').trim(); if(t && !s2.querySelector('input,textarea,select,button')) return t.slice(0,64); } }
            return (n.parentElement?.innerText||'').trim().slice(0,64);
        }""")) or ""
    except Exception:
        return ""


def extract_label_text(el: Tag, soup: BeautifulSoup) -> str:
    """BeautifulSoup上で要素に関連するラベルテキストを抽出（既存互換）。"""
    if not isinstance(el, Tag):
        raise TypeError(f"Expected Tag, got {type(el)}")

    if (idval := el.get("id")):
        for label in soup.find_all("label", attrs={"for": idval}):
            return normalize(label.get_text(" "))

    parent = el.parent
    while parent:
        if parent.name == "label":
            return normalize(parent.get_text(" "))
        parent = parent.parent

    if (aria_ids := el.get("aria-labelledby", "").split()):
        texts = []
        for aid in aria_ids:
            for elem in soup.find_all(attrs={"id": aid}):
                texts.append(elem.get_text(" ").strip())
        if texts:
            return normalize(" ".join(texts))

    parent = el.parent
    while parent:
        if parent.name == "fieldset":
            if legend := parent.find("legend"):
                return normalize(legend.get_text(" "))
        parent = parent.parent

    parent = el.parent
    while parent:
        if parent.get("class"):
            classes = " ".join(parent.get("class"))
            if any(c in classes for c in ["form-group", "field", "hs-form-field"]):
                text = parent.get_text(" ").strip()
                if text:
                    return normalize(text[:64])
        parent = parent.parent

    sib = el.previous_sibling
    while sib and (getattr(sib, "name", None) in [None, "br"] or (getattr(sib, "get_text", None) and not sib.get_text(strip=True))):
        sib = getattr(sib, "previous_sibling", None)

    if getattr(sib, 'name', None) in ("p","div","dt","th","label","span","strong"):
        t = sib.get_text(" ", strip=True)
        if t:
            return normalize(t[:64])

    par = el.parent
    if par:
        sib = par.previous_sibling
        while sib and (getattr(sib, "name", None) in [None, "br"] or (getattr(sib, "get_text", None) and not sib.get_text(strip=True))):
            sib = getattr(sib, "previous_sibling", None)
        if getattr(sib, 'name', None) in ("p","div","dt","th","label","span","strong"):
            t = sib.get_text(" ", strip=True)
            if t:
                return normalize(t[:64])

    return ""

# ========================
# 一括ラベル抽出（企業フォーム限定スコープに対応）
# ========================

async def extract_labels_bulk(page, scope_selector: str | None = None) -> list[dict]:
    """
    入力要素とラベルのペアを一括抽出（frameも横断）。scope_selector を渡すと、その配下だけに限定。

    取得フィールド（従来＋追加）:
      - 従来: tag, type, name, id, class, placeholder, ariaLabel, labelText, visible, selector
      - 追加: autocomplete, required(bool), pattern, maxlength(int|""), ariaLabelledby, ariaDescribedby, role,
              rect({x,y,width,height}), frameUrl
    戻り値: List[dict]
    """
    js = """
    (scopeSel) => {
      const root = scopeSel ? document.querySelector(scopeSel) : document;
      const toText = (s) => (s || "").replace(/\\s+/g, " ").trim();
      const toInt  = (s) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : ""; };
      const nodes = Array.from((root || document).querySelectorAll("input, textarea, select, button[type=submit]"));
      const items = [];
      for (const el of nodes) {
        const tag = (el.tagName || "").toLowerCase();
        const type = (el.getAttribute("type") || "").toLowerCase();
        const name = toText(el.getAttribute("name"));
        const id   = toText(el.getAttribute("id"));
        const cls  = toText(el.getAttribute("class"));
        const ph   = toText(el.getAttribute("placeholder"));
        const aria = toText(el.getAttribute("aria-label"));
        const ac   = toText(el.getAttribute("autocomplete"));
        const req  = el.hasAttribute("required");
        const pat  = toText(el.getAttribute("pattern"));
        const mxl  = toText(el.getAttribute("maxlength"));
        const ariaLb = toText(el.getAttribute("aria-labelledby"));
        const ariaDb = toText(el.getAttribute("aria-describedby"));
        const role = toText(el.getAttribute("role"));
        const rectObj = (() => {
          try {
            const r = el.getBoundingClientRect();
            return { x: (r.x ?? r.left ?? 0), y: (r.y ?? r.top ?? 0), width: (r.width ?? 0), height: (r.height ?? 0) };
          } catch (_) { return { x:0, y:0, width:0, height:0 }; }
        })();
        const visible = (() => {
          const r = el.getClientRects();
          if (!r || r.length === 0) return false;
          let n = el;
          while (n && n.nodeType === 1) {
            const cs = getComputedStyle(n);
            if (n.hasAttribute("hidden") || cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity || "1") === 0) return false;
            n = n.parentElement;
          }
          return true;
        })();
        let labelText = "";
        try {
          const forId = el.getAttribute("id");
          if (forId) {
            const lbl = (root || document).querySelector(`label[for="${CSS.escape(forId)}"]`);
            if (lbl) labelText = toText(lbl.textContent || "");
          }
          if (!labelText) {
            const wrap = el.closest("label");
            if (wrap) labelText = toText(wrap.textContent || "");
          }
          if (!labelText) {
            // <dl><dt>…</dt><dd><input/></dd> やテーブルの見出しも拾う
            const dd = el.closest("dd");
            const dt = dd && dd.previousElementSibling && dd.previousElementSibling.tagName.toLowerCase()==="dt" ? dd.previousElementSibling : null;
            if (dt) labelText = toText(dt.textContent || "");
          }
          if (!labelText) {
            const th = el.closest("tr")?.querySelector("th");
            if (th) labelText = toText(th.textContent || "");
          }
        } catch (_) {}
        items.push({
          tag, type, name, id, "class": cls, placeholder: ph, ariaLabel: aria, labelText, visible,
          autocomplete: ac, required: req, pattern: pat, maxlength: toInt(mxl),
          ariaLabelledby: ariaLb, ariaDescribedby: ariaDb, role,
          rect: rectObj,
          selector: (() => {
            try {
              if (id) return `#${CSS.escape(id)}`;
              const path = [];
              let cur = el;
              while (cur && cur.nodeType === 1 && cur !== (root || document)) {
                const tn = cur.tagName.toLowerCase();
                let nth = 1, sib = cur;
                while ((sib = sib.previousElementSibling)) if ((sib.tagName || "").toLowerCase() === tn) nth++;
                path.unshift(`${tn}:nth-of-type(${nth})`);
                cur = cur.parentElement;
              }
              return path.join(" > ");
            } catch (_) { return ""; }
          })(),
          frameUrl: (document && document.location ? String(document.location.href) : "")
        });
      }
      return items;
    }
    """
    # 1) ページ直下
    results = await page.evaluate(js, scope_selector)
    # 2) すべての iframe
    for fr in page.frames:
        if fr == page.main_frame:
            continue
        try:
            part = await fr.evaluate(js, scope_selector)
            if isinstance(part, list):
                results.extend(part)
        except Exception:
            pass
    return results


async def fallback_fill_textarea(page, text: str, dry_run: bool = False, scope_selector: str | None = None):
    """
    ラベルなし/無名の textarea に救済入力（1個だけ）。scope 指定時は配下限定。
    """
    js = r"""
    (sc) => {
      const root = sc ? document.querySelector(sc) : document;
      if (!root) return null;
      const list = Array.from(root.querySelectorAll('textarea')).filter(t => {
        const nm = t.getAttribute('name') || '';
        return !nm || /message|inquiry|detail|お問い合わせ|内容/.test(nm);
      });
      return list.length ? (() => {
        const t = list[0];
        const sel = (() => {
          if (t.id) return '#'+CSS.escape(t.id);
          const parts=[]; for (let n=t; n && n.nodeType===1 && n!==document; n=n.parentElement) {
            if (n.id) { parts.unshift('#'+CSS.escape(n.id)); break; }
            const tn=n.tagName.toLowerCase(); let i=1,s=n;
            while ((s=s.previousElementSibling)) if (s.tagName && s.tagName.toLowerCase()===tn) i++;
            parts.unshift(`${tn}:nth-of-type(${i})`);
          } return parts.join(' > ');
        })();
        return sel;
      })() : null;
    }
    """
    sel = await page.evaluate(js, scope_selector)
    if not sel:
        return
    # 可視性チェック（非表示は書き込まない）
    is_visible = await page.evaluate(
        "(sel)=>{const el=document.querySelector(sel); if(!el) return false; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity||'1')===0) return false; const r=el.getClientRects(); return r && r.length>0; }",
        sel
    )
    if not is_visible:
        return
    # dry-run でも page.fill を使う（evaluate 直書きはしない）
    await page.fill(sel, text)


async def fallback_select_defaults(page, scope_selector: str | None = None):
    """
    単独 select がある場合に第2候補などを既定設定。scope 指定時は配下限定。
    """
    js = r"""
    (sc) => {
      const root = sc ? document.querySelector(sc) : document;
      if (!root) return [];
      const sels = Array.from(root.querySelectorAll('select'));
      const targets = sels.filter(s => s.options && s.options.length >= 2);
      return targets.map(s => {
        const sel = (() => {
          if (s.id) return '#'+CSS.escape(s.id);
          const parts=[]; for (let n=s; n && n.nodeType===1 && n!==document; n=n.parentElement) {
            if (n.id) { parts.unshift('#'+CSS.escape(n.id)); break; }
            const tn=n.tagName.toLowerCase(); let i=1,x=n;
            while ((x=x.previousElementSibling)) if (x.tagName && x.tagName.toLowerCase()===tn) i++;
            parts.unshift(`${tn}:nth-of-type(${i})`);
          } return parts.join(' > ');
        })();
        return sel;
      });
    }
    """
    sels = await page.evaluate(js, scope_selector)
    for sel in sels[:1]:
        # 非表示 select は対象外
        vis = await page.evaluate(
            "(sel)=>{const el=document.querySelector(sel); if(!el) return false; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity||'1')===0) return false; const r=el.getClientRects(); return r && r.length>0; }",
            sel
        )
        if not vis:
            continue
        try:
            # 2番目の option を選択
            await page.select_option(sel, index=1)
        except Exception:
            # 非標準 select はテキスト入力フォールバック
            txt = await page.evaluate("(sel) => { const s=document.querySelector(sel); if(!s) return null; const o=s.options[1]; return o ? (o.value || o.textContent || '') : null; }", sel)
            if txt:
                await page.fill(sel, txt)
