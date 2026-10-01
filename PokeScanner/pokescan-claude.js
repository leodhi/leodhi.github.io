// Poké Scan reads a card with Claude on Dad's plan, on his Mac at home (2026-10-01).
// His words: "No, update Poké Scan. It was Gemini only because I didn't want to pay extra.",
// then "Is that safe?" and "have an ask-me question if they can and I approve it."
//
// WHAT HAPPENS. Claude is first in "Which AI reads and answers" for whoever may use it: Dad
// always, anyone else after he says yes on his phone ("Ask Dad to use Claude"). After the picture
// is taken, Poké Scan opens a small page that the Mac at home serves itself, in a new window, with
// the picture and the sign-in riding in that page's own address after the "#" (which never leaves
// the phone: no server or log sees it, and the Mac's page wipes it the moment it reads it). The
// Mac's page hands both to the Mac on its own address, gets the card's name, number and set back,
// tells this page, and closes itself. If it can't (the page behind it isn't linked any more, as
// happens on iPhones), it shows the answer with "Back to Poké Scan", which brings it here.
//
// WHY A WINDOW. Poké Scan is a secure (https) page on GitHub; browsers do not let such a page talk
// to a plain address at home. Opening a page is allowed, so the Mac's own page does the talking.
// It is the way the bug ladybug reaches the Mac, proven from Dad's iPhone (the "#" way).
//
// EVERYTHING ELSE IS GEMINI. Away from home, not allowed yet, 100 today, 6 this minute, the Mac
// busy or Claude stuck: the Mac (or the missing answer) says so and Gemini reads the same picture.
// The Mac checks everything itself (pokescan_plan.py in leodhi/apps); nothing here is trusted by it.

const SITE = "https://leodhi.github.io";
// Dad's own devices reach the Mac over his private network at this address (the same one Home and
// the games already use). Family phones use the Mac's address on the home Wi-Fi, which the Mac
// itself writes into Poké Scan's settings (claudeHome) when Dad first says yes to someone.
export const MAC_PRIVATE = "http://100.95.155.127:8787";
const HOME_SHAPE = /^http:\/\/[A-Za-z0-9-]{1,63}\.local:8787$/;
const READER = "/pokescan/claude/reader";
const AWAY_KEY = "pokescan-claude-away";      // when the Mac last couldn't be reached from here
const OK_KEY = "pokescan-claude-ok";          // Dad's yes heard on this phone, before the copy arrives
const AWAY_MS = 20 * 60000;
const SEEN_MS = 12000;                         // looking at this page this long with no word from the Mac: not reached
const BACK_GRACE = 2500;                       // after coming back to this page, a moment for words already sent
const ANSWER_MS = 4 * 60000;                   // the Mac's own limit is shorter; the page never waits for ever
const PICTURE_PX = 1024;                       // enough for the small number at the bottom, small enough for an address

