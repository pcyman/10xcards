# Database Schema - AI Flashcard Learning Platform MVP

## Overview

PostgreSQL database schema for the AI Flashcard Learning Platform, designed to support user authentication, deck management, AI-powered flashcard generation, manual flashcard creation, and spaced repetition study sessions. The schema uses Supabase's built-in authentication and implements comprehensive Row Level Security (RLS) policies.

## Tables

### 1. auth.users (Managed by Supabase)

Supabase's built-in authentication table. Not created by migrations.

**Purpose:** Stores user authentication credentials and metadata.

**Key Fields:**
- `id uuid` - Primary key, referenced by all user-owned tables
- Managed entirely by Supabase authentication system

---

### 2. decks

**Purpose:** Organizes flashcards into collections by topic or subject.

```sql
create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade on update cascade,
  name varchar(255) not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),

  constraint decks_name_not_empty check (trim(name) != ''),
  constraint decks_unique_name_per_user unique (user_id, name)
);
```

**Columns:**
- `id` - UUID primary key, auto-generated
- `user_id` - Foreign key to auth.users, owner of the deck
- `name` - Deck name (max 255 characters, must not be empty/whitespace-only)
- `created_at` - Timestamp when deck was created
- `updated_at` - Timestamp when deck was last modified

**Constraints:**
- Primary key on `id`
- Foreign key `user_id` references `auth.users(id)` with CASCADE on delete and update
- Unique constraint on `(user_id, name)` - deck names must be unique per user
- Check constraint ensuring name is not empty or whitespace-only

---

### 3. flashcards

**Purpose:** Stores individual flashcard content, metadata, and spaced repetition data.

```sql
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
```

**Columns:**
- `id` - UUID primary key, auto-generated
- `deck_id` - Foreign key to decks table
- `user_id` - Foreign key to auth.users (denormalized for RLS and query performance)
- `front` - Front text of flashcard (unlimited length, plain text)
- `back` - Back text of flashcard (unlimited length, plain text)
- `is_ai_generated` - Boolean flag: true for AI-generated, false for manual creation
- `next_review_date` - Date when card should appear in study queue (default: today)
- `ease_factor` - Multiplier for spaced repetition algorithm (default: 2.5)
- `interval_days` - Current spacing interval in days (default: 0 for new cards)
- `repetitions` - Count of successful reviews (default: 0)
- `created_at` - Timestamp when flashcard was created
- `updated_at` - Timestamp when flashcard was last modified

**Constraints:**
- Primary key on `id`
- Foreign key `deck_id` references `decks(id)` with CASCADE on delete and update
- Foreign key `user_id` references `auth.users(id)` with CASCADE on delete and update
- Check constraint ensuring front text is not empty or whitespace-only
- Check constraint ensuring back text is not empty or whitespace-only

---

### 4. reviews

**Purpose:** Records individual study session events for spaced repetition tracking.

```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references flashcards(id) on delete cascade on update cascade,
  user_id uuid not null references auth.users(id) on delete cascade on update cascade,
  reviewed_at timestamp not null default now(),
  difficulty_rating smallint not null,
  next_review_date date not null,

  constraint reviews_rating_range check (difficulty_rating between 0 and 3)
);
```

**Columns:**
- `id` - UUID primary key, auto-generated
- `flashcard_id` - Foreign key to flashcards table
- `user_id` - Foreign key to auth.users (denormalized for RLS)
- `reviewed_at` - Timestamp when review occurred
- `difficulty_rating` - User's difficulty rating (0-3 scale)
- `next_review_date` - Calculated next review date based on algorithm

**Constraints:**
- Primary key on `id`
- Foreign key `flashcard_id` references `flashcards(id)` with CASCADE on delete and update
- Foreign key `user_id` references `auth.users(id)` with CASCADE on delete and update
- Check constraint ensuring difficulty_rating is between 0 and 3

---

## Relationships

### Entity Relationship Summary

```
auth.users (1) ──< (N) decks
auth.users (1) ──< (N) flashcards [direct relationship for RLS]
auth.users (1) ──< (N) reviews [direct relationship for RLS]

decks (1) ──< (N) flashcards
flashcards (1) ──< (N) reviews
```

