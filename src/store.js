// Two interchangeable data layers. app.js only talks to `store`.
//  - demo store: browser localStorage, fake OTP login.
//  - cloud store: Supabase (email login, shared data, row level security).
const CFG = window.CARRYON_CONFIG || {};
const CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);

const trip2ui = r => ({ id: r.id, name: r.profiles?.name || "Traveller", verified: !!r.profiles?.verified,
  rating: r.profiles?.rating_count ? +(r.profiles.rating_sum / r.profiles.rating_count).toFixed(1) : 0,
  from: r.from_city, to: r.to_city, date: r.travel_date, capacityKg: +r.capacity_kg, feeInr: r.fee_inr, userId: r.user_id });
const req2ui = r => ({ id: r.id, name: r.profiles?.name || "Sender", verified: !!r.profiles?.verified,
  item: r.item, valueInr: r.value_inr, from: r.from_city, to: r.to_city, by: r.needed_by, weightKg: +r.weight_kg, rewardInr: r.reward_inr, userId: r.user_id });

const cloudStore = (() => {
  const sb = window.supabase && CFG.supabaseUrl ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
  let me = null; // auth user id
  const fail = e => { if (e) throw new Error(e.message || String(e)); };
  const PROFILE = "profiles(name,verified,rating_sum,rating_count)";
  return {
    mode: "cloud",
    async init() {
      const { data } = await sb.auth.getSession();
      me = data.session?.user?.id || null;
      return this.load();
    },
    async load() {
      if (!me) return { user: null, trips: [], requests: [], deals: [] };
      const [p, t, r, d] = await Promise.all([
        sb.from("profiles").select("name,verified").eq("id", me).single(),
        sb.from("trips").select(`*, ${PROFILE}`).gte("travel_date", new Date().toISOString().slice(0, 10)).order("created_at", { ascending: false }),
        sb.from("requests").select(`*, ${PROFILE}`).order("created_at", { ascending: false }),
        sb.from("deals").select("*, traveller:profiles!deals_traveller_id_fkey(name), sender:profiles!deals_sender_id_fkey(name)").order("created_at", { ascending: false })
      ]);
      [p, t, r, d].forEach(x => fail(x.error));
      return {
        user: { id: me, name: p.data.name, verified: p.data.verified },
        trips: t.data.map(trip2ui), requests: r.data.map(req2ui),
        deals: d.data.map(x => {
          const iAmTraveller = x.traveller_id === me;
          return { id: x.id, stage: x.stage, route: x.route, intl: x.intl, item: x.item, amountInr: x.amount_inr,
            counterpart: (iAmTraveller ? x.sender : x.traveller)?.name || "Other party", createdAt: x.created_at.slice(0, 10),
            rating: iAmTraveller ? x.sender_rating : x.traveller_rating, // rating I gave
            canRate: iAmTraveller ? x.sender_rating == null : x.traveller_rating == null, iAmTraveller };
        })
      };
    },
    async signUp(name, email, password) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
      fail(error);
      if (!data.session) throw new Error("Account created. Confirm your email, then sign in.");
      me = data.session.user.id;
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      fail(error); me = data.user.id;
    },
    async signOut() { await sb.auth.signOut(); me = null; },
    async verify() { fail((await sb.rpc("demo_verify_me")).error); },
    async addTrip(f) {
      fail((await sb.from("trips").insert({ from_city: f.from, to_city: f.to, travel_date: f.date, capacity_kg: +f.capacityKg, fee_inr: +f.feeInr })).error);
    },
    async addRequest(f) {
      fail((await sb.from("requests").insert({ item: f.item, value_inr: +f.valueInr, from_city: f.from, to_city: f.to, needed_by: f.by, weight_kg: +f.weightKg, reward_inr: +f.rewardInr })).error);
    },
    // kind "req": I carry someone's request. kind "trip": I send with someone's trip.
    async createDeal(kind, item, intl) {
      if (item.userId === me) throw new Error("You can't make a deal with yourself");
      const row = kind === "req"
        ? { traveller_id: me, sender_id: item.userId, item: item.item, amount_inr: item.rewardInr }
        : { traveller_id: item.userId, sender_id: me, item: "Item to be agreed with traveller", amount_inr: item.feeInr };
      fail((await sb.from("deals").insert({ ...row, route: `${item.from} → ${item.to}`, intl })).error);
    },
    async advance(d) { fail((await sb.from("deals").update({ stage: d.stage + 1 }).eq("id", d.id)).error); },
    async rate(d, n) { fail((await sb.from("deals").update(d.iAmTraveller ? { sender_rating: n } : { traveller_rating: n }).eq("id", d.id)).error); }
  };
})();

const demoStore = (() => {
  const KEY = "carryon.v1";
  let s;
  const read = () => { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.trips) return j; } catch (e) {} return JSON.parse(JSON.stringify(SEED)); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  const snap = () => JSON.parse(JSON.stringify(s));
  return {
    mode: "demo",
    async init() { s = read(); return snap(); },
    async load() { return snap(); },
    demoLogin(name, phone) { s.user = { name: name || "You", phone, verified: false }; save(); },
    async signOut() { s.user = null; save(); },
    async verify() { s.user.verified = true; save(); },
    async addTrip(f) { s.trips.unshift({ id: uid("t"), name: s.user.name, verified: s.user.verified, rating: 5, from: f.from, to: f.to, date: f.date, capacityKg: +f.capacityKg, feeInr: +f.feeInr }); save(); },
    async addRequest(f) { s.requests.unshift({ id: uid("r"), name: s.user.name, verified: s.user.verified, item: f.item, valueInr: +f.valueInr, from: f.from, to: f.to, by: f.by, weightKg: +f.weightKg, rewardInr: +f.rewardInr }); save(); },
    async createDeal(kind, item, intl) {
      s.deals.push({ id: uid("d"), stage: 0, route: `${item.from} → ${item.to}`, intl,
        item: kind === "req" ? item.item : "Item to be agreed with traveller",
        amountInr: kind === "req" ? item.rewardInr : item.feeInr, counterpart: item.name, createdAt: new Date().toISOString().slice(0, 10), canRate: true });
      save();
    },
    async advance(d) { const x = s.deals.find(y => y.id === d.id); if (x) x.stage++; save(); },
    async rate(d, n) { const x = s.deals.find(y => y.id === d.id); if (x) x.rating = n; save(); }
  };
})();

const store = CLOUD ? cloudStore : demoStore;
