-- migration: create initial schema for ai flashcard learning platform
-- purpose: set up core tables (decks, flashcards, reviews) with row level security
-- affected tables: decks, flashcards, reviews
-- author: ai assistant
-- date: 2025-10-26

-- ============================================================
-- table: decks
-- purpose: organizes flashcards into collections by topic/subject
-- relationships: owned by auth.users, contains flashcards
-- ============================================================

create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade on update cascade,
  name varchar(255) not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),

  constraint decks_name_not_empty check (trim(name) != ''),
  constraint decks_unique_name_per_user unique (user_id, name)
);

-- index for user-specific deck queries
create index idx_decks_user_id on decks(user_id);

-- ============================================================
-- table: flashcards
-- purpose: stores individual flashcard content and spaced repetition data
-- relationships: belongs to deck, owned by user, has many reviews
-- ============================================================

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade on update cascade,
  user_id uuid not null references auth.users(id) on delete cascade on update cascade,
  front text not null,
  back text not null,
  is_ai_generated boolean not null default false,
  next_review_date date not null default current_date,
  ease_factor decimal not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),

  constraint flashcards_front_not_empty check (trim(front) != ''),
  constraint flashcards_back_not_empty check (trim(back) != '')
);

-- index for deck-specific flashcard queries
create index idx_flashcards_deck_id on flashcards(deck_id);

-- composite index for finding cards due for review
-- this is the most common query pattern in the application
-- covers queries filtering by user_id and next_review_date
-- note: cannot use partial index with current_date as it's not immutable
create index idx_flashcards_due_review
  on flashcards(user_id, next_review_date, deck_id);

-- ============================================================
-- table: reviews
-- purpose: records individual study session events for spaced repetition tracking
-- relationships: belongs to flashcard, owned by user
-- ============================================================

create table reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references flashcards(id) on delete cascade on update cascade,
  user_id uuid not null references auth.users(id) on delete cascade on update cascade,
  reviewed_at timestamp not null default now(),
  difficulty_rating smallint not null,
  next_review_date date not null,

  constraint reviews_rating_range check (difficulty_rating between 0 and 3)
);

-- composite index for flashcard review history queries
create index idx_reviews_flashcard_reviewed on reviews(flashcard_id, reviewed_at);

-- ============================================================
-- triggers and functions
-- purpose: automatically update updated_at timestamps on row modifications
-- ============================================================

-- function to update updated_at column automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger for decks table
create trigger update_decks_updated_at
  before update on decks
  for each row
  execute function update_updated_at_column();

-- trigger for flashcards table
create trigger update_flashcards_updated_at
  before update on flashcards
  for each row
  execute function update_updated_at_column();

-- ============================================================
-- row level security (rls)
-- purpose: ensure users can only access their own data
-- security model: complete data isolation between users
-- ============================================================

-- enable row level security on all tables
alter table decks enable row level security;
alter table flashcards enable row level security;
alter table reviews enable row level security;

-- ============================================================
-- rls policies: decks table
-- access pattern: users can only read/write their own decks
-- ============================================================

-- select policy: users can view only their own decks
create policy decks_select_policy on decks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert policy: users can only create decks for themselves
create policy decks_insert_policy on decks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- update policy: users can only update their own decks
create policy decks_update_policy on decks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- delete policy: users can only delete their own decks
-- warning: this cascades to all flashcards and reviews in the deck
create policy decks_delete_policy on decks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- rls policies: flashcards table
-- access pattern: users can only read/write their own flashcards
-- ============================================================

-- select policy: users can view only their own flashcards
create policy flashcards_select_policy on flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert policy: users can only create flashcards for themselves
create policy flashcards_insert_policy on flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- update policy: users can only update their own flashcards
-- this includes updating spaced repetition fields after reviews
create policy flashcards_update_policy on flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- delete policy: users can only delete their own flashcards
-- warning: this cascades to all reviews for the flashcard
create policy flashcards_delete_policy on flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- rls policies: reviews table
-- access pattern: users can only read/write their own reviews
-- ============================================================

-- select policy: users can view only their own reviews
create policy reviews_select_policy on reviews
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert policy: users can only create reviews for themselves
create policy reviews_insert_policy on reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- update policy: users can only update their own reviews
-- note: updates are rarely needed but included for data correction scenarios
create policy reviews_update_policy on reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- delete policy: users can only delete their own reviews
-- note: deletes are rarely needed but included for data management scenarios
create policy reviews_delete_policy on reviews
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- migration complete
-- tables created: decks, flashcards, reviews
-- indexes created: 4 (1 standard per table + 1 partial composite)
-- triggers created: 2 (updated_at automation)
-- rls policies created: 12 (4 per table for all crud operations)
-- ============================================================