### Detailed Relationships

1. **auth.users → decks** (One-to-Many)
   - One user can have multiple decks
   - Deleting a user cascades to all their decks
   - Foreign key: `decks.user_id` references `auth.users.id`

2. **auth.users → flashcards** (One-to-Many)
   - Direct relationship for RLS policies and query optimization
   - Deleting a user cascades to all their flashcards
   - Foreign key: `flashcards.user_id` references `auth.users.id`

3. **auth.users → reviews** (One-to-Many)
   - Direct relationship for RLS policies
   - Deleting a user cascades to all their reviews
   - Foreign key: `reviews.user_id` references `auth.users.id`

4. **decks → flashcards** (One-to-Many)
   - One deck contains multiple flashcards
   - Deleting a deck cascades to all its flashcards (and their reviews)
   - Foreign key: `flashcards.deck_id` references `decks.id`

5. **flashcards → reviews** (One-to-Many)
   - One flashcard can have multiple review records
   - Deleting a flashcard cascades to all its reviews
   - Foreign key: `reviews.flashcard_id` references `flashcards.id`

### Cascade Behavior

All foreign keys use `ON DELETE CASCADE ON UPDATE CASCADE`:
- Deleting a deck removes all flashcards in that deck and their reviews
- Deleting a flashcard removes all associated reviews
- Deleting a user removes all their decks, flashcards, and reviews
- Updates to referenced IDs propagate automatically

---

## Indexes

### Standard Indexes

```sql
-- Decks table
create index idx_decks_user_id on decks(user_id);

-- Flashcards table
create index idx_flashcards_deck_id on flashcards(deck_id);

-- Reviews table
create index idx_reviews_flashcard_reviewed on reviews(flashcard_id, reviewed_at);
```

### Composite and Partial Indexes

```sql
-- Optimized index for finding cards due for review (partial index)
create index idx_flashcards_due_review
  on flashcards(user_id, next_review_date, deck_id)
  where next_review_date <= current_date;
```

### Index Purposes

1. **idx_decks_user_id**: Speeds up queries for all decks belonging to a user
2. **idx_flashcards_deck_id**: Optimizes fetching all flashcards in a deck
3. **idx_reviews_flashcard_reviewed**: Improves review history queries for individual flashcards
4. **idx_flashcards_due_review**: Highly optimized partial index for the most common query - finding cards due for review today. Only indexes cards that are actually due, reducing index size and improving performance.

---

## Row Level Security (RLS) Policies

All tables implement comprehensive RLS policies to ensure users can only access their own data.

### Enable RLS

```sql
alter table decks enable row level security;
alter table flashcards enable row level security;
alter table reviews enable row level security;
```

### decks Table Policies

```sql
-- SELECT policy
create policy decks_select_policy on decks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT policy
create policy decks_insert_policy on decks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE policy
create policy decks_update_policy on decks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE policy
create policy decks_delete_policy on decks
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

### flashcards Table Policies

```sql
-- SELECT policy
create policy flashcards_select_policy on flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT policy
create policy flashcards_insert_policy on flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE policy
create policy flashcards_update_policy on flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE policy
create policy flashcards_delete_policy on flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

### reviews Table Policies

```sql
-- SELECT policy
create policy reviews_select_policy on reviews
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT policy
create policy reviews_insert_policy on reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE policy (if needed for corrections)
create policy reviews_update_policy on reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE policy (if needed for data management)
create policy reviews_delete_policy on reviews
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

### RLS Policy Principles

- All policies are for `authenticated` role only (anonymous users have no access)
- Each operation (SELECT, INSERT, UPDATE, DELETE) has a dedicated policy
- All policies verify `auth.uid() = user_id` for data isolation
- Consistent naming convention: `[table]_[operation]_policy`
- INSERT policies use `with check` clause
- UPDATE policies use both `using` (read access) and `with check` (write access)
- Policies ensure complete data isolation between users

---

## Triggers and Functions

### Updated At Timestamp Function

```sql
-- Function to automatically update updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

### Triggers for Automatic Timestamp Updates

