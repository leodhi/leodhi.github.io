// Poké Scan: Moshe's Collectr wishes (2026-09-30, his Dad tapped "approved, do it").
//
// Moshe answered "Which parts of Collectr do you want most?" with: each card's price history;
// how much my whole collection is worth, over time; and "The setup. As in the colors and placement".
// (His avatar and whole-screen claim wishes are built in index.html, by the chat that took them.)
//
// 1. Price history, on every card's page: the store's own recent averages (Cardmarket: the last
//    30 days, the last 7 days, yesterday, and its trend), plus a line of the price saved once a
//    day by Poké Scan itself from Sept 30, 2026 on, whenever someone in the family opens it.
// 2. Collection worth over time, at the top of My cards: the total with a chart (1W 1M 3M 1Y
//    All). Days saved by Poké Scan are a solid line; before the first saved day the line is
//    worked out from when each card was added, at today's prices, and drawn dashed.
// 3. The Collectr look: dark colors like Collectr, the worth up top, prices big under each
//    card, and the tabs along the bottom. Moshe's own setting (on for him; everyone else is
//    asked once, and it is a switch in Options).
//
// Saved history lives in its own document, homeApps/pokescanHistory, so the family's main
// document never grows by a line a day (Firestore stops a document at 1 MB). It has the same
// owner and the same family list as homeApps/pokescan:
//   prices.{cardKey}.{YYYY-MM-DD} = dollars      (cardKey = card id with . / ~ made _, plus __finish)
//   worth.{nameKey}.{YYYY-MM-DD}  = dollars      (nameKey "_all" = everyone together)
//   names.{nameKey} = the name as written
// Nothing here changes a card, a name or money; it only reads them and adds history.

const RANGE_KEY = "pokescan-worth-range";
const RANGES = [["1W", 7], ["1M", 30], ["3M", 91], ["1Y", 365], ["All", 0]];
export const HISTORY_START = "2026-09-30";

let api = null;
let hist = null;          // the history document as last seen (null until it arrives)
let histLoaded = false, histUnsub = null, histUid = "", creating = false;
let recordTimer = null;

const ck = id => String(id || "").replace(/[.\/~]/g, "_");
const nk = n => String(n || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") || "_";
const slug = f => String(f || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
export function today(d) {
  const t = d ? new Date(d) : new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}
const dayMs = 86400000;
const parseDay = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d).getTime(); };

export function setupCollectr(a) {
  api = a;
  return { onSignedIn, onState, worthHtml, wireWorth, cardHistoryHtml, noteCardPrice, applyLook, priceKey };
}

// ---------------------------------------------------------------- the history document
function onSignedIn(db, fs, user) {
  if (histUnsub) { histUnsub(); histUnsub = null; }
  hist = null; histLoaded = false; histUid = user ? user.uid : "";
  if (!user) return;
  api.fs = fs; api.db = db;
  histUnsub = fs.onSnapshot(fs.doc(db, "homeApps", "pokescanHistory"), snap => {
    hist = snap.exists() ? snap.data() : null;
    histLoaded = true;
    soon();
    try { api.redrawHistory(); } catch (e) {}
  }, err => { histLoaded = false; console.warn("price history:", err && err.message); });
}
// Called after every change to the family's document.
function onState() { soon(); }
function soon() { clearTimeout(recordTimer); recordTimer = setTimeout(record, 1500); }

function priceKey(cardId, finish) { return ck(cardId) + (finish ? "__" + slug(finish) : ""); }

