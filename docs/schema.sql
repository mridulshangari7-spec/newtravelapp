-- Starting schema for a real backend (Postgres / Supabase). Not applied anywhere yet.
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  kyc_status text not null default 'none' check (kyc_status in ('none','pending','verified','rejected')),
  rating_avg numeric(2,1) default 0,
  created_at timestamptz default now()
);
create table trips (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null references users(id),
  from_city text not null, to_city text not null,
  travel_date date not null,
  capacity_kg numeric(4,1) not null, fee_inr integer not null,
  status text not null default 'open' check (status in ('open','full','done','cancelled'))
);
create table requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id),
  item text not null, value_inr integer not null,
  from_city text not null, to_city text not null,
  needed_by date not null, weight_kg numeric(4,1) not null, reward_inr integer not null,
  status text not null default 'open' check (status in ('open','matched','done','cancelled'))
);
create table deals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id), request_id uuid references requests(id),
  stage text not null default 'accepted'
    check (stage in ('accepted','paid_held','picked_up','delivered','paid_out','disputed')),
  amount_inr integer not null,
  safety_ack_at timestamptz, customs_ack_at timestamptz,
  created_at timestamptz default now()
);
create table ratings (
  deal_id uuid references deals(id), rater_id uuid references users(id), ratee_id uuid references users(id),
  stars smallint not null check (stars between 1 and 5),
  primary key (deal_id, rater_id)
);