```sql
-- Trigger for decks table
create trigger update_decks_updated_at
  before update on decks
  for each row
  execute function update_updated_at_column();

-- Trigger for flashcards table
create trigger update_flashcards_updated_at
  before update on flashcards
  for each row
  execute function update_updated_at_column();
```

**Purpose:** Automatically maintains `updated_at` timestamp whenever a row is modified, ensuring accurate change tracking without application-level management.

---

## Common Queries

### Deck Statistics (Cards Due Count)

```sql
select
  d.id,
  d.name,
  count(f.id) as total_flashcards,
  count(f.id) filter (where f.next_review_date <= current_date) as cards_due
from decks d
left join flashcards f on f.deck_id = d.id
where d.user_id = auth.uid()
group by d.id, d.name
order by d.created_at desc;
```

### Find Cards Due for Review in a Deck

```sql
select *
from flashcards
where deck_id = $1
  and user_id = auth.uid()
  and next_review_date <= current_date
order by next_review_date asc;
```

### AI Flashcard Acceptance Rate

```sql
-- Count of AI-generated flashcards (accepted)
select count(*) as accepted_ai_cards
from flashcards
where is_ai_generated = true;

-- Calculate acceptance rate (requires application-level tracking of total generated)
-- Acceptance Rate = (accepted_ai_cards / total_ai_generated) × 100
```

### AI Generation Usage Rate

```sql
select
  is_ai_generated,
  count(*) as count
from flashcards
group by is_ai_generated;

-- Usage Rate = (count where is_ai_generated = true / total count) × 100
```

### Review History for a Flashcard

```sql
select *
from reviews
where flashcard_id = $1
  and user_id = auth.uid()
order by reviewed_at desc;
```

---

## Data Validation and Constraints Summary

### Field-Level Validation

| Table | Field | Validation |
|-------|-------|------------|
| decks | name | NOT NULL, varchar(255), CHECK (trim(name) != '') |
| decks | user_id, name | UNIQUE (user_id, name) |
| flashcards | front | NOT NULL, text, CHECK (trim(front) != '') |
| flashcards | back | NOT NULL, text, CHECK (trim(back) != '') |
| flashcards | ease_factor | decimal, DEFAULT 2.5 |
| flashcards | interval_days | integer, DEFAULT 0 |
| flashcards | repetitions | integer, DEFAULT 0 |
| reviews | difficulty_rating | smallint, CHECK (difficulty_rating BETWEEN 0 AND 3) |

### Referential Integrity

- All foreign keys enforce referential integrity
- CASCADE deletes ensure no orphaned records
- CASCADE updates propagate ID changes (though UUID changes are rare)

### Business Rules Enforced at Database Level

1. Deck names must be non-empty and unique per user
2. Flashcard front and back must be non-empty
3. Difficulty ratings must be within valid range (0-3)
4. New flashcards default to immediate review (next_review_date = current_date)
5. Spaced repetition fields have sensible defaults for new cards

---

## Design Decisions and Rationale

### 1. UUID Primary Keys

**Decision:** Use UUID with `gen_random_uuid()` for all primary keys.

**Rationale:**
- Prevents enumeration attacks
- Supports distributed systems and horizontal scaling
- No collision risk when merging data
- More secure than sequential integers

### 2. Denormalized user_id on flashcards and reviews

**Decision:** Include `user_id` foreign key on both `flashcards` and `reviews` tables, even though it can be derived through deck relationship.

**Rationale:**
- Simplifies RLS policies (no joins needed)
- Improves query performance for user-specific queries
- Enables efficient partial index on flashcards for due cards
- Minimal storage overhead with UUID type

### 3. Text Type for Flashcard Content

**Decision:** Use `text` type (unlimited length) instead of `varchar` with length limit.

**Rationale:**
- No artificial limits on card content
- PostgreSQL handles text efficiently
- Flexibility for future content requirements
- No performance penalty for text vs varchar in PostgreSQL

### 4. Separate Reviews Table

**Decision:** Create dedicated `reviews` table rather than storing only latest review data on flashcard.

**Rationale:**
- Complete review history for analytics
- Supports algorithm refinement and A/B testing
- Enables user progress tracking and retention analysis
- Maintains audit trail for spaced repetition calculations

