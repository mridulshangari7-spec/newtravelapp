let state = { user: null, trips: [], requests: [], deals: [] };
let tab = "browse";
let filter = { scope: "all", from: "", to: "" };
const inr = n => "₹" + Number(n).toLocaleString("en-IN");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);

// Run a store action, then reload data and redraw. Errors are shown, not thrown.
async function act(fn, okMsg) {
  try { await fn(); state = await store.load(); render(); if (okMsg) toast(okMsg); }
  catch (e) { toast(e.message || "Something went wrong"); }
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}
const opts = (list, sel = "") => list.map(c => `<option ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join("");
const badge = u => u ? `<span class="pill ok">ID verified</span>` : `<span class="pill warn">Not verified</span>`;
const scopeBadge = (f, t) => isIntl(f, t) ? `<span class="pill warn">International · customs</span>` : `<span class="pill">Domestic</span>`;

// A trip can carry a request if the route matches, it lands before the deadline and fits the weight.
function matches(trip, req) {
  return trip.from === req.from && trip.to === req.to && trip.date <= req.by && trip.capacityKg >= req.weightKg;
}
function passesFilter(x) {
  if (filter.scope === "domestic" && isIntl(x.from, x.to)) return false;
  if (filter.scope === "international" && !isIntl(x.from, x.to)) return false;
  if (filter.from && x.from !== filter.from) return false;
  if (filter.to && x.to !== filter.to) return false;
  return true;
}

const mine = x => !!(x.userId && state.user && x.userId === state.user.id);

function renderBrowse() {
  const trips = state.trips.filter(passesFilter);
  const reqs = state.requests.filter(passesFilter);
  return `
  <div class="filters">
    <select id="fScope">${["all", "domestic", "international"].map(s => `<option value="${s}" ${filter.scope === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select>
    <select id="fFrom"><option value="">From: any</option>${opts(ALL_CITIES, filter.from)}</select>
    <select id="fTo"><option value="">To: any</option>${opts(ALL_CITIES, filter.to)}</select>
  </div>
  <h2>Requests waiting for a traveller</h2>
  ${reqs.length ? reqs.map(reqCard).join("") : `<p class="mute">No requests match.</p>`}
  <h2>Upcoming trips</h2>
  ${trips.length ? trips.map(tripCard).join("") : `<p class="mute">No trips match.</p>`}`;
}
function reqCard(r) {
  const m = state.trips.filter(t => matches(t, r));
  return `<div class="card">
    <div class="row"><span class="route">${esc(r.from)} → ${esc(r.to)}</span><span class="price">${inr(r.rewardInr)}</span></div>
    <div>${esc(r.item)}</div>
    <div class="mute">${esc(r.name)} · ${r.weightKg} kg · value ${inr(r.valueInr)} · needed by ${esc(r.by)}</div>
    <div>${scopeBadge(r.from, r.to)}${badge(r.verified)}<span class="pill">${m.length} matching trip${m.length === 1 ? "" : "s"}</span></div>
    <div class="row" style="margin-top:8px"><span></span>${mine(r) ? `<span class="pill">Your request</span>` : `<button class="btn" data-accept-req="${r.id}">I can carry this</button>`}</div>
  </div>`;
}
function tripCard(t) {
  const m = state.requests.filter(r => matches(t, r));
  return `<div class="card">
    <div class="row"><span class="route">${esc(t.from)} → ${esc(t.to)}</span><span class="price">${inr(t.feeInr)}</span></div>
    <div class="mute">${esc(t.name)} ★${t.rating} · flies ${esc(t.date)} · up to ${t.capacityKg} kg</div>
    <div>${scopeBadge(t.from, t.to)}${badge(t.verified)}<span class="pill">${m.length} matching request${m.length === 1 ? "" : "s"}</span></div>
    <div class="row" style="margin-top:8px"><span></span>${mine(t) ? `<span class="pill">Your trip</span>` : `<button class="btn ghost" data-book-trip="${t.id}">Send with this traveller</button>`}</div>
  </div>`;
}

function renderTrip() {
  return `<h2>List your trip</h2><p class="mute">Earn by carrying verified, sealed items on a trip you're already taking.</p>
  <form id="tripForm" class="card">
    <label>From</label><select name="from">${opts(ALL_CITIES, "Mumbai")}</select>
    <label>To</label><select name="to">${opts(ALL_CITIES, "Delhi")}</select>
    <label>Travel date</label><input type="date" name="date" min="${today()}" required>
    <label>Spare capacity (kg)</label><input type="number" name="capacityKg" min="0.5" max="23" step="0.5" value="3" required>
    <label>Your fee (₹, total)</label><input type="number" name="feeInr" min="100" value="500" required>
    <button class="btn" style="margin-top:12px">Publish trip</button>
  </form>`;
}
function renderRequest() {
  return `<h2>Request an item</h2><p class="mute">Pick the route, describe the item and set a reward for the traveller.</p>
  <form id="reqForm" class="card">
    <label>Item</label><input name="item" maxlength="80" placeholder="e.g. Sealed running shoes" required>
    <label>Item value (₹)</label><input type="number" name="valueInr" min="100" value="2000" required>
    <label>From</label><select name="from">${opts(ALL_CITIES, "Mumbai")}</select>
    <label>To</label><select name="to">${opts(ALL_CITIES, "Delhi")}</select>
    <label>Needed by</label><input type="date" name="by" min="${today()}" required>
    <label>Weight (kg)</label><input type="number" name="weightKg" min="0.1" max="10" step="0.1" value="1" required>
    <label>Reward for traveller (₹)</label><input type="number" name="rewardInr" min="100" value="500" required>
    <button class="btn" style="margin-top:12px">Post request</button>
  </form>`;
}

// Mandatory safety/customs gate before any deal is created.
function openGate(kind, id) {
  if (!state.user.verified) return toast("Verify your ID first to make a deal");
  const item = kind === "req" ? state.requests.find(r => r.id === id) : state.trips.find(t => t.id === id);
  const intl = isIntl(item.from, item.to);
  const v = document.getElementById("view");
  v.innerHTML = `<h2>Before you continue</h2>
  <div class="card">
    <div class="route">${esc(item.from)} → ${esc(item.to)} ${scopeBadge(item.from, item.to)}</div>
    <div class="notice">The traveller must be allowed to inspect the item. Never carry anything sealed that you can't open.</div>
    <p class="mute">Confirm none of these apply:</p>
    ${PROHIBITED.map((p, i) => `<label class="check"><input type="checkbox" class="gate" data-i="${i}"> ${esc(p)}</label>`).join("")}
    ${intl ? `<div class="notice">International route: the item may attract customs duty. Declare it at customs and keep the receipt. The platform doesn't make that call for you.</div>
    <label class="check"><input type="checkbox" class="gate"> I will declare the item at customs and pay any duty due.</label>` : ""}
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="gateBack">Back</button><button class="btn" id="gateGo" disabled>Create deal</button></div>
  </div>`;
  const boxes = [...v.querySelectorAll(".gate")];
  const go = document.getElementById("gateGo");
  boxes.forEach(b => b.onchange = () => go.disabled = !boxes.every(x => x.checked));
  document.getElementById("gateBack").onclick = () => render();
  go.onclick = () => act(async () => { await store.createDeal(kind, item, intl); tab = "deals"; }, "Deal created");
}

function renderDeals() {
  if (!state.deals.length) return `<h2>My deals</h2><p class="mute">No deals yet. Accept a request or book a trip from Browse.</p>`;
  return `<h2>My deals</h2>` + state.deals.map(d => `<div class="card">
    <div class="row"><span class="route">${esc(d.route)}</span><span class="price">${inr(d.amountInr)}</span></div>
    <div>${esc(d.item)}</div>
    <div class="mute">With ${esc(d.counterpart)} · ${esc(d.createdAt)} ${d.intl ? "· International" : ""}</div>
    <div class="steps">${STAGES.map((_, i) => `<span class="${i <= d.stage ? "done" : ""}"></span>`).join("")}</div>
    <div class="row"><b>${STAGES[d.stage]}</b>
      ${d.stage < STAGES.length - 1 ? `<button class="btn" data-advance="${d.id}">Mark: ${STAGES[d.stage + 1]}</button>` : `<span class="pill ok">Complete</span>`}
    </div>
    ${d.stage === STAGES.length - 1 ? `<div class="row"><span class="mute">${d.rating ? "You rated" : "Rate"} ${esc(d.counterpart)}</span><div class="stars">${[1,2,3,4,5].map(n => `<button ${d.rating ? "disabled" : ""} class="${d.rating >= n ? "on" : ""}" data-rate="${n}" data-deal="${d.id}" aria-label="${n} star">★</button>`).join("")}</div></div>` : ""}
    <p class="mute">Money is held by the platform until delivery is confirmed (simulated in this demo).</p>
  </div>`).join("");
}

function renderLogin(step = 1, phone = "", name = "", creating = false) {
  const v = document.getElementById("view");
  document.getElementById("tabs").hidden = true;
  const cloud = store.mode === "cloud";
  v.innerHTML = `<div class="login card">
    <h1>Welcome to CarryOn</h1>
    <p class="mute">Sign in to list trips, post requests and make deals.</p>
    ${cloud ? `<form id="authForm">
      ${creating ? `<label for="aName">Your name</label><input id="aName" maxlength="40" autocomplete="name" required>` : ""}
      <label for="aEmail">Email</label><input id="aEmail" type="email" autocomplete="email" required>
      <label for="aPass">Password</label><input id="aPass" type="password" minlength="6" autocomplete="${creating ? "new-password" : "current-password"}" required>
      <button class="btn" style="margin-top:12px;width:100%">${creating ? "Create account" : "Sign in"}</button>
      <p class="mute" style="text-align:center"><a href="#" id="authSwap">${creating ? "Have an account? Sign in" : "New here? Create an account"}</a></p></form>`
    : step === 1 ? `<form id="loginForm">
      <label for="lName">Your name</label><input id="lName" maxlength="40" required value="${esc(name)}">
      <label for="lPhone">Mobile number</label><input id="lPhone" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" placeholder="10 digits" required value="${esc(phone)}">
      <button class="btn" style="margin-top:12px;width:100%">Send OTP</button></form>`
    : `<form id="otpForm"><div class="notice">Demo: enter OTP <b>1234</b>.</div>
      <label for="lOtp">OTP sent to +91 ${esc(phone)}</label><input id="lOtp" inputmode="numeric" maxlength="4" required>
      <button class="btn" style="margin-top:12px;width:100%">Verify and continue</button></form>`}
  </div>`;
  const $ = id => document.getElementById(id);
  if (cloud) {
    $("authSwap").onclick = e => { e.preventDefault(); renderLogin(1, "", "", !creating); };
    $("authForm").onsubmit = e => {
      e.preventDefault();
      act(() => creating ? store.signUp($("aName").value.trim(), $("aEmail").value.trim(), $("aPass").value)
                         : store.signIn($("aEmail").value.trim(), $("aPass").value));
    };
  } else if (step === 1) {
    $("loginForm").onsubmit = e => { e.preventDefault(); renderLogin(2, $("lPhone").value, $("lName").value.trim()); };
  } else {
    $("otpForm").onsubmit = e => {
      e.preventDefault();
      if ($("lOtp").value !== "1234") return toast("Wrong OTP");
      act(async () => store.demoLogin(name, phone));
    };
  }
}

function meStrip() {
  const u = state.user;
  return `<div class="me"><span>Hi, <b>${esc(u.name)}</b> ${u.verified ? `<span class="pill ok">ID verified</span>` : `<span class="pill warn">ID not verified</span>`}</span>
    <span>${u.verified ? "" : `<button class="btn ghost" id="verifyBtn">Verify ID</button> `}<button class="btn ghost" id="logoutBtn">Sign out</button></span></div>`;
}

function render() {
  if (!state.user) return renderLogin();
  document.getElementById("tabs").hidden = false;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const v = document.getElementById("view");
  v.innerHTML = meStrip() + { browse: renderBrowse, trip: renderTrip, request: renderRequest, deals: renderDeals }[tab]();
  bind();
}

function bind() {
  const q = s => document.querySelector(s);
  if (q("#verifyBtn")) q("#verifyBtn").onclick = () => act(() => store.verify(), "ID verified (demo)");
  if (q("#logoutBtn")) q("#logoutBtn").onclick = () => act(() => store.signOut());
  document.querySelectorAll("[data-rate]").forEach(b => b.onclick = () => {
    const d = state.deals.find(x => x.id === b.dataset.deal);
    if (d) act(() => store.rate(d, +b.dataset.rate), "Thanks for rating");
  });
  if (q("#fScope")) {
    q("#fScope").onchange = e => { filter.scope = e.target.value; render(); };
    q("#fFrom").onchange = e => { filter.from = e.target.value; render(); };
    q("#fTo").onchange = e => { filter.to = e.target.value; render(); };
  }
  document.querySelectorAll("[data-accept-req]").forEach(b => b.onclick = () => openGate("req", b.dataset.acceptReq));
  document.querySelectorAll("[data-book-trip]").forEach(b => b.onclick = () => openGate("trip", b.dataset.bookTrip));
  document.querySelectorAll("[data-advance]").forEach(b => b.onclick = () => {
    const d = state.deals.find(x => x.id === b.dataset.advance);
    if (d && d.stage < STAGES.length - 1) act(() => store.advance(d));
  });
  const tf = q("#tripForm"), rf = q("#reqForm");
  if (tf) tf.onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(tf));
    if (f.from === f.to) return toast("From and To must differ");
    act(async () => { await store.addTrip(f); tab = "browse"; }, "Trip published");
  };
  if (rf) rf.onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(rf));
    if (f.from === f.to) return toast("From and To must differ");
    act(async () => { await store.addRequest(f); tab = "browse"; }, "Request posted");
  };
}

document.getElementById("tabs").onclick = e => { const t = e.target.dataset.tab; if (t) { tab = t; render(); } };
(async () => {
  try { state = await store.init(); } catch (e) { toast(e.message); }
  render();
})();
