// Poké Scan: Minecraft Dungeons Arcade cards, a third game beside Pokémon
// and Yu-Gi-Oh!.
//
// Moshe, 2026-09-28: "Add Minecraft dungeons arcade cards but not for the
// worth. I want it for trades and telling me how rare it is and telling me
// how close I am to the full set."
//
// So: NO prices anywhere for these cards. Each card says how rare it is in
// plain words; My cards and the card's page say how close you are to each
// series ("have 12 of 60", and which are missing); and they trade through the
// same Trade tab and trade check as every other card, where they count as $0
// and the gauge says so.
//
// THE LIST. There is no public database for these cards, so mcd-cards.json
// was built by hand on 2026-09-28 from (most trusted first):
//   - Minecraft Wiki, "Dungeons:Card" -- every card's number, name, type and
//     rarity, with photos of the front and back of all 144 cards; the printed
//     rarity on every regular card's back was read from those photos.
//     https://minecraft.wiki/w/Dungeons:Card
//   - questwalker's collector list (all 144, with rarities)
//     https://questwalker.github.io/minecraft-dungeons-arcade-cards/
//   - CB9001's list on GitHub (all 144 numbers and names)
//     https://github.com/CB9001/minecraft-dungeons-arcade-cards
//   - Raw Thrills, the maker: https://rawthrills.com/games/minecraft-dungeons-arcade/
//   - Arcade Heroes' news posts for Series 2 to 5 (addresses in the file).
// All three lists agree on every number and name. Where they disagreed on a
// rarity (six Series 4 cards, and Bubble Burster), the photo of the card's
// back decided. It is complete: 144 of 144 cards, five series. Not listed
// separately: the foil version every regular card also comes in, and reprints
// of old cards in later series (same number, newer design) -- a foil or a
// reprint counts as the same card here.
// Pictures are the Minecraft Wiki's photos of each card, at a small size
// (240 wide on tiles, 480 on the card's page): the full photos run to 4 MB.
//
// Card ids are "mcd:<number>" (1 to 144; the number is unique across series).

const DATA_URL = new URL("./mcd-cards.json", import.meta.url).href;
export const GAME = "mcd";
export const NO_VALUE = "counts as $0";

let DATA = null, loading = null;
const byId = new Map();
export function load() {
  if (DATA) return Promise.resolve(DATA);
  if (!loading) loading = fetch(DATA_URL).then(r => { if (!r.ok) throw new Error("The Minecraft card list didn't load (" + r.status + ")."); return r.json(); })
    .then(d => { DATA = d; d.cards.forEach(row => byId.set("mcd:" + numOf(row), row)); return d; })
    .catch(e => { loading = null; throw e; });
  return loading;
}
load().catch(() => {});

// Which Hero cards come with a card (Moshe, 2026-09-30: "When I search suns
// grace tell me what heroes are including that card"). Every Hero card gives
// five items -- melee, range, armor, skin and pet -- listed in its "items".
// A name matches with or without the apostrophe or capitals.
export function heroesWith(name) {
  if (!DATA) return [];
  const n = norm(name);
  return DATA.cards.filter(r => r.type === "Hero" && Array.isArray(r.items) && r.items.some(x => norm(x) === n));
}
// A Hero card's five items: [{ name, slot, id }] -- id when the item is also a card of its own.
const SLOTS = ["Melee", "Range", "Armor", "Skin", "Pet"];
export function heroItems(c) {
  const row = DATA ? byId.get(c.id) : null;
  if (!row || !Array.isArray(row.items)) return [];
  return row.items.map((x, i) => { const own = DATA.cards.find(r => r.type !== "Hero" && norm(r.name) === norm(x)); return { name: x, slot: SLOTS[i] || "", id: own ? "mcd:" + numOf(own) : "" }; });
}
function heroWords(r) { return r.name + " (#" + numOf(r) + ")"; }

export const isMcdId = id => String(id || "").startsWith("mcd:");
export const isMcd = c => !!c && (c.game === GAME || isMcdId(c.id) || isMcdId(c.cardId));
export const isMcdSnap = s => !!s && s.game === GAME;