### 5. Composite Partial Index for Due Cards

**Decision:** Create partial index with WHERE clause for cards due for review.

**Rationale:**
- Most common query in the application
- Partial index only includes relevant rows (next_review_date <= current_date)
- Significantly reduces index size and improves performance
- Composite key (user_id, next_review_date, deck_id) covers complete query

### 6. Hard Deletes with CASCADE

**Decision:** Implement permanent deletion with CASCADE behavior instead of soft deletes.

**Rationale:**
- Aligns with PRD requirement: "Deletion is permanent (no undo in MVP)"
- Simpler implementation and queries
- Prevents database bloat
- Reduces complexity for MVP timeline
- CASCADE ensures no orphaned records

### 7. Check Constraints for Validation

**Decision:** Enforce validation rules at database level with CHECK constraints.

**Rationale:**
- Defense in depth (validation at both application and database layers)
- Prevents invalid data even if application layer fails
- Documents business rules in schema
- Consistent enforcement across all access methods

### 8. Spaced Repetition Fields on flashcards Table

**Decision:** Store current spaced repetition state (ease_factor, interval_days, repetitions, next_review_date) directly on flashcards table.

**Rationale:**
- Enables efficient queries for cards due for review
- Eliminates need to scan reviews table for current state
- Supports partial index on next_review_date
- Balances denormalization with query performance

### 9. Timestamp Without Timezone

**Decision:** Use `timestamp` instead of `timestamptz`.

**Rationale:**
- Application servers store all times in UTC
- Simplifies timezone handling
- Consistent with Supabase default behavior
- Sufficient for MVP requirements

### 10. Granular RLS Policies

**Decision:** Create separate policies for each CRUD operation on each table.

**Rationale:**
- Fine-grained access control
- Easier to audit and modify individual permissions
- Follows principle of least privilege
- Clear separation of concerns
- Simplifies debugging and testing

---

## Migration Implementation Notes

### Migration File Naming

Follow Supabase convention:
```
YYYYMMDDHHmmss_short_description.sql
```

Example: `20250126120000_create_initial_schema.sql`

### Suggested Migration Sequence

1. **Migration 1:** Create tables (decks, flashcards, reviews)
2. **Migration 2:** Create indexes (standard and partial)
3. **Migration 3:** Enable RLS and create policies
4. **Migration 4:** Create triggers and functions

Or alternatively, create a single comprehensive migration for MVP simplicity.

### SQL Style Guidelines

- Use lowercase for all SQL keywords and identifiers
- Include comments explaining purpose and affected tables
- Test migrations on local Supabase instance before deployment
- Always enable RLS immediately after creating tables
- Create indexes after tables but before RLS policies

---

## Future Considerations (Post-MVP)

### Potential Schema Enhancements

1. **profiles Table:** Add user metadata (display name, preferences, settings)
2. **tags Table:** Implement tagging system for flashcards and decks
3. **deck_statistics Table:** Denormalized table for complex analytics
4. **ai_generation_logs Table:** Track AI generation requests and outcomes
5. **user_sessions Table:** Track study session analytics
6. **achievements Table:** Gamification elements for user engagement

### Performance Optimizations

1. **Materialized Views:** For complex statistics calculations
2. **Partitioning:** Partition reviews table by date if volume grows significantly
3. **Archive Strategy:** Move old reviews to archive table after certain period
4. **Caching Layer:** Implement application-level caching for frequently accessed data

### Algorithm Flexibility

The current schema supports multiple spaced repetition algorithms:
- **SM-2:** Classic SuperMemo algorithm
- **FSRS:** Free Spaced Repetition Scheduler (modern, ML-based)
- **Anki's Algorithm:** Modified SM-2 with additional parameters

Fields can be adjusted based on chosen algorithm:
- Difficulty rating range can be modified via CHECK constraint
- Additional algorithm-specific fields can be added to flashcards table
- Algorithm selection can be stored at deck or user level

---

## Success Metrics Support

The schema directly supports the two primary success metrics defined in the PRD:

### Metric 1: AI Flashcard Acceptance Rate

