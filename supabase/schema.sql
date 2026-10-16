-- CarryOn backend for Supabase. Paste into SQL Editor and Run (safe to run once on a fresh project).
-- Auth: Supabase email + password. Payments are NOT implemented; deal stages are just a status.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Traveller',
  verified boolean not null default false,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  from_city text not null, to_city text not null check (from_city <> to_city),
  travel_date date not null,
  capacity_kg numeric(4,1) not null check (capacity_kg > 0 and capacity_kg <= 23),
  fee_inr integer not null check (fee_inr >= 0),
  created_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  item text not null check (char_length(item) between 1 and 80),
  value_inr integer not null check (value_inr >= 0),
  from_city text not null, to_city text not null check (from_city <> to_city),
  needed_by date not null,
  weight_kg numeric(4,1) not null check (weight_kg > 0 and weight_kg <= 10),
  reward_inr integer not null check (reward_inr >= 0),
  created_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null references public.profiles(id),
  sender_id uuid not null references public.profiles(id),
  route text not null, item text not null,
  intl boolean not null default false,
  amount_inr integer not null check (amount_inr >= 0),
  stage smallint not null default 0 check (stage between 0 and 4),
  traveller_rating smallint check (traveller_rating between 1 and 5), -- rating given TO the traveller
  sender_rating smallint check (sender_rating between 1 and 5),       -- rating given TO the sender
  created_at timestamptz not null default now(),
  check (traveller_id <> sender_id)
);

-- New auth user => profile row
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stage can only move forward one step at a time; ratings only after payout and only once.
create function public.deals_guard() returns trigger language plpgsql as $$
begin
  if new.traveller_id <> old.traveller_id or new.sender_id <> old.sender_id
     or new.amount_inr <> old.amount_inr or new.route <> old.route or new.item <> old.item then
    raise exception 'deal terms cannot change';
  end if;
  if new.stage <> old.stage and new.stage <> old.stage + 1 then
    raise exception 'stage can only advance by one';
  end if;
  if (new.traveller_rating is distinct from old.traveller_rating) and
     (old.traveller_rating is not null or old.stage < 4 or auth.uid() <> old.sender_id) then
    raise exception 'only the sender can rate the traveller, once, after payout';
  end if;
  if (new.sender_rating is distinct from old.sender_rating) and
     (old.sender_rating is not null or old.stage < 4 or auth.uid() <> old.traveller_id) then
    raise exception 'only the traveller can rate the sender, once, after payout';
  end if;
  return new;
end $$;
create trigger deals_guard before update on public.deals
  for each row execute function public.deals_guard();

-- Keep profile rating totals in sync
create function public.deals_rating_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.traveller_rating is not null and old.traveller_rating is null then
    update profiles set rating_sum = rating_sum + new.traveller_rating, rating_count = rating_count + 1 where id = new.traveller_id;
  end if;
  if new.sender_rating is not null and old.sender_rating is null then
    update profiles set rating_sum = rating_sum + new.sender_rating, rating_count = rating_count + 1 where id = new.sender_id;
  end if;
  return new;
end $$;
create trigger deals_rating_sync after update on public.deals
  for each row execute function public.deals_rating_sync();

-- TEMPORARY demo "Verify ID" button. Remove this function once real KYC exists.
create function public.demo_verify_me() returns void language sql security definer set search_path = public as $$
  update profiles set verified = true where id = auth.uid();
$$;
revoke all on function public.demo_verify_me() from public, anon;
grant execute on function public.demo_verify_me() to authenticated;

-- Row level security
alter table public.profiles enable row level security;
alter table public.trips    enable row level security;
alter table public.requests enable row level security;
alter table public.deals    enable row level security;

create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "edit own profile name" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- users can not set verified/ratings themselves:
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

create policy "trips readable"        on public.trips for select to authenticated using (true);
create policy "insert own trip"       on public.trips for insert to authenticated with check (user_id = auth.uid());
create policy "update own trip"       on public.trips for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own trip"       on public.trips for delete to authenticated using (user_id = auth.uid());

create policy "requests readable"     on public.requests for select to authenticated using (true);
create policy "insert own request"    on public.requests for insert to authenticated with check (user_id = auth.uid());
create policy "update own request"    on public.requests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own request"    on public.requests for delete to authenticated using (user_id = auth.uid());

create policy "deal participants read"   on public.deals for select to authenticated using (auth.uid() in (traveller_id, sender_id));
create policy "deal participants create" on public.deals for insert to authenticated
  with check (auth.uid() in (traveller_id, sender_id) and stage = 0 and traveller_rating is null and sender_rating is null);
create policy "deal participants update" on public.deals for update to authenticated
  using (auth.uid() in (traveller_id, sender_id)) with check (auth.uid() in (traveller_id, sender_id));