// The number printed on the card: "04/60", "61/98", "99 of 118". The first
// number is the card's own number, unique across all five series.
function numOf(row) { return String(parseInt(String(row.number).replace(/^#/, ""), 10)); }
function seriesOf(id) { return DATA ? DATA.series.find(s => s.id === id) || null : null; }
function rarityOf(id) { return DATA ? DATA.rarities.find(r => r.id === id) || null : null; }
const FALLBACK_RARITY = { common: { name: "Common", color: "#9aa0a6" }, rare: { name: "Rare", color: "#3fb950" }, unique: { name: "Unique", color: "#ff8a1f" }, hero: { name: "Hero", color: "#e6b422" }, legendary: { name: "Legendary", color: "#ffd23f" } };
const TYPE_WORDS = { Melee: "Melee weapon", Range: "Ranged weapon", Armor: "Armor", Skin: "Skin", Pet: "Pet", Hero: "Hero" };
const TYPE_PLAIN = { Melee: "a weapon you swing", Range: "a bow or crossbow", Armor: "armor for your hero", Skin: "a look for your hero", Pet: "a pet that follows you", Hero: "a hero with five items on it" };
// "Series 2 - Hidden Depths" -> "Series 2" and "Hidden Depths".
function seriesWords(s) { const [a, b] = String(s.name).split(/\s+-\s+/); return { short: a, sub: b || "" }; }

// Thumbnails of the wiki's photos: MediaWiki makes any width on request.
function thumb(url, w) {
  const m = /^(https:\/\/minecraft\.wiki\/images\/)([^/]+)$/.exec(url || "");
  return m ? `${m[1]}thumb/${m[2]}/${w}px-${m[2]}` : (url || "");
}

// One card, shaped like a Pokémon card so every screen of the app works on it.
function cardFor(row) {
  const s = seriesOf(row.series) || { id: row.series, name: row.series, year: "", count: "" };
  const n = numOf(row);
  const r = rarityOf(row.rarity) || FALLBACK_RARITY[row.rarity] || { name: row.rarity };
  return decorate({
    id: "mcd:" + n, game: GAME, name: row.name, localId: n, rarity: r.name, suffix: "",
    image: "", ptcgImages: row.image ? { small: thumb(row.image, 240), large: thumb(row.image, 480) } : undefined,
    set: { id: "mcd-" + s.id, name: "Minecraft " + seriesWords(s).short, releaseDate: s.year ? s.year + "-01-01" : "", cardCount: { official: s.count } }
  });
}
export async function cardById(id) {
  try { await load(); } catch (e) { return null; }
  const row = byId.get(id);
  return row ? cardFor(row) : null;
}
// Called from the page's own decorate() for every Minecraft card, including
// ones rebuilt from a saved snapshot (which may be drawn before the list loads).
export function decorate(c) {
  const row = byId.get(c.id) || byId.get("mcd:" + parseInt(c.localId, 10));
  c.game = GAME;
  c.family = ""; c.finish = ""; c.kind = "regular";
  c.total = ""; c.realTotal = "";
  c.mcd = row ? { type: row.type, rarity: row.rarity, special: row.special || "", printed: row.number, series: row.series }
             : { type: "", rarity: String(c.rarity || "").toLowerCase(), special: "", printed: c.localId || "", series: String((c.set && c.set.id) || "").replace(/^mcd-/, "") };
  if (row && !c.ptcgImages && row.image) c.ptcgImages = { small: thumb(row.image, 240), large: thumb(row.image, 480) };
  const s = seriesOf(c.mcd.series);
  c.year = s && s.year ? String(s.year) : (c.set && c.set.releaseDate ? String(c.set.releaseDate).slice(0, 4) : "");
  return c;
}
export function rarityInfo(c) {
  const id = (c.mcd && c.mcd.rarity) || String(c.rarity || "").toLowerCase();
  return { id, ...(FALLBACK_RARITY[id] || { name: c.rarity || "", color: "#9aa0a6" }), ...(rarityOf(id) || {}) };
}
export function numberLabel(c) { return "#" + ((c.mcd && c.mcd.printed) || c.localId || "?"); }
export function kindWords(c) {
  const r = rarityInfo(c), t = c.mcd && c.mcd.type;
  return (r.name || "Card") + (t && t !== "Hero" ? " · " + t : "");
}
// The mark beside a card's kind: a Minecraft-style block in the color of the
// rarity label printed on the card (grey, green, orange, gold).
export function mark(c, size) {
  const r = rarityInfo(c);
  const col = r.color || "#9aa0a6";
  const shine = r.id === "hero" || r.id === "legendary";
  const gid = "mcdG" + r.id;
  return `<span class="kind-art mcd-mark" style="width:${size || 44}px;height:${size || 44}px" title="${escapeAttr(r.name || "")}"><svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shine ? "#fff6c9" : "#ffffff"}" stop-opacity="${shine ? 1 : 0.55}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`
    + `<path d="M24 5 42 15 24 25 6 15Z" fill="${col}"/><path d="M24 5 42 15 24 25 6 15Z" fill="url(#${gid})"/>`
    + `<path d="M6 15 24 25V44L6 34Z" fill="${shade(col, 0.72)}"/><path d="M42 15 24 25V44L42 34Z" fill="${shade(col, 0.55)}"/>`
    + `<path d="M24 5 42 15V34L24 44 6 34V15Z" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M12 18.5 16 20.7M28 29.6 32 27.4M33 22 37 19.8M11 26 14 27.6" stroke="rgba(0,0,0,.28)" stroke-width="3"/>`
    + (shine ? `<path d="M37 4l1.6 3.6L42 9l-3.4 1.4L37 14l-1.6-3.6L32 9l3.4-1.4z" fill="#fff"/>` : "")
    + `</svg></span>`;
}
function shade(hex, f) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16), ch = k => Math.round(((n >> k) & 255) * f);
  return "#" + [16, 8, 0].map(k => ch(k).toString(16).padStart(2, "0")).join("");
}
// What the search tiles show where a price would be: how rare, in words.
export function tileLine(c) {
  const r = rarityInfo(c);
  // The kind line above already names the rarity; this says what it means.
  const own = `<span class="mcd-line" style="--rc:${escapeAttr(r.color || "")}">${escapeHtml(r.short || r.name || "")}</span>`;
  if (c.viaHero) return own + `<span class="mcd-hero-line">Comes with ${escapeHtml(c.viaHero.join(", "))}</span>`;
  if (c.mcd && c.mcd.type === "Hero") return own;
  const heroes = heroesWith(c.name);
  return heroes.length ? own + `<span class="mcd-hero-line">On Hero card${heroes.length === 1 ? "" : "s"}: ${escapeHtml(heroes.map(heroWords).join(", "))}</span>` : own;
}

// ---------- Search ----------
// A name (Heartstealer, llama), part of one (heart), the number on the card
// (61, #61, 61/98), a series (Series 2, S2), a kind (Hero, Pet, Unique), or
// "all" for every card.
export function parseQuery(q) {
  q = String(q || "").trim();
  if (/^(series|s)\s*\d+$/i.test(q)) return { name: q, number: "", total: "", year: "" };
  const m = /^(.*?\D)\s+#?(\d{1,3})(?:\s*(?:\/|of)\s*\d{1,3})?$/i.exec(q);
  if (m && m[1].trim() && !/^(series|s)$/i.test(m[1].trim())) return { name: m[1].trim(), number: m[2], total: "", year: "" };
  const only = /^#?\s*(\d{1,3})(?:\s*(?:\/|of)\s*\d{1,3})?$/i.exec(q);
  if (only) return { name: only[1], number: only[1], total: "", year: "" };
  return { name: q, number: "", total: "", year: "" };
}
const norm = s => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export async function search(q) {
  const d = await load();
  const n = norm(q);
  const all = d.cards;
  let rows = [];
  if (!n || /^(all|every|everything|every card|all cards|minecraft|minecraft dungeons|dungeons|minecraft cards)$/.test(n)) rows = all;
  else if (/^(series|s) ?\d+$/.test(n)) { const id = "s" + n.match(/\d+/)[0]; rows = all.filter(r => r.series === id); }
  else if (/^\d+$/.test(n)) rows = all.filter(r => numOf(r) === String(parseInt(n, 10)));
  else {
    rows = all.filter(r => norm(r.name).includes(n));
    // A kind said exactly ("hero", "pets", "unique") means every card of that
    // kind, as well as any whose name has the word (Hero's Armor).
    const one = n.replace(/(e?s)$/, "");
    const kind = all.filter(r => { const rr = rarityOf(r.rarity); return [r.type, rr && rr.name, r.type === "Range" ? "ranged" : ""].some(x => { const w = norm(x); return w && (w === n || w === one); }); });
    if (kind.length) rows = [...new Set([...kind, ...rows])];
    if (!rows.length) {
      // A kind or a series name: "hero", "pets", "unique", "hidden depths".
      const word = n.replace(/s$/, "");
      rows = all.filter(r => {
        const s = seriesOf(r.series), rr = rarityOf(r.rarity);
        return [r.type, TYPE_WORDS[r.type], rr && rr.name, s && s.name].some(x => { const w = norm(x); return w && (w === n || w === word || w.includes(n)); });
      });
    }
  }
  // A name typed (not a kind like "hero"): the Hero cards that come with it
  // follow, each saying which of the cards above it carries.
  const out = rows.map(cardFor);
  if (n && rows.length && rows.length <= 12 && !rows.every(r => r.type === "Hero")) {
    const via = new Map();
    rows.filter(r => r.type !== "Hero").forEach(r => heroesWith(r.name).forEach(h => { if (!rows.includes(h)) via.set(h, [...(via.get(h) || []), r.name]); }));
    via.forEach((names, h) => { const c = cardFor(h); c.viaHero = [...new Set(names)]; out.push(c); });
  }
  return out;
}

// ---------- Owning them ----------
let ctx = null;
export function setup(context) { ctx = context; injectCss(); wireClicks(); }
function ownedMap(person) {
  const got = new Map();
  if (!ctx) return got;
  Object.values(ctx.state().cards || {}).forEach(e => {
    if (!ctx.live(e) || !isMcdId(e.cardId) || (person !== "*" && e.who !== person)) return;
    got.set(e.cardId, (got.get(e.cardId) || 0) + (Number(e.qty) || 1));
  });
  return got;
}
// How close to the full set: one series, for one person (or "*" = the family together).
export function seriesProgress(seriesId, person) {
  if (!DATA) return null;
  const s = seriesOf(seriesId);
  if (!s) return null;
  const owned = ownedMap(person);
  const rows = DATA.cards.filter(r => r.series === seriesId);
  const have = rows.filter(r => owned.has("mcd:" + numOf(r)));
  const missing = rows.filter(r => !owned.has("mcd:" + numOf(r)));
  return { series: s, words: seriesWords(s), have: have.length, total: s.count || rows.length, listed: rows.length, missing };
}
function barHtml(p) {
  const pct = p.total ? Math.round(p.have / p.total * 100) : 0;
  return `<div class="mcd-bar" role="img" aria-label="${p.have} of ${p.total}"><div style="width:${pct}%"></div></div>`;
}
function missingHtml(p) {
  if (!p.missing.length) return `<div class="mcd-done">Full set! Every card in ${escapeHtml(p.words.short)}.</div>`;
  return `<div class="mcd-missing">${p.missing.map(r => {
    const rr = rarityOf(r.rarity) || FALLBACK_RARITY[r.rarity] || {};
    return `<button type="button" class="mcd-miss" data-mcd-open="mcd:${numOf(r)}"><span class="mm-num">#${escapeHtml(numOf(r))}</span><span class="mm-name">${escapeHtml(r.name)}</span><span class="mm-rar" style="--rc:${escapeAttr(rr.color || "")}">${escapeHtml(rr.name || "")}</span></button>`;
  }).join("")}</div>`;
}
const openMissing = new Set();   // which series' missing lists are open, this visit
// My cards: "How close to the full set", one row per series, for the person
// being looked at. Only there once they have at least one Minecraft card.
export function renderProgress() {
  if (!ctx) return;
  const pane = document.getElementById("mine-pane"), root = document.getElementById("mine-root");
  if (!pane || !root) return;
  let box = document.getElementById("mcd-progress");
  if (!box) { box = document.createElement("div"); box.id = "mcd-progress"; box.className = "mcd-progress hide"; root.before(box); }
  const person = ctx.mineWho();
  if (!DATA) { box.classList.add("hide"); load().then(() => renderProgress()).catch(() => {}); return; }
  const owned = ownedMap(person);
  if (!owned.size) { box.classList.add("hide"); box.innerHTML = ""; return; }
  const whoWords = person === "*" ? "The family has" : escapeHtml(person) + " has";
  const html = `<div class="mcd-head">${mark({ game: GAME, mcd: { rarity: "unique" } }, 30)}<div><div class="mcd-title">Minecraft Dungeons: how close to the full set</div><div class="mcd-sub">${whoWords} ${owned.size} of ${DATA.cards.length} different cards${person === "*" ? " between everyone" : ""}. Tap a series to see which are missing.</div></div></div>`
    + DATA.series.map(s => {
      const p = seriesProgress(s.id, person);
      const open = openMissing.has(s.id);
      return `<div class="mcd-series${p.have ? " lit" : ""}${open ? " open" : ""}">
        <button type="button" class="mcd-series-top" data-mcd-series="${escapeAttr(s.id)}" aria-expanded="${open}">
          <span class="ms-name"><b>${escapeHtml(p.words.short)}</b>${p.words.sub ? ` <small>${escapeHtml(p.words.sub)}</small>` : ""}</span>
          <span class="ms-count">have <b>${p.have}</b> of <b>${p.total}</b></span>
        </button>
        ${barHtml(p)}
        <div class="ms-left">${p.missing.length ? `${p.missing.length} missing` : "Complete"} <span class="ms-chev">›</span></div>
        ${open ? missingHtml(p) : ""}
      </div>`;
    }).join("");
  if (box.dataset.drawn !== html) { box.innerHTML = html; box.dataset.drawn = html; }
  box.classList.remove("hide");
}

// ---------- The card's page ----------
// The same page every card gets (same Back, +, −, Add, trade buttons), with
// rarity and the full-set count where Pokémon cards have prices.
export function sheetHtml(c, h) {
  const r = rarityInfo(c);
  const s = seriesOf(c.mcd && c.mcd.series);
  const sw = s ? seriesWords(s) : { short: (c.set && c.set.name) || "", sub: "" };
  const hero = (c.ptcgImages && c.ptcgImages.large) || (c.ptcgImages && c.ptcgImages.small) || "";
  const who = ctx ? ctx.who() : "";
  const have = who && ctx ? ctx.haveCount(c.id, who) : 0;
  const type = c.mcd && c.mcd.type;
  const inSeries = DATA && s ? DATA.cards.filter(x => x.series === s.id) : [];
  const counts = {};
  inSeries.forEach(x => { counts[x.rarity] = (counts[x.rarity] || 0) + 1; });
  const ladder = (DATA ? DATA.rarities : []).map(x => `<div class="mcd-rung${x.id === r.id ? " on" : ""}" style="--rc:${escapeAttr(x.color || "#999")}"><span class="rung-name">${escapeHtml(x.name)}</span><span class="rung-n">${counts[x.id] ? counts[x.id] + " in " + escapeHtml(sw.short) : "none in " + escapeHtml(sw.short)}</span></div>`).join("");
  const p = s && who ? seriesProgress(s.id, who) : null;
  const trades = who && ctx ? ctx.holdersOther(c.id).map(n => `<button type="button" class="pill-btn" data-trade-ask="${escapeAttr(n)}" style="margin-top:8px;margin-right:6px">Ask ${escapeHtml(n)} to trade it</button>`).join("") : "";
  const back = r.id === "hero" ? "the word <b>HERO</b> on the front, and a gold, shiny card" : `a <b class="mcd-rc" style="--rc:${escapeAttr(r.color || "")}">${escapeHtml(String(r.name || "").toUpperCase())}</b> label on the back, beside the number`;
  return `${h.checkPut || ""}
    <div class="hero">
      ${hero ? `<img class="card-pic" src="${escapeAttr(hero)}" alt="">` : `<div class="card-pic"></div>`}
      <div class="hero-text">
        <div class="hero-title"><h3 style="margin:0">${escapeHtml(c.name)}</h3></div>
        <div class="hero-line" style="display:flex;align-items:center;gap:8px;margin-top:6px">${mark(c, 40)}<b class="mcd-rc" style="--rc:${escapeAttr(r.color || "")}">${escapeHtml(r.name || "")}</b></div>
        <div class="hero-line"><b>Minecraft Dungeons Arcade</b> · ${escapeHtml(sw.short)}${sw.sub ? ` (${escapeHtml(sw.sub)})` : ""}${c.year ? " · " + escapeHtml(c.year) : ""}</div>
        <div class="hero-line">${escapeHtml(numberLabel(c))}${type ? " · " + escapeHtml(TYPE_WORDS[type] || type) : ""}${c.mcd && c.mcd.special ? " · " + escapeHtml(c.mcd.special) : ""}</div>
        <div class="have-people">${ctx ? ctx.holdersHtml(c.id) : ""}</div>
        ${trades}
        <div class="mcd-noprice">No price — these cards are for playing and trading.</div>
        <div class="hero-ctl">
          <button type="button" class="plus" id="hero-plus" aria-label="Add one to my cards">+</button>
          <button type="button" class="minus" id="hero-minus" aria-label="Take one out of my cards" ${have ? "" : "disabled"}>−</button>
          <button type="button" class="sold" id="hero-sold" aria-label="I sold this card" ${have ? "" : "disabled"}>💰<small>Sold</small></button>
        </div>
        <div class="sold-form hide" id="sold-form">
          <div><b>Sold it for</b></div>
          <div class="row"><span style="font-size: calc(20px * var(--scale, 1));font-weight:800">$</span><input type="number" id="sold-amount" inputmode="decimal" min="0" step="0.01"></div>
          <div class="btn-row"><button type="button" class="btn" id="sold-go">Done — add it to my money</button><button type="button" class="btn secondary" id="sold-cancel">Cancel</button></div>
        </div>
      </div>
    </div>

    ${heroBoxHtml(c)}

    <h4>How rare is it?</h4>
    <div class="price-box mcd-rare" style="--rc:${escapeAttr(r.color || "#999")}">
      <div class="mcd-rare-big">${escapeHtml(r.name || "")}</div>
      <p>${escapeHtml(r.words || "")}</p>
      <div class="mcd-ladder">${ladder}</div>
      <p class="field-note">The maker only says how often Hero cards come out (about 1 play in 10). For Common, Rare and Unique no odds are published, so the label is the best guide.</p>
    </div>

    <h4>How close to the full set</h4>
    <div class="price-box mcd-set">
      ${p ? `<div class="mcd-set-line"><span>${escapeHtml(who)} has <b>${p.have}</b> of <b>${p.total}</b> in ${escapeHtml(p.words.short)}</span><span>${p.missing.length ? p.missing.length + " to go" : "Complete!"}</span></div>${barHtml(p)}
        ${p.missing.length ? `<details class="mcd-details"${p.missing.length <= 8 ? " open" : ""}><summary>Which ones are missing</summary>${missingHtml(p)}</details>` : missingHtml(p)}`
        : `<p class="field-note" style="margin:0">Pick a name (top right) to see how close you are to the full ${escapeHtml(sw.short)}.</p>`}
    </div>

    <h4>Trading it</h4>
    <div class="price-box"><p class="field-note" style="margin:0">In the Trade tab this card <b>${NO_VALUE}</b>: Minecraft Dungeons cards have no store price. Trade card for card, and use how rare each one is to decide what's fair — a ${escapeHtml(r.name || "")} card is ${r.rank && r.rank >= 3 ? "one to ask more for" : "an easy one to swap"}.</p></div>

    <h4>Is the card in your hand this one?</h4>
    <ol class="check-list">
      <li>The name on the front says <b>${escapeHtml(c.name)}</b>${type && type !== "Hero" ? `, and the label under it says <b>${escapeHtml(String(type).toUpperCase())}</b>` : ""}.</li>
      <li>On the back, the number reads <b>${escapeHtml(numberLabel(c))}</b>${s ? ` and the six-sided badge says <b>Series ${escapeHtml(s.id.replace(/^s/, ""))}</b>` : ""}.</li>
      <li>It has ${back}.</li>
      <li>A shiny foil copy of the same card counts as this one here.</li>
    </ol>`;
}