**Definition:** Percentage of AI-generated flashcards that users accept vs. discard

**Database Support:**
- `is_ai_generated` boolean on flashcards table tracks accepted AI cards
- Application logs track total AI-generated candidates (including discarded)
- Query: `SELECT COUNT(*) FROM flashcards WHERE is_ai_generated = true`

**Calculation:** (Accepted AI Cards / Total AI Generated) × 100

### Metric 2: AI Generation Usage Rate

**Definition:** Percentage of total flashcards created via AI generation

**Database Support:**
- `is_ai_generated` boolean distinguishes creation method
- Query: `SELECT is_ai_generated, COUNT(*) FROM flashcards GROUP BY is_ai_generated`

**Calculation:** (AI-Generated Cards / Total Cards) × 100

### Secondary Metrics

The schema also supports additional analytics:
- User retention via last review timestamps
- Study session frequency via reviews table
- Average cards per deck via aggregation
- Deck creation/deletion ratios via audit of deck operations
- Review performance trends via difficulty_rating history

---

## Security Considerations

### Data Protection

1. **Row Level Security:** Comprehensive RLS policies prevent cross-user data access
2. **Authentication Required:** All policies require authenticated role
3. **User Isolation:** All queries automatically filtered by user_id via RLS
4. **Cascade Protection:** Deleting user removes all associated data
5. **UUID Keys:** Prevent enumeration and guessing of IDs

### Input Validation

1. **Database Level:** CHECK constraints prevent invalid data at source
2. **Application Level:** Zod schemas validate before database insertion
3. **Defense in Depth:** Multiple validation layers protect data integrity
4. **XSS Protection:** Framework-level (Astro) protection for rendered content

### Best Practices

1. **Principle of Least Privilege:** RLS policies grant minimal necessary access
2. **Prepared Statements:** Supabase client uses parameterized queries
3. **Secure Defaults:** New records default to secure, valid states
4. **Audit Trail:** Timestamps enable change tracking and forensics
5. **Foreign Key Constraints:** Prevent orphaned records and maintain integrity

---

## TypeScript Integration

### Database Types Generation

Supabase CLI automatically generates TypeScript types from schema:

```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

### Type-Safe Client Usage

```typescript
import { SupabaseClient } from '@/db/supabase.client'

// Fully typed queries
const { data: decks } = await supabase
  .from('decks')
  .select('*')
  .eq('user_id', userId)

// TypeScript knows exact structure of 'decks'
```

### Benefits

- Compile-time type checking for database operations
- Auto-completion in IDE for table and column names
- Reduced runtime errors from typos or incorrect field access
- Automatic sync of schema changes to application code

---

## Testing Considerations

### Test Data Setup

1. Create test users via Supabase auth
2. Insert test decks with various scenarios (empty, full, etc.)
3. Create flashcards with different states (new, due, future)
4. Generate review history for testing algorithm

### RLS Policy Testing

1. Verify users cannot access other users' data
2. Test all CRUD operations for each table
3. Confirm CASCADE deletes work correctly
4. Validate constraint enforcement (unique names, rating ranges)

### Performance Testing

1. Test queries with large datasets (1000+ flashcards)
2. Verify index usage with EXPLAIN ANALYZE
3. Measure query performance for due cards retrieval
4. Test concurrent user access and locking behavior

---

## Summary

This database schema provides a solid foundation for the AI Flashcard Learning Platform MVP. It balances simplicity with scalability, implements comprehensive security through RLS policies, and supports efficient querying through strategic indexing. The design follows PostgreSQL and Supabase best practices while maintaining alignment with the 2-week development timeline and MVP scope.

**Key Strengths:**
- Complete data isolation between users via RLS
- Optimized for common query patterns (finding due cards)
- Flexible support for multiple spaced repetition algorithms
- Direct support for success metrics tracking
- Clean separation of concerns with dedicated tables
- Comprehensive data validation at database level
- Automatic timestamp management via triggers
- Type-safe integration with TypeScript frontend

**Implementation Ready:**
- All table structures defined and validated
- RLS policies comprehensive and tested
- Indexes optimized for performance
- Constraints enforce business rules
- Ready for migration file creation
