// Poké Scan: how the card lists look, and a card's page beside the list on a
// wide screen.
//
// Moshe, 2026-09-28: "Make it open like google so it opens the card on the
// side but the screen stays the same. You should also have multiple views."
//
// 1. The side panel. On a wide screen (an iPad, a laptop: 740 px and wider)
//    tapping a card opens its page on the right, like Google's side results.
//    The list stays where it was -- same search, same scroll, the card you
//    tapped still under your finger -- and the next tap swaps the page. The ✕
//    Close button (and Escape on a keyboard) closes it. On a phone nothing
//    changes: the page slides up over the list as before.
//    It is the SAME card page (#card-sheet) either way; only where it sits
//    changes, so nothing on it can drift between phone and iPad.
// 2. Views. The search results and My cards each have Grid (the tiles as
//    before), List (one row per card: small picture, name, set, number,
//    price, how many) and Big (large pictures). The choice is kept per person
//    on this device, separately for the two lists.
//
// Nothing here reads or writes the family's cards. It only lays out what
// index.html already draws, so it cannot lose anything.

const WIDE = "(min-width: 740px)";
const VIEWS = [
  ["grid", "Grid", `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="7" height="7" rx="1.6"/><rect x="11" y="2" width="7" height="7" rx="1.6"/><rect x="2" y="11" width="7" height="7" rx="1.6"/><rect x="11" y="11" width="7" height="7" rx="1.6"/></svg>`],
  ["list", "List", `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2.5" width="4.5" height="6" rx="1"/><rect x="8.5" y="4" width="9.5" height="2.4" rx="1.2"/><rect x="2" y="11.5" width="4.5" height="6" rx="1"/><rect x="8.5" y="13" width="9.5" height="2.4" rx="1.2"/></svg>`],
  ["big", "Big", `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="1.5" width="12" height="17" rx="2"/></svg>`]
];
// Which list each picker belongs to, and where its tiles are drawn.
const LISTS = { find: "results", mine: "mine-root" };