// On a card's page: the Hero cards that come with it, or, on a Hero card,
// its five items. Each one that is a card of its own opens it.
function heroBoxHtml(c) {
  const type = c.mcd && c.mcd.type;
  if (type === "Hero") {
    const items = heroItems(c);
    if (!items.length) return "";
    return `<h4>The five items on this card</h4><div class="price-box"><div class="mcd-missing">${items.map(it => it.id
      ? `<button type="button" class="mcd-miss" data-mcd-open="${escapeAttr(it.id)}"><span class="mm-num">${escapeHtml(it.slot)}</span><span class="mm-name">${escapeHtml(it.name)}</span><span class="mm-rar">open ›</span></button>`
      : `<div class="mcd-miss mcd-item"><span class="mm-num">${escapeHtml(it.slot)}</span><span class="mm-name">${escapeHtml(it.name)}</span><span class="mm-rar">only on Hero cards</span></div>`).join("")}</div>
      <p class="field-note" style="margin:8px 0 0">Scanning this Hero card in the arcade gives you all five at once.</p></div>`;
  }
  const heroes = heroesWith(c.name);
  return `<h4>Hero cards that come with it</h4><div class="price-box">${heroes.length
    ? `<p style="margin:0 0 8px">${escapeHtml(c.name)} is one of the five items on ${heroes.length === 1 ? "this Hero card" : "these " + heroes.length + " Hero cards"}:</p><div class="mcd-missing">${heroes.map(h => {
        const s = seriesOf(h.series);
        return `<button type="button" class="mcd-miss" data-mcd-open="mcd:${numOf(h)}"><span class="mm-num">#${escapeHtml(numOf(h))}</span><span class="mm-name">${escapeHtml(h.name)}</span><span class="mm-rar">${escapeHtml(s ? seriesWords(s).short : "")}</span></button>`;
      }).join("")}</div>`
    : `<p class="field-note" style="margin:0">No Hero card comes with ${escapeHtml(c.name)}. You get it from its own card only.</p>`}</div>`;
}

