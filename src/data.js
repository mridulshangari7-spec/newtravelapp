// Demo data and rules. Replace with a real backend later.
const CITIES = {
  domestic: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Jaipur"],
  international: ["New York", "San Francisco", "London", "Dubai", "Singapore", "Toronto"]
};
const ALL_CITIES = [...CITIES.domestic, ...CITIES.international];
const isIntl = (from, to) => !(CITIES.domestic.includes(from) && CITIES.domestic.includes(to));

// Items that must never be carried. Shown as a mandatory checklist.
const PROHIBITED = [
  "Medicines or controlled substances",
  "Alcohol, tobacco or vaping products",
  "Batteries/power banks beyond airline limits, flammables",
  "Cash, gold or high-value jewellery",
  "Weapons, drones or anything restricted by law",
  "Sealed parcels the traveller has not been allowed to inspect"
];

// Escrow-style deal flow
const STAGES = ["Accepted", "Paid (held)", "Picked up", "Delivered", "Paid out"];

const SEED = {
  trips: [
    { id: "t1", name: "Aarav S.", verified: true, rating: 4.9, from: "Mumbai", to: "Delhi", date: "2026-10-20", capacityKg: 5, feeInr: 600 },
    { id: "t2", name: "Neha K.", verified: true, rating: 4.7, from: "New York", to: "Delhi", date: "2026-10-24", capacityKg: 8, feeInr: 3500 },
    { id: "t3", name: "Rohan M.", verified: false, rating: 4.2, from: "Bengaluru", to: "Mumbai", date: "2026-10-18", capacityKg: 3, feeInr: 400 },
    { id: "t4", name: "Simran P.", verified: true, rating: 4.8, from: "Dubai", to: "Mumbai", date: "2026-10-27", capacityKg: 6, feeInr: 2500 }
  ],
  requests: [
    { id: "r1", name: "Kabir T.", verified: true, item: "Running shoes (sealed box)", valueInr: 9000, from: "New York", to: "Delhi", by: "2026-11-05", weightKg: 1.5, rewardInr: 3000 },
    { id: "r2", name: "Isha R.", verified: true, item: "Handmade sweets (sealed, labelled)", valueInr: 1200, from: "Mumbai", to: "Delhi", by: "2026-10-21", weightKg: 1, rewardInr: 500 },
    { id: "r3", name: "Dev A.", verified: false, item: "Camera lens", valueInr: 22000, from: "Dubai", to: "Mumbai", by: "2026-11-01", weightKg: 1, rewardInr: 2200 }
  ],
  deals: []
};