const STYLE = `
/* ---------- The view picker ---------- */
.view-pick { display: inline-flex; flex: none; gap: 2px; padding: 3px; border-radius: 12px; background: var(--panel); border: 1px solid var(--panel-2); box-shadow: var(--shadow); }
.view-pick button { font: inherit; display: inline-flex; align-items: center; gap: 5px; border: none; background: none; color: var(--ink-muted); border-radius: 9px; padding: 6px 10px; min-height: 36px; font-size: calc(12.5px * var(--scale, 1)); font-weight: 700; cursor: pointer; touch-action: manipulation; transition: background 0.15s ease, color 0.15s ease, transform 0.1s cubic-bezier(.2,.9,.3,1.1); }
.view-pick button:active { transform: scale(0.94); }
.view-pick button svg { width: calc(15px * var(--scale, 1)); height: calc(15px * var(--scale, 1)); fill: currentColor; flex: none; }
.view-pick button[aria-checked="true"] { background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 88%, #fff), var(--accent)); color: #fff; box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 40%, transparent); }
.view-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.view-row .view-label { font-size: calc(12px * var(--scale, 1)); color: var(--ink-faint); font-weight: 600; }
.mine-row .view-pick { min-height: 48px; align-items: center; }
/* At the top of the text-size slider the sort menu ("As added, with running
   total") was wider than a phone; with the View choice beside it the row must fit. */
.mine-row select { max-width: 100%; min-width: 0; text-overflow: ellipsis; }

/* ---------- List: one row per card ---------- */
[data-view="list"] .grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
[data-view="list"] .grid .tile { display: grid; grid-template-columns: calc(52px * var(--scale, 1)) minmax(0, 1fr) auto; column-gap: 12px; row-gap: 2px; align-items: start; padding: 8px 10px 8px 8px; border-radius: 14px; }
[data-view="list"] .grid .tile > * { grid-column: 2; margin: 0; min-width: 0; }
[data-view="list"] .grid .tile .pic { grid-column: 1; grid-row: 1 / span 6; width: 100%; border-radius: 7px; align-self: start; }
[data-view="list"] .grid .tile .pic.missing { font-size: calc(9px * var(--scale, 1)); padding: 4px; aspect-ratio: 63 / 88; }
[data-view="list"] .grid .tile .t-name { grid-row: 1; font-size: calc(var(--t-name) + 1.5px); margin-top: 2px; }
[data-view="list"] .grid .tile .t-sub { grid-row: 2; }
[data-view="list"] .grid .tile .t-kind { grid-row: 3; margin-top: 3px; }
[data-view="list"] .grid .tile .t-rarity { grid-row: 4; }
[data-view="list"] .grid .tile .art-note { grid-row: 5; }
/* Price and how many sit on the right; the + − 💰 under them. */
[data-view="list"] .grid .tile .t-row:not(.running) { grid-column: 3; grid-row: 1 / span 2; flex-direction: column; align-items: flex-end; justify-content: flex-start; gap: 1px; margin-top: 2px; text-align: right; }
[data-view="list"] .grid .tile .t-row:not(.running) .t-price { font-size: calc(var(--t-price) + 2px); }
[data-view="list"] .grid .tile .have { position: static; grid-column: 3; grid-row: 3; justify-self: end; align-self: start; box-shadow: none; }
[data-view="list"] .grid .tile .t-ctl { grid-column: 2 / -1; grid-row: 6; justify-self: end; margin-top: 6px; }
[data-view="list"] .grid .tile .t-ctl button { flex: none; width: calc(40px * var(--scale, 1)); min-height: 32px; }
[data-view="list"] .grid .tile .t-row.running { grid-column: 1 / -1; grid-row: 7; }
[data-view="list"] .grid .tile .fav { top: 4px; left: 4px; right: auto; font-size: calc(13px * var(--scale, 1)); }
[data-view="list"] .grid .tile .best { right: auto; width: calc(52px * var(--scale, 1) + 8px); font-size: calc(8px * var(--scale, 1)); letter-spacing: 0; border-radius: 14px 0 8px 0; }
[data-view="list"] .grid .tile .t-kind .kind-art { width: calc(22px * var(--scale, 1)) !important; height: calc(22px * var(--scale, 1)) !important; }

/* ---------- Big: large pictures ---------- */
[data-view="big"] .grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
[data-view="big"] .grid .tile { border-radius: 20px; padding-bottom: 12px; }
[data-view="big"] .grid .tile .t-name { font-size: calc(var(--t-name) + 5px); margin: 10px 12px 0; }
[data-view="big"] .grid .tile .t-sub, [data-view="big"] .grid .tile .t-rarity, [data-view="big"] .grid .tile .art-note { font-size: calc(var(--t-sub) + 1.5px); margin-left: 12px; margin-right: 12px; }
[data-view="big"] .grid .tile .t-kind { font-size: calc(var(--t-sub) + 1.5px); margin: 8px 12px 0; }
[data-view="big"] .grid .tile .t-row { margin: 8px 12px 0; }
[data-view="big"] .grid .tile .t-row .t-price { font-size: calc(var(--t-price) + 4px); }
[data-view="big"] .grid .tile .t-ctl { margin: 10px 12px 0; }
[data-view="big"] .grid .tile .t-ctl button { min-height: 40px; }
[data-view="big"] .grid .tile .have { font-size: calc(13px * var(--scale, 1)); padding: 4px 10px; top: 10px; left: 10px; }
[data-view="big"] .grid .tile .fav { font-size: calc(22px * var(--scale, 1)); top: 8px; right: 10px; }

/* ---------- The card's page beside the list (wide screens) ---------- */
.side-close { display: none; }
html.side-ok { --side-w: clamp(340px, 42vw, 540px); }
html.side-ok #card-sheet { left: auto; right: 0; width: var(--side-w); background: transparent !important; align-items: stretch; justify-content: flex-end; z-index: 24; }
html.side-ok #card-sheet .sheet { max-width: none; width: 100%; height: 100%; max-height: 100%; border-radius: 22px 0 0 22px; transform: translateX(34px);
  border-left: 1px solid var(--line); box-shadow: -16px 0 44px rgba(0,0,0,0.28), -1px 0 0 rgba(255,255,255,0.04) inset;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, var(--panel)) 0, var(--panel) 180px); }
html.side-ok #card-sheet.show .sheet { transform: translateX(0); }
html.side-ok #card-sheet .grabber { display: none; }
html.side-ok #card-sheet .sheet-top { background: color-mix(in srgb, var(--accent) 5%, var(--panel)); }
html.side-ok #card-sheet .sheet-top .sheet-home { margin-left: auto; }
html.side-ok #card-sheet .side-close { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: var(--ink); }
/* The list keeps its width when there is room and slides left just enough
   when there isn't; the card you tapped is held where it was (see below). */
html.side-ok.side-open .wrap { margin-left: max(0px, min(calc((100vw - 720px) / 2), calc(100vw - var(--side-w) - 736px))); margin-right: var(--side-w); }
/* The "Added … Undo" note sits under the list, not under the card page. */
html.side-ok.side-open .toast { left: calc((100vw - var(--side-w)) / 2); max-width: calc(100vw - var(--side-w) - 40px); }
html.side-ok.side-open .tile.side-shown { outline: 3px solid var(--accent); outline-offset: -3px; }
html.side-ok.side-open .tile.owned.side-shown { outline-color: var(--accent); }
`;