// ---------- Trades ----------
// Under the gauge of any trade (or trade check) that holds a Minecraft card.
export function tradeNote(snapsOrItems) {
  const n = (snapsOrItems || []).filter(x => x && (isMcdSnap(x) || isMcdId(x.cardId))).length;
  if (!n) return "";
  return `<div class="mcd-trade-note">${mark({ game: GAME, mcd: { rarity: "rare" } }, 22)}<span><b>${n === 1 ? "The Minecraft card counts" : "Minecraft cards count"} as $0 on this gauge</b> — they have no store price. Trade them card for card; each card's page says how rare it is.</span></div>`;
}

// ---------- The game switch ----------
// With Minecraft picked: a row of the five series (tap one to see all of it)
// and a search hint that fits.
let hintBefore = null;
export function onGame(game) {
  const games = document.getElementById("games");
  if (!games) return;
  let row = document.getElementById("mcd-series-row");
  if (!row) {
    row = document.createElement("div");
    row.id = "mcd-series-row";
    row.className = "langs hide";
    games.after(row);
    row.addEventListener("click", e => {
      const b = e.target.closest("[data-mcd-q]");
      if (!b || !ctx) return;
      const q = document.getElementById("q");
      q.value = b.dataset.mcdQ;
      const clear = document.getElementById("q-clear"); if (clear) clear.classList.remove("hide");
      ctx.search(b.dataset.mcdQ);
    });
  }
  const on = game === GAME;
  row.classList.toggle("hide", !on);
  const hint = document.getElementById("search-hint");
  if (hint) {
    if (hintBefore === null) hintBefore = hint.textContent;
    hint.textContent = on ? "Minecraft Dungeons cards: type the name (Heartstealer, Llama) or the number on the back (61). Tap a series to see every card in it. There are no prices for these — each card says how rare it is. Scanning is for Pokémon and Yu-Gi-Oh! cards." : hintBefore;
  }
  if (on) {
    const draw = () => { row.innerHTML = `<button type="button" class="chip" data-mcd-q="all">Every card${DATA ? " · " + DATA.cards.length : ""}</button>` + (DATA ? DATA.series.map(s => `<button type="button" class="chip" data-mcd-q="${escapeAttr(seriesWords(s).short)}">${escapeHtml(seriesWords(s).short)}${seriesWords(s).sub ? " · " + escapeHtml(seriesWords(s).sub) : ""}</button>`).join("") : ""); };
    draw();
    if (!DATA) load().then(draw).catch(() => {});
  }
}