// Today's worth for each person and everyone, and today's price of every card someone has.
function todaysNumbers() {
  const st = api.state();
  const worth = {}, names = {}, prices = {};
  Object.values(st.cards || {}).forEach(e => {
    if (!api.live(e) || !e.who) return;
    const v = api.cardWorth(e) * (Number(e.qty) || 1);
    const k = nk(e.who);
    worth[k] = (worth[k] || 0) + v; names[k] = e.who;
    worth._all = (worth._all || 0) + v;
    const p = Number(e.snap && e.snap.price) || 0;
    if (p > 0 && !e.fake && e.snap.priceAt && today(e.snap.priceAt) === today()) prices[priceKey(e.cardId, e.finish)] = Math.round(p * 100) / 100;
  });
  Object.keys(worth).forEach(k => { worth[k] = Math.round(worth[k] * 100) / 100; });
  return { worth, names, prices };
}
async function ensureDoc() {
  if (hist || creating || !api.fs) return !!hist;
  const st = api.state();
  if (!st.sharedWith || !histUid) return false;
  creating = true;
  try {
    // Same family as the main document: the person creating it is its owner on paper (the rules
    // only let you claim a document for yourself), Dad's email owns it too, and the family list
    // is copied, so everyone who can open Poké Scan can open its history.
    await api.fs.setDoc(api.fs.doc(api.db, "homeApps", "pokescanHistory"), {
      ownerUid: histUid, ownerEmail: st.ownerEmail || "", sharedWith: st.sharedWith.slice(),
      startedAt: Date.now(), prices: {}, worth: {}, names: {}
    }, { merge: true });
    return true;
  } catch (e) { console.warn("price history: couldn't start it:", e && e.message); return false; }
  finally { creating = false; }
}
async function record() {
  if (!histLoaded || !api.fs || !api.signedIn()) return;
  const st = api.state();
  if (!Object.keys(st.cards || {}).length) return;
  if (!hist) { await ensureDoc(); return; }   // the snapshot that follows records today
  const d = today();
  const { worth, names, prices } = todaysNumbers();
  const patch = {};
  for (const [k, v] of Object.entries(worth)) if (((hist.worth || {})[k] || {})[d] !== v) patch["worth." + k + "." + d] = v;
  for (const [k, n] of Object.entries(names)) if ((hist.names || {})[k] !== n) patch["names." + k] = n;
  for (const [k, v] of Object.entries(prices)) if (((hist.prices || {})[k] || {})[d] !== v) patch["prices." + k + "." + d] = v;
  // Only Dad (the owner of the family's main document) may change who is on the history's
  // list: firestore.rules refuses it from anyone else (2026-10-04), and a refusal throws away the
  // whole save, so a family phone would lose that day's prices. His phone brings the list into
  // step the next time he opens Poke Scan.
  const fam = (st.sharedWith || []).slice().sort().join(",");
  if (fam && api.ownsMain && api.ownsMain() && fam !== (hist.sharedWith || []).slice().sort().join(",")) patch.sharedWith = st.sharedWith.slice();
  if (!Object.keys(patch).length) return;
  try { await api.fs.updateDoc(api.fs.doc(api.db, "homeApps", "pokescanHistory"), patch); }
  catch (e) { console.warn("price history: couldn't save today:", e && e.message); }
}
// A card's page with a price: that price is today's point for the card, owned or not.
function noteCardPrice(c, finish, price) {
  if (!hist || !api.fs || !c || !c.id || !(price > 0) || /^(ygo|ptcg|mcd):/.test(c.id)) return;
  const k = priceKey(c.id, finish), d = today(), v = Math.round(price * 100) / 100;
  if (((hist.prices || {})[k] || {})[d] === v) return;
  hist = { ...hist, prices: { ...(hist.prices || {}), [k]: { ...((hist.prices || {})[k] || {}), [d]: v } } };
  api.fs.updateDoc(api.fs.doc(api.db, "homeApps", "pokescanHistory"), { ["prices." + k + "." + d]: v }).catch(() => {});
}