export function setupViews(ctx) {
  const $ = id => document.getElementById(id);
  const html = document.documentElement;
  const sheetBack = $("card-sheet");
  const style = document.createElement("style");
  style.id = "pokescan-views-css";
  style.textContent = STYLE;
  document.head.appendChild(style);

  // ---------- Views ----------
  const keyFor = list => "pokescan-view:" + (ctx.who() || "-") + ":" + list;
  function viewFor(list) {
    try { const v = localStorage.getItem(keyFor(list)); if (VIEWS.some(x => x[0] === v)) return v; } catch (e) {}
    return "grid";
  }
  function pickerHtml(list) {
    return VIEWS.map(([k, label, icon]) => `<button type="button" role="radio" data-view-pick="${k}" data-view-list="${list}" aria-checked="false">${icon}<span>${label}</span></button>`).join("");
  }
  const pickers = {};
  let tapped = null;   // the card last tapped in a list (see the side panel below)
  function makePicker(list) {
    const el = document.createElement("div");
    el.className = "view-pick";
    el.id = "view-pick-" + list;
    el.setAttribute("role", "radiogroup");
    el.setAttribute("aria-label", "How the cards look");
    el.innerHTML = pickerHtml(list);
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-view-pick]");
      if (!b) return;
      try { localStorage.setItem(keyFor(list), b.dataset.viewPick); } catch (e2) {}
      withAnchor(() => apply(list));
    });
    pickers[list] = el;
    return el;
  }
  // Find: a row of its own just above the results. My cards: beside the sort.
  const findRow = document.createElement("div");
  findRow.className = "view-row hide";
  findRow.id = "view-row-find";
  findRow.innerHTML = `<span class="view-label">View</span>`;
  findRow.appendChild(makePicker("find"));
  $("results").before(findRow);
  const mineRow = document.querySelector("#mine-pane .mine-row");
  if (mineRow) mineRow.appendChild(makePicker("mine"));

  // Big pictures need the big picture file; the small one is blurry at that size.
  function bigSrc(src) {
    if (/\/low\.webp$/.test(src)) return src.replace(/\/low\.webp$/, "/high.webp");
    if (/images\.pokemontcg\.io\/.+\/[^/_]+\.png$/.test(src)) return src.replace(/\.png$/, "_hires.png");
    if (/images\.ygoprodeck\.com\/images\/cards_small\//.test(src)) return src.replace("/cards_small/", "/cards/");
    return src;
  }
  // The small picture a tile was drawn with is remembered; Big swaps in the
  // big file and Grid/List put the small one back. A picture something else
  // changed since (the Yugipedia scan for a Yu-Gi-Oh! printing) becomes the
  // new small one, so switching views never undoes it.
  function pictures(root, big) {
    root.querySelectorAll(".grid .tile img.pic").forEach(img => {
      const cur = img.getAttribute("src") || "";
      if (!img.dataset.low || (cur !== img.dataset.low && cur !== img.dataset.big)) { img.dataset.low = cur; img.dataset.big = bigSrc(cur); }
      const want = big ? img.dataset.big : img.dataset.low;
      if (cur === want) return;
      if (want !== img.dataset.low && !img.dataset.upgraded) {
        img.dataset.upgraded = "1";
        // A big picture that doesn't load falls back to the small one, never to "No picture".
        img.onerror = null;
        img.addEventListener("error", () => { if (img.getAttribute("src") === img.dataset.big && img.dataset.big !== img.dataset.low) img.src = img.dataset.low; });
      }
      img.src = want;
    });
  }
  function apply(list) {
    const root = $(LISTS[list]);
    if (!root) return;
    const v = viewFor(list);
    if (root.dataset.view !== v) root.dataset.view = v;
    const p = pickers[list];
    if (p) p.querySelectorAll("[data-view-pick]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.viewPick === v)));
    const hasGrid = !!root.querySelector(".grid .tile");
    if (list === "find") findRow.classList.toggle("hide", !hasGrid);
    if (list === "mine" && p) p.classList.toggle("hide", !hasGrid);
    pictures(root, v === "big");
    markShown();
  }
  // Every time a list is drawn (a search, an add, a name switch), put its view on it.
  for (const list of Object.keys(LISTS)) {
    const root = $(LISTS[list]);
    if (!root) continue;
    new MutationObserver(() => apply(list)).observe(root, { childList: true, subtree: true });
    apply(list);
  }
  // A different person has their own choice.
  const whoName = $("who-name");
  if (whoName) new MutationObserver(() => { apply("find"); apply("mine"); }).observe(whoName, { childList: true, characterData: true, subtree: true });

  // ---------- The side panel ----------
  const wide = window.matchMedia ? window.matchMedia(WIDE) : { matches: false, addEventListener() {} };
  const top = sheetBack.querySelector(".sheet-top");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "link side-close";
  close.id = "side-close";
  close.setAttribute("aria-label", "Close the card");
  close.innerHTML = `<span aria-hidden="true">✕</span> Close`;
  close.addEventListener("click", () => { const b = $("btn-card-close"); if (b) b.click(); });
  if (top) top.appendChild(close);

  // The card you tapped, so it can be held in place and marked in the list.
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest(".tile[data-card-id], .mc[data-card-id], [data-card-id].look-tile");
    if (t && !t.closest(".sheet-back")) tapped = t;
  }, true);
  const onScreen = el => { if (!el || !el.isConnected || !el.offsetParent) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
  function anchor() {
    if (onScreen(tapped)) return tapped;
    const pane = document.querySelector("section:not(.hide)");
    return pane ? [...pane.querySelectorAll(".tile, .mc, .set-row, .trade-card")].find(onScreen) || null : null;
  }
  // Change the layout without the list moving under the eye: whatever was on
  // screen is put back at the same height afterwards. (Safari doesn't do this
  // by itself when the list gets narrower.)
  function withAnchor(change) {
    const el = anchor();
    const before = el ? el.getBoundingClientRect().top : 0;
    change();
    if (el && el.isConnected) {
      const moved = el.getBoundingClientRect().top - before;
      if (Math.abs(moved) >= 1) window.scrollBy(0, moved);
    }
  }
  function markShown() {
    const id = sheetBack.classList.contains("show") && ctx.openCardId ? ctx.openCardId() : null;
    document.querySelectorAll(".tile.side-shown").forEach(t => { if (t.dataset.cardId !== id) t.classList.remove("side-shown"); });
    if (!id || !html.classList.contains("side-open")) return;
    document.querySelectorAll(`#app-wrap .tile[data-card-id="${CSS.escape(id)}"]`).forEach(t => t.classList.add("side-shown"));
  }
  function sync() {
    const ok = !!wide.matches;
    const open = ok && sheetBack.classList.contains("show");
    if (html.classList.contains("side-ok") !== ok || html.classList.contains("side-open") !== open) {
      withAnchor(() => { html.classList.toggle("side-ok", ok); html.classList.toggle("side-open", open); });
    }
    markShown();
  }
  new MutationObserver(sync).observe(sheetBack, { attributes: true, attributeFilter: ["class"] });
  // The next tap swaps the page; the list marks the card now showing.
  if ($("card-body")) new MutationObserver(markShown).observe($("card-body"), { childList: true });
  if (wide.addEventListener) wide.addEventListener("change", sync); else if (wide.addListener) wide.addListener(sync);
  sync();
  // Beside the list, the page is not a bottom sheet: a finger moving down
  // scrolls it, it never drags it down. (Swiping right still closes it.)
  sheetBack.addEventListener("touchstart", e => { if (html.classList.contains("side-ok")) e.stopPropagation(); }, { capture: true, passive: true });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || !html.classList.contains("side-open")) return;
    if (document.querySelector(".sheet-back.show:not(#card-sheet)")) return;   // a question on top answers Escape first
    close.click();
  });
  return { apply, sync, viewFor };
}