function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
function put(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
function hex(n) { const b = crypto.getRandomValues(new Uint8Array(n)); return Array.from(b, x => x.toString(16).padStart(2, "0")).join(""); }

// A card answer that came back through "Back to Poké Scan" (#claude-read=...), taken off the
// address at once so it isn't kept in the history or read twice.
export function takeReturn() {
  const m = /(?:^#|&)claude-read=([^&]+)/.exec(location.hash || "");
  if (!m) return null;
  const rest = (location.hash || "").replace(/(?:^#|&)claude-read=[^&]+/, "").replace(/^[#&]/, "");
  try { history.replaceState(null, "", location.pathname + location.search + (rest ? "#" + rest : "")); } catch (e) {}
  try {
    const a = JSON.parse(decodeURIComponent(m[1]));
    return a && typeof a === "object" ? a : null;
  } catch (e) { return null; }
}

// ctx: { isOwner(), who(), settings(), user(), ownerName(), sendAsk, watchAnswer, loadPending,
//        forgetPending, askApp, save(patch), toast(text), redraw(), searchFor(read) }
export function setupClaude(ctx) {
  const returned = takeReturn();

  function homeAddress() {
    const v = String((ctx.settings() || {}).claudeHome || "");
    return HOME_SHAPE.test(v) ? v : "";
  }
  function address() { return ctx.isOwner() ? MAC_PRIVATE : homeAddress(); }
  function localOk(name) {
    try { const v = JSON.parse(get(OK_KEY) || "{}")[name]; return v === true || (typeof v === "number" && v > Date.now()); } catch (e) { return false; }
  }
  function noteLocalOk(name, until) {
    let all = {};
    try { all = JSON.parse(get(OK_KEY) || "{}") || {}; } catch (e) {}
    if (until) all[name] = until; else delete all[name];
    put(OK_KEY, JSON.stringify(all));
  }
  function allowedFor(name) {
    if (ctx.isOwner()) return true;
    if (!name) return false;
    const v = ((ctx.settings() || {}).claudeAllowed || {})[name];
    if (v === true || (typeof v === "number" && v > Date.now())) return true;
    if (v === false) return false;
    return localOk(name);
  }
  function askedBy(name) {
    if (!name) return false;
    if (((ctx.settings() || {}).claudeAsked || {})[name]) return true;
    return ctx.loadPending(ctx.askApp).some(p => p.kind === "claude" && p.name === name && !/^(done|failed|no)$/.test(p.state));
  }
  function awayRecently() { const t = Number(get(AWAY_KEY)) || 0; return Date.now() - t < AWAY_MS; }
  function allowedText(name) {
    if (ctx.isOwner()) return "free — on your Mac";
    const v = ((ctx.settings() || {}).claudeAllowed || {})[name];
    if (typeof v === "number" && v > Date.now()) {
      const h = (v - Date.now()) / 3600000;
      return "free · " + (h >= 48 ? Math.round(h / 24) + " days left" : h >= 1.5 ? Math.round(h) + " hours left" : Math.max(1, Math.round(h * 60)) + " min left");
    }
    return "free — on " + ctx.ownerName() + "'s Mac";
  }

  // { id, name, usable, state, ask } for the reader rows, in plain words.
  function readerState() {
    const who = ctx.who();
    const name = "Claude";
    if (!ctx.isOwner()) {
      if (!who) return { id: "claude", name, usable: false, state: "pick your name first" };
      if (!allowedFor(who)) {
        return askedBy(who) ? { id: "claude", name, usable: false, state: "asked " + ctx.ownerName() + " — waiting for an OK" }
          : { id: "claude", name, usable: false, state: "free, on " + ctx.ownerName() + "'s Mac — needs " + ctx.ownerName() + "'s OK", ask: true };
      }
      if (!homeAddress()) return { id: "claude", name, usable: false, state: ctx.ownerName() + "'s Mac isn't set up for this yet" };
    }
    if (awayRecently()) return { id: "claude", name, usable: true, state: ctx.isOwner() ? "your Mac didn't answer a moment ago" : "only at home, on the home Wi-Fi" };
    return { id: "claude", name, usable: true, state: allowedText(who) + (ctx.isOwner() ? "" : " · home Wi-Fi") };
  }
  // First in line when it can be used and the Mac wasn't out of reach a moment ago.
  function first() { const r = readerState(); return r.usable && !awayRecently(); }

  // ---- the ask -------------------------------------------------------------------------------
  let watch = null;
  async function ask() {
    const who = ctx.who();
    if (!who || ctx.isOwner()) return false;
    const asked = { ...((ctx.settings() || {}).claudeAsked || {}), [who]: Date.now() };
    ctx.save({ claudeAsked: asked });
    const r = await ctx.sendAsk({ app: ctx.askApp, kind: "claude", name: who, user: ctx.user() });
    if (r.ok) follow(r.pending);
    else ctx.toast(r.reason);
    ctx.redraw();
    return r.ok;
  }
  function follow(pending) {
    if (watch) watch();
    watch = ctx.watchAnswer(ctx.askApp, pending, p => {
      const boss = ctx.ownerName();
      if (p.state === "asked") ctx.toast("It's on " + boss + "'s phone now, with Yes and No");
      else if (p.state === "yes") ctx.toast(boss + " said yes — turning Claude on for you");
      else if (p.state === "done") { noteLocalOk(p.name, Date.now() + 12 * 3600000); ctx.toast("Claude is on for you. It reads cards when you're on the home Wi-Fi."); }
      else if (p.state === "no") {
        noteLocalOk(p.name, 0);
        const asked = { ...((ctx.settings() || {}).claudeAsked || {}) }; delete asked[p.name];
        ctx.save({ claudeAsked: asked });
        ctx.toast(boss + " said no to Claude this time");
      } else if (p.state === "failed") ctx.toast(boss + " said yes, but it didn't go through. " + boss + " has been told.");
      if (/^(done|failed|no)$/.test(p.state)) { ctx.forgetPending(ctx.askApp, p.id); watch = null; }
      ctx.redraw();
    });
  }

  // ---- reading one picture -------------------------------------------------------------------
  function smaller(shot) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const s = Math.min(1, PICTURE_PX / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const url = c.toDataURL("image/jpeg", 0.8);
          resolve({ data: url.split(",")[1], mime: "image/jpeg" });
        } catch (e) { resolve({ data: shot.data, mime: shot.mime }); }
      };
      img.onerror = () => resolve({ data: shot.data, mime: shot.mime });
      img.src = shot.dataUrl;
    });
  }

  function trouble(msg, extra) {
    const e = new Error(msg);
    e.claudeTrouble = true;
    Object.assign(e, extra || {});
    return e;
  }

  // Opens the Mac's page with everything it needs after the "#". Must run inside a tap.
  function open(addr, payload) {
    try { return window.open(addr + READER + "#d=" + encodeURIComponent(JSON.stringify(payload)), "pokescan-claude-" + payload.id); }
    catch (e) { return null; }
  }

  // Waits for the Mac's page: "got" (it has the picture), then the answer. Time only counts while
  // this page is the one being looked at -- on a phone the Mac's page is in front while it works.
  function hear(addr, id, onGot) {
    const origin = new URL(addr).origin.toLowerCase();
    return new Promise(resolve => {
      let got = false, seen = 0, last = Date.now(), wasHidden = false, backAt = 0, over = false;
      const startedAt = Date.now();
      function done(v) { if (over) return; over = true; clearInterval(tick); window.removeEventListener("message", onMsg); resolve(v); }
      function onMsg(e) {
        if (String(e.origin || "").toLowerCase() !== origin) return;
        const d = e.data;
        if (!d || typeof d !== "object" || d.id !== id) return;
        if (d.type === "pokescan-claude-got") { got = true; seen = 0; onGot(); return; }
        if (d.type === "pokescan-claude-answer") done(d);
      }
      window.addEventListener("message", onMsg);
      const tick = setInterval(() => {
        const now = Date.now(), visible = document.visibilityState === "visible";
        if (visible) seen += now - last; else wasHidden = true;
        if (visible && wasHidden && !backAt) backAt = now;
        last = now;
        if (now - startedAt > ANSWER_MS) return done({ ok: false, code: got ? "slow" : "unreached" });
        if (got) return;
        if (seen >= SEEN_MS || (backAt && now - backAt >= BACK_GRACE)) done({ ok: false, code: "unreached" });
      }, 250);
    });
  }

  // read(shot, say, tapFirst) -> {name, suffix, number, total, set} or throws. tapFirst(openIt)
  // shows a button; its tap calls openIt() right there, inside the tap (a browser opens a window
  // only then), and resolves with what it returned -- or with "gemini" when they chose Gemini.
  async function read(shot, say, tapFirst) {
    const addr = address();
    if (!addr) throw trouble(ctx.ownerName() + "'s Mac isn't set up for Claude yet.");
    const u = ctx.user();
    let token = "";
    try { token = u ? await u.getIdToken() : ""; } catch (e) { token = ""; }
    if (!token) throw trouble("Sign in again to use Claude.");
    const pic = await smaller(shot);
    const id = hex(8);
    const payload = { v: 1, id, token, image: pic.data, mime: pic.mime, back: location.origin + location.pathname };
    let win = open(addr, payload);               // works when the tap is still fresh (a computer, mostly)
    if (!win) {
      const got = await tapFirst(() => open(addr, payload));   // a phone: one tap opens it
      if (got === "gemini") throw trouble("You picked Gemini for this one.", { skipped: true });
      win = got;
      if (!win) throw trouble("The browser didn't let Poké Scan open the Mac's page.");
    }
    payload.token = ""; payload.image = "";      // nothing of it kept here once it's on its way
    const mac = ctx.isOwner() ? "your Mac" : ctx.ownerName() + "'s Mac";
    say("Claude is reading it on " + mac + "…");
    const a = await hear(addr, id, () => say("Claude has the picture and is reading it…"));
    try { if (win && !win.closed) win.close(); } catch (e) {}
    if (a.code === "unreached") {
      put(AWAY_KEY, String(Date.now()));
      ctx.redraw();
      throw trouble(ctx.isOwner() ? "Your Mac didn't answer (is Tailscale on?)." : ctx.ownerName() + "'s Mac can't be reached from here: Claude works on the home Wi-Fi.");
    }
    put(AWAY_KEY, "");
    if (a.code === "slow") throw trouble("Claude on the Mac is taking too long.");
    if (!a.ok) {
      if (a.code === "not_allowed" || a.code === "ran_out") { noteLocalOk(ctx.who(), 0); ctx.redraw(); }
      if (a.code === "place") { put(AWAY_KEY, String(Date.now())); ctx.redraw(); }
      throw trouble(words(a));
    }
    return a.read;
  }

  function words(a) {
    const boss = ctx.ownerName();
    return {
      place: "Claude on " + boss + "'s Mac only works on the home Wi-Fi.",
      not_allowed: "Claude needs " + boss + "'s OK first.",
      ran_out: boss + "'s OK for Claude has run out. Ask again.",
      signin: "Sign in again to use Claude.",
      day: "That's 100 cards with Claude today. Gemini reads the rest until tomorrow.",
      minute: "That's 6 cards with Claude this minute. Gemini reads this one.",
      busy: boss + "'s Mac is busy reading other cards.",
      picture: "That picture couldn't be sent to Claude."
    }[a.code] || (a.reason || "Claude on the Mac couldn't read it this time.");
  }

  // Once the app has its data: a Claude answer that came back by "Back to Poké Scan", and a
  // Claude ask still waiting (its answer may have come while the app was closed).
  let tookReturn = false;
  function afterLoad() {
    for (const p of ctx.loadPending(ctx.askApp)) if (p.kind === "claude" && p.name === ctx.who() && !watch) follow(p);
    if (returned && !tookReturn) {
      tookReturn = true;
      if (returned.ok && returned.read && returned.read.name) ctx.searchFor(returned.read);
      else if (returned.code) ctx.toast(words(returned));
    }
  }

  return { readerState, first, allowedFor, ask, read, afterLoad, words, homeAddress, awayRecently };
}
