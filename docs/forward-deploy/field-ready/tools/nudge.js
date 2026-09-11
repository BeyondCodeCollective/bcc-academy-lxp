/* ===========================================================================
   NUDGE — move anything on a slide with the mouse, get the CSS back.

   A build tool, not a feature. Paste it into a deck (or run it as a
   bookmarklet on one that already exists), press d, drag things until they
   look right, press c, and paste the copied CSS into the stylesheet. Then
   delete this file from the deck before it ships.

   Why it exists: clamp() values are impossible to guess from a screenshot,
   and a round trip through a screenshot to ask "a bit more left?" costs more
   than just moving the thing.

   d          toggle nudge mode
   click      select the element under the cursor
   drag       move it
   wheel      resize it            (shift+wheel: type size only)
   arrows     nudge 1px            (shift: 10px)
   [ ]        rotate a degree
   p          select the parent instead
   0          reset the selected element
   c          copy the CSS for everything you have moved
   esc        deselect
   =========================================================================== */
(() => {
  if (window.__nudge) { window.__nudge.toggle(); return; }

  const ROOTS = '.slide, .deck, main, body';   // where selectable things live
  const UI = 'data-nudge-ui';
  const state = new Map();                     // element -> {dx,dy,scale,rot,fs}
  let on = false, sel = null, drag = null;

  /* ── chrome ──────────────────────────────────────────────────────────── */
  const css = document.createElement('style');
  css.setAttribute(UI, '');
  css.textContent = `
    body.nudge-on *{pointer-events:auto!important}
    body.nudge-on [${UI}]{pointer-events:auto!important}
    .nudge-hi{outline:2px dashed rgba(0,120,255,.65)!important;outline-offset:3px!important;cursor:grab!important}
    .nudge-sel{outline:2px solid #0a7cff!important;outline-offset:3px!important;
      cursor:grab!important;transition:none!important;animation:none!important}
    #nudgeBar{position:fixed;left:12px;bottom:12px;z-index:2147483647;
      background:#111;color:#e8ff59;font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;
      padding:11px 14px;border-radius:9px;white-space:pre;max-width:min(46ch,92vw);
      box-shadow:0 10px 34px rgba(0,0,0,.45);pointer-events:none;user-select:none}
    #nudgeBar b{color:#fff;font-weight:700}
    #nudgeBar .ok{color:#7CFFB2}`;
  document.head.appendChild(css);

  const bar = document.createElement('div');
  bar.id = 'nudgeBar';
  bar.setAttribute(UI, '');
  bar.hidden = true;
  document.body.appendChild(bar);

  /* ── a selector short enough to paste, long enough to be unique ───────── */
  const path = el => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
      const cls = [...node.classList]
        .filter(c => !c.startsWith('nudge-') && c !== 'on')
        .slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
      // Classes first; the tag and the index only get added if they earn it.
      let piece = cls || node.tagName.toLowerCase();
      parts.unshift(piece);
      if (document.querySelectorAll(parts.join(' > ')).length === 1) return parts.join(' > ');
      const twins = [...node.parentElement.children].filter(x => x.matches(piece));
      if (twins.length > 1) {
        parts[0] = piece + `:nth-of-type(${
          [...node.parentElement.children]
            .filter(x => x.tagName === node.tagName).indexOf(node) + 1})`;
      }
      if (document.querySelectorAll(parts.join(' > ')).length === 1) return parts.join(' > ');
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  /* ── apply / read ────────────────────────────────────────────────────── */
  const get = el => state.get(el) || { dx: 0, dy: 0, scale: 1, rot: 0, fs: 0 };

  const apply = el => {
    const s = get(el);
    const t = [];
    if (s.dx || s.dy) t.push(`translate(${r(s.dx)}px, ${r(s.dy)}px)`);
    if (s.rot)        t.push(`rotate(${r(s.rot)}deg)`);
    if (s.scale !== 1) t.push(`scale(${s.scale.toFixed(3)})`);
    el.style.transform = t.length ? t.join(' ') : '';
    el.style.fontSize  = s.fs ? s.fs + 'px' : '';
    draw();
  };

  const r = n => Math.round(n * 10) / 10;

  /* The CSS to bake in. !important because a deck's reveal animation sets
     transform on .slide > * and would otherwise win. */
  const rule = el => {
    const s = get(el), out = [];
    const t = [];
    if (s.dx || s.dy) t.push(`translate(${r(s.dx)}px, ${r(s.dy)}px)`);
    if (s.rot)        t.push(`rotate(${r(s.rot)}deg)`);
    if (s.scale !== 1) t.push(`scale(${s.scale.toFixed(3)})`);
    if (t.length) out.push(`  transform: ${t.join(' ')} !important;`);
    if (s.fs)     out.push(`  font-size: ${r(s.fs)}px;`);
    if (!out.length) return '';
    return `${path(el)} {\n${out.join('\n')}\n}`;
  };

  const sheet = () => {
    const rules = [...state.keys()].map(rule).filter(Boolean);
    if (!rules.length) return '/* nothing moved yet */';
    return `/* nudged ${new Date().toISOString().slice(0, 10)} — paste into the stylesheet */\n`
      + rules.join('\n');
  };

  /* ── the readout ─────────────────────────────────────────────────────── */
  const draw = (msg) => {
    if (!on) return;
    const head = `<b>NUDGE</b>  click · drag · wheel · arrows · [ ] rotate · p parent · 0 reset · c copy · d exit`;
    if (!sel) {
      bar.innerHTML = head + `\n\nnothing selected — click something`
        + (state.size ? `\n${state.size} element${state.size > 1 ? 's' : ''} moved` : '');
      return;
    }
    const s = get(sel), vw = innerWidth / 100, vh = innerHeight / 100;
    bar.innerHTML = head
      + `\n\n<b>${path(sel)}</b>`
      + `\nmove   ${r(s.dx)}px, ${r(s.dy)}px   (${r(s.dx / vw)}vw, ${r(s.dy / vh)}vh)`
      + `\nsize   ${(s.scale * 100).toFixed(1)}%`
      + (s.rot ? `\nrotate ${r(s.rot)}deg` : '')
      + (s.fs ? `\ntype   ${r(s.fs)}px` : '')
      + (msg ? `\n<span class="ok">${msg}</span>` : '');
  };

  /* ── picking ─────────────────────────────────────────────────────────── */
  /* An SVG's guts are never what you meant to grab. Climb out to the <svg>,
     then to its wrapper if the wrapper exists only to hold it. */
  const sane = el => {
    if (el.ownerSVGElement) {
      let svg = el;
      while (svg.ownerSVGElement) svg = svg.ownerSVGElement;
      el = svg;
    }
    const up = el.parentElement;
    if (up && up !== document.body && up.children.length === 1 && up.className)
      return up;
    return el;
  };

  const pick = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest?.(`[${UI}]`)) continue;
      if (el === document.body || el === document.documentElement) continue;
      if (!el.closest?.(ROOTS)) continue;
      return sane(el);
    }
    return null;
  };

  let hi = null;
  const highlight = el => {
    if (hi === el) return;
    hi?.classList.remove('nudge-hi');
    hi = el;
    if (hi && hi !== sel) hi.classList.add('nudge-hi');
  };

  const select = el => {
    sel?.classList.remove('nudge-sel');
    sel = el;
    sel?.classList.add('nudge-sel');
    sel?.classList.remove('nudge-hi');
    draw();
  };

  /* ── events ──────────────────────────────────────────────────────────── */
  addEventListener('pointermove', e => {
    if (!on) return;
    if (drag) {
      const s = get(drag.el);
      s.dx = e.clientX - drag.x; s.dy = e.clientY - drag.y;
      state.set(drag.el, s); apply(drag.el);
      return;
    }
    highlight(pick(e.clientX, e.clientY));
  }, true);

  addEventListener('pointerdown', e => {
    if (!on) return;
    const el = pick(e.clientX, e.clientY);
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    select(el);
    const s = get(el);
    state.set(el, s);
    drag = { el, x: e.clientX - s.dx, y: e.clientY - s.dy };
  }, true);

  addEventListener('pointerup', () => { drag = null; }, true);

  addEventListener('wheel', e => {
    if (!on || !sel) return;
    e.preventDefault(); e.stopPropagation();
    const s = get(sel);
    if (e.shiftKey) {
      const base = s.fs || parseFloat(getComputedStyle(sel).fontSize);
      s.fs = Math.max(6, base - e.deltaY * 0.06);
    } else {
      s.scale = Math.min(6, Math.max(0.15, s.scale - e.deltaY * 0.0016));
    }
    state.set(sel, s); apply(sel);
  }, { capture: true, passive: false });

  const NUDGE_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  addEventListener('keydown', e => {
    if (e.key === 'd' && !e.metaKey && !e.ctrlKey) { toggle(); return; }
    if (!on) return;

    if (e.key === 'Escape') { select(null); draw(); return; }

    // Grabbed the span and meant the heading: p walks up one level.
    if (e.key === 'p' && sel) {
      const up = sel.parentElement;
      if (up && up !== document.body && up.closest(ROOTS)) { select(up); draw('moved up to the parent'); }
      e.preventDefault();
      return;
    }

    if (e.key === 'c') {
      const text = sheet();
      navigator.clipboard?.writeText(text)
        .then(() => draw('copied ' + state.size + ' rule(s) to the clipboard'))
        .catch(() => { console.log(text); draw('clipboard blocked — CSS logged to the console'); });
      e.preventDefault();
      return;
    }

    if (!sel) return;
    const s = get(sel);

    if (NUDGE_KEYS[e.key]) {
      const [x, y] = NUDGE_KEYS[e.key], step = e.shiftKey ? 10 : 1;
      s.dx += x * step; s.dy += y * step;
      state.set(sel, s); apply(sel);
      e.preventDefault(); e.stopPropagation();
      return;
    }
    if (e.key === '[' || e.key === ']') {
      s.rot += (e.key === ']' ? 1 : -1) * (e.shiftKey ? 5 : 1);
      state.set(sel, s); apply(sel);
      e.preventDefault();
      return;
    }
    if (e.key === '0') {
      state.delete(sel);
      sel.style.transform = ''; sel.style.fontSize = '';
      draw('reset');
      e.preventDefault();
    }
  }, true);

  /* ── on / off ────────────────────────────────────────────────────────── */
  function toggle() {
    on = !on;
    document.body.classList.toggle('nudge-on', on);
    bar.hidden = !on;
    if (!on) { highlight(null); select(null); drag = null; }
    draw();
  }

  window.__nudge = { toggle, sheet, state };
  console.log('nudge ready — press d');
})();