function wireClicks() {
  // A missing card, in My cards or on a card's page: open it.
  document.addEventListener("click", e => {
    const miss = e.target.closest && e.target.closest("[data-mcd-open]");
    if (miss && ctx) { e.preventDefault(); ctx.openCard(miss.dataset.mcdOpen); return; }
    const top = e.target.closest && e.target.closest("[data-mcd-series]");
    if (top) {
      const id = top.dataset.mcdSeries;
      if (openMissing.has(id)) openMissing.delete(id); else openMissing.add(id);
      renderProgress();
    }
  });
}

function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function escapeAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

const STYLE = `
/* Rarity colors are the card's own label colors, darkened toward the text
   color so grey and orange stay readable on white. */
.mcd-line, .mcd-miss .mm-rar, .mcd-rc, .mcd-rare-big { color: color-mix(in srgb, var(--rc) 72%, var(--ink)) !important; }
.mcd-line { font-size: var(--t-sub); font-weight: 700; line-height: 1.25; white-space: normal; overflow-wrap: anywhere; }
.mcd-line b { font-weight: 800; }
.mcd-noprice { margin-top: 8px; font-size: calc(12.5px * var(--scale, 1)); color: var(--ink-muted); font-weight: 600; }
.mcd-rare { position: relative; overflow: hidden; border: 1px solid color-mix(in srgb, var(--rc) 45%, transparent); background: linear-gradient(135deg, color-mix(in srgb, var(--rc) 16%, var(--panel-2)), var(--panel-2) 60%); }
.mcd-rare p { margin: 6px 0 0; font-size: var(--body); line-height: 1.45; }
.mcd-rare-big { font-size: calc(24px * var(--scale, 1)); font-weight: 900; letter-spacing: -0.02em; color: var(--rc); text-shadow: 0 1px 0 rgba(0,0,0,0.15); }
.mcd-ladder { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.mcd-rung { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 6px 10px; border-radius: 10px; background: var(--panel); border-left: 5px solid var(--rc); font-size: calc(13px * var(--scale, 1)); }
.mcd-rung .rung-name { font-weight: 800; }
.mcd-rung .rung-n { color: var(--ink-muted); font-size: calc(12px * var(--scale, 1)); text-align: right; }
.mcd-rung.on { background: color-mix(in srgb, var(--rc) 22%, var(--panel)); box-shadow: 0 0 0 2px var(--rc), 0 4px 14px color-mix(in srgb, var(--rc) 35%, transparent); }
.mcd-rung.on .rung-name::after { content: "  ← this card"; font-weight: 700; color: var(--ink-muted); font-size: calc(11.5px * var(--scale, 1)); }
.mcd-set-line { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: var(--body); }
.mcd-bar { height: 10px; border-radius: 999px; background: var(--panel); overflow: hidden; margin-top: 8px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2); }
.mcd-bar div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #3fb950, #7ee787 60%, #ffd23f); box-shadow: 0 0 10px rgba(63,185,80,0.55); }
.mcd-details { margin-top: 10px; }
.mcd-details summary { cursor: pointer; font-weight: 700; font-size: calc(13px * var(--scale, 1)); color: var(--accent); }
.mcd-missing { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.mcd-miss { font: inherit; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; text-align: left; border: none; border-radius: 10px; background: var(--panel); color: var(--ink); padding: 8px 10px; cursor: pointer; touch-action: manipulation; font-size: calc(13px * var(--scale, 1)); }
.mcd-miss:active { transform: scale(0.98); }
.mcd-miss .mm-num { color: var(--ink-faint); font-variant-numeric: tabular-nums; font-weight: 700; }
.mcd-miss .mm-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mcd-miss .mm-rar { font-weight: 800; font-size: calc(12px * var(--scale, 1)); }
.t-row:has(> .mcd-hero-line) { flex-wrap: wrap; }
.mcd-hero-line { flex: 1 0 100%; display: block; margin-top: 2px; font-size: var(--t-sub); font-weight: 700; line-height: 1.25; color: color-mix(in srgb, #e6b422 70%, var(--ink)); overflow-wrap: anywhere; }
.mcd-item { cursor: default; }
.mcd-item .mm-rar { color: var(--ink-faint); font-weight: 600; }
.mcd-done { margin-top: 8px; font-weight: 800; color: var(--ok); }
.mcd-progress { margin-top: 14px; border-radius: 18px; padding: 14px; background: linear-gradient(160deg, rgba(63,185,80,0.16), var(--panel) 55%); border: 1px solid rgba(63,185,80,0.35); box-shadow: 0 8px 24px rgba(63,185,80,0.12), var(--shadow); }
.mcd-head { display: flex; gap: 10px; align-items: center; }
.mcd-title { font-size: calc(15px * var(--scale, 1)); font-weight: 900; letter-spacing: -0.01em; }
.mcd-sub { font-size: calc(12.5px * var(--scale, 1)); color: var(--ink-muted); }
.mcd-series { margin-top: 10px; background: var(--panel); border-radius: 14px; padding: 10px 12px; border: 1px solid var(--panel-2); }
.mcd-series.lit { border-color: rgba(63,185,80,0.4); }
.mcd-series-top { font: inherit; width: 100%; display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; background: none; border: none; padding: 0; color: var(--ink); cursor: pointer; text-align: left; touch-action: manipulation; }
.mcd-series-top .ms-name { font-size: calc(14px * var(--scale, 1)); min-width: 0; }
.mcd-series-top .ms-name small { color: var(--ink-muted); font-weight: 600; }
.mcd-series-top .ms-count { font-size: calc(13px * var(--scale, 1)); color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.mcd-series-top .ms-count b { color: var(--ink); }
.mcd-series .ms-left { margin-top: 6px; font-size: calc(12px * var(--scale, 1)); color: var(--ink-muted); font-weight: 600; }
.mcd-series .ms-chev { display: inline-block; transition: transform 0.2s ease; }
.mcd-series.open .ms-chev { transform: rotate(90deg); }
.mcd-trade-note { display: flex; gap: 8px; align-items: center; margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(63,185,80,0.12); font-size: calc(12.5px * var(--scale, 1)); line-height: 1.35; }
.mcd-trade-note span { min-width: 0; overflow-wrap: anywhere; }
`;
function injectCss() {
  if (document.getElementById("pokescan-mcd-css")) return;
  const st = document.createElement("style");
  st.id = "pokescan-mcd-css";
  st.textContent = STYLE;
  document.head.appendChild(st);
}