// ---------------------------------------------------------------- charts
function points(obj) { return Object.entries(obj || {}).filter(([d, v]) => /^\d{4}-\d\d-\d\d$/.test(d) && isFinite(v)).map(([d, v]) => ({ t: parseDay(d), v: Number(v) })).sort((a, b) => a.t - b.t); }
// Before the first saved day: each day's worth from when each card was added (and taken out),
// at today's prices. Marked as worked out, never passed off as a saved price.
function workedOut(person, before) {
  const st = api.state();
  const entries = Object.values(st.cards || {}).filter(e => e && e.snap && e.addedAt && (person === "*" || e.who === person));
  if (!entries.length) return [];
  const first = Math.min(...entries.map(e => e.addedAt));
  const out = [];
  const end = before || parseDay(today());
  for (let t = parseDay(today(first)); t < end; t += dayMs) {
    const dayEnd = t + dayMs;
    let v = 0;
    entries.forEach(e => { if (e.addedAt < dayEnd && (!e.deletedAt || e.deletedAt >= dayEnd)) v += api.cardWorth(e) * (Number(e.qty) || 1); });
    out.push({ t, v: Math.round(v * 100) / 100, est: true });
  }
  return out;
}
function svgLine(pts, opts) {
  const W = 340, H = opts.h || 140, P = 6;
  if (!pts.length) return "";
  const t0 = opts.from || pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + dayMs);
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs);
  const pad = (hi - lo) * 0.12 || Math.max(hi * 0.1, 1);
  const y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const X = t => P + (W - 2 * P) * (t - t0) / (t1 - t0), Y = v => H - P - (H - 2 * P) * (v - y0) / (y1 - y0);
  const path = list => list.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ");
  const est = pts.filter(p => p.est), real = pts.filter(p => !p.est);
  if (est.length && real.length) est.push(real[0]);   // joins the two lines
  const up = pts[pts.length - 1].v >= pts[0].v;
  const col = up ? "var(--cl-up)" : "var(--cl-down)";
  const area = real.length > 1 ? path(real) + ` L${X(real[real.length - 1].t).toFixed(1)} ${H - P} L${X(real[0].t).toFixed(1)} ${H - P} Z` : "";
  const dot = real.length === 1 ? `<circle cx="${X(real[0].t).toFixed(1)}" cy="${Y(real[0].v).toFixed(1)}" r="4" fill="${col}"/>` : "";
  return `<svg class="cl-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${api.escapeAttr(opts.label || "chart")}">
    ${area ? `<path d="${area}" fill="${col}" opacity="0.13"/>` : ""}
    ${est.length > 1 ? `<path d="${path(est)}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="4 4" opacity="0.7" vector-effect="non-scaling-stroke"/>` : ""}
    ${real.length > 1 ? `<path d="${path(real)}" fill="none" stroke="${col}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` : ""}${dot}
  </svg>`;
}
const fmtDay = t => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// ---------------------------------------------------------------- collection worth (My cards)
let range = (() => { try { const r = localStorage.getItem(RANGE_KEY); return RANGES.some(x => x[0] === r) ? r : "1M"; } catch (e) { return "1M"; } })();
function worthHtml(person, value) {
  const k = person === "*" ? "_all" : nk(person);
  const saved = points(hist && (hist.worth || {})[k]);
  const all = workedOut(person, saved.length ? saved[0].t : 0).concat(saved);
  // Today's number is always the one on screen now, saved or not yet.
  const tnow = parseDay(today());
  const merged = all.filter(p => p.t < tnow).concat([{ t: tnow, v: Math.round(value * 100) / 100, est: !saved.length }]);
  const days = (RANGES.find(r => r[0] === range) || RANGES[1])[1];
  const from = days ? tnow - days * dayMs : merged[0].t;
  let shown = merged.filter(p => p.t >= from);
  const before = merged.filter(p => p.t < from);
  if (before.length) shown = [{ ...before[before.length - 1], t: from }].concat(shown);
  const start = shown.length ? shown[0].v : value;
  const diff = value - start, pct = start ? diff / start * 100 : 0;
  const up = diff >= 0;
  const words = { "1W": "this week", "1M": "this month", "3M": "in 3 months", "1Y": "this year", "All": "since the first card" }[range];
  const est = shown.some(p => p.est);
  return `<div class="cl-worth" id="cl-worth">
    <div class="cl-label">${person === "*" ? "Everyone's collection" : api.escapeHtml(person) + "'s collection"}</div>
    <div class="cl-value">${api.money(value)}</div>
    <div class="cl-change ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${api.money(Math.abs(diff))} (${up ? "+" : "−"}${Math.abs(pct).toFixed(1)}%) <span>${words}</span></div>
    ${shown.length > 1 ? svgLine(shown, { from, label: "What the collection was worth over time" }) : `<div class="cl-empty">The line starts here and grows a point every day.</div>`}
    <div class="cl-axis"><span>${shown.length ? fmtDay(shown[0].t) : ""}</span><span>Today</span></div>
    <div class="cl-ranges" role="group" aria-label="How far back">${RANGES.map(([r]) => `<button type="button" class="cl-range${r === range ? " on" : ""}" data-cl-range="${r}" aria-pressed="${r === range}">${r}</button>`).join("")}</div>
    ${est ? `<div class="cl-note">Dashed: worked out from when each card was added, at today's prices. Solid: what Poké Scan saved that day (it saves once a day, from ${fmtDay(parseDay(HISTORY_START))}).</div>` : ""}
  </div>`;
}
function wireWorth(root, redraw) {
  root.querySelectorAll("[data-cl-range]").forEach(b => b.addEventListener("click", () => {
    range = b.dataset.clRange;
    try { localStorage.setItem(RANGE_KEY, range); } catch (e) {}
    redraw();
  }));
}

// ---------------------------------------------------------------- a card's price history
function cardHistoryHtml(c, finish, headline) {
  if (!c || !c.id || /^(ygo|mcd):/.test(c.id)) return "";
  const cm = c.pricing && c.pricing.cardmarket;
  const k = priceKey(c.id, finish), k0 = priceKey(c.id, "");
  let saved = points(hist && ((hist.prices || {})[k] || (hist.prices || {})[k0]));
  const tnow = parseDay(today());
  if (headline > 0) saved = saved.filter(p => p.t < tnow).concat([{ t: tnow, v: headline }]);
  const conv = v => (v === null || v === undefined || isNaN(v) || !(Number(v) > 0)) ? null : api.usd(Number(v));
  const avgs = cm ? [["Last 30 days", conv(cm.avg30)], ["Last 7 days", conv(cm.avg7)], ["Yesterday", conv(cm.avg1)], ["Trend", conv(cm.trend)]].filter(r => r[1]) : [];
  if (!saved.length && !avgs.length) return `<div class="price-box cl-history"><div class="box-title">Price history</div><div class="field-note">No price on file for this one yet, so there's no history.</div></div>`;
  let move = "";
  if (cm && conv(cm.avg30) && conv(cm.avg1)) {
    const a = conv(cm.avg30), b = conv(cm.avg1), p = (b - a) / a * 100;
    move = `<div class="cl-change ${b >= a ? "up" : "down"}" style="margin-top:4px">${b >= a ? "▲" : "▼"} ${Math.abs(p).toFixed(1)}% <span>yesterday compared with the last 30 days (Cardmarket)</span></div>`;
  }
  const first = saved.length ? saved[0].t : 0;
  return `<div class="price-box cl-history"><div class="box-title">Price history <small>dollars</small></div>
    ${saved.length > 1 ? svgLine(saved, { h: 110, label: "This card's price, day by day" }) + `<div class="cl-axis"><span>${fmtDay(first)}</span><span>Today</span></div>` : ""}
    <div class="field-note" style="margin-top:6px">${saved.length > 1 ? "Saved by Poké Scan once a day" : "Poké Scan saves this card's price once a day from today, so a line grows here day by day"}${saved.length ? " (today " + api.money(saved[saved.length - 1].v) + ")" : ""}.</div>
    ${avgs.length ? `<table class="price-table" style="margin-top:8px"><thead><tr><th>Cardmarket average</th><th class="num">Price</th></tr></thead><tbody>${avgs.map(([l, v]) => `<tr><td class="site">${l}</td><td class="num">${api.money(v)}</td></tr>`).join("")}</tbody></table>${move}` : ""}
  </div>`;
}

// ---------------------------------------------------------------- the Collectr look
function applyLook(on) {
  if (on) document.documentElement.setAttribute("data-look", "collectr");
  else document.documentElement.removeAttribute("data-look");
}
