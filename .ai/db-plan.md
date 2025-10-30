# Database Planning Summary - AI Flashcard Learning Platform MVP

## Decisions

### Round 1 - Core Schema Design

1. **Authentication Strategy**: Use Supabase's built-in `auth.users` table for authentication (username/password), with an optional `profiles` table for additional user metadata if needed.

2. **Deck Name Uniqueness**: Implement a unique constraint on `(user_id, name)` in the `decks` table to prevent duplicate deck names per user.

3. **Flashcard Text Storage**: Use `text` data type (unlimited length) for flashcard front and back fields, providing flexibility without artificial limits.

4. **AI Generation Tracking**: Track only the `is_ai_generated` boolean field for MVP. Do not store original input text or additional generation metadata.

5. **Review History Structure**: Create a separate `reviews` table with one row per review event, storing: `flashcard_id`, `user_id`, `reviewed_at`, `difficulty_rating`, and `next_review_date`. Also add `next_review_date` directly on the `flashcards` table for query performance.

6. **Spaced Repetition Algorithm Support**: Design schema to support common algorithms like FSRS or SM-2. Include fields: `next_review_date`, `ease_factor`, `interval_days`, and `repetitions` on the `flashcards` table.

7. **Deletion Strategy**: Implement hard deletes (permanent removal) for both decks and flashcards. Use `ON DELETE CASCADE` for the `flashcards.deck_id` foreign key.

8. **Performance Indexes**: Create indexes on:
   - `decks(user_id)`
   - `flashcards(deck_id)`
   - `flashcards(next_review_date, deck_id)` - composite index
   - `reviews(flashcard_id, reviewed_at)`

9. **Flashcard Foreign Keys**: Include both `deck_id` and `user_id` on the `flashcards` table for simplified RLS policies and improved query performance.

10. **Row Level Security Structure**: Implement separate RLS policies for each operation (SELECT, INSERT, UPDATE, DELETE) on each table. All policies check `auth.uid() = user_id`.

11. **Timestamp Management**: Use PostgreSQL's `DEFAULT now()` for `created_at` columns. Create database triggers to automatically update `updated_at` timestamps on row modifications.

12. **Dynamic Statistics**: Compute deck statistics (cards due count, total flashcard count) dynamically with SQL queries rather than storing them.

### Round 2 - Detailed Schema Specifications

13. **Difficulty Rating Data Type**: Use `smallint` with a CHECK constraint for the `difficulty_rating` field in the reviews table (e.g., `CHECK (difficulty_rating BETWEEN 0 AND 3)`).

14. **Name Field Constraints**: Set deck names as `varchar(255) NOT NULL` with CHECK constraint to prevent empty/whitespace-only names: `CHECK (trim(name) != '')`. Apply same validation to flashcard front/back fields.

15. **Foreign Key Update Behavior**: Use `ON UPDATE CASCADE` for all foreign key relationships to maintain referential integrity.

16. **Primary Key Type**: Use `uuid` with `gen_random_uuid()` as default for all primary keys.

17. **Spaced Repetition Defaults**: Set defaults for newly created flashcards:
    - `ease_factor decimal DEFAULT 2.5`
    - `interval_days integer DEFAULT 0`
    - `repetitions integer DEFAULT 0`
    - `next_review_date date DEFAULT CURRENT_DATE`

18. **Due Cards Index Optimization**: Create composite partial index: `CREATE INDEX idx_flashcards_due_review ON flashcards(user_id, next_review_date, deck_id) WHERE next_review_date <= CURRENT_DATE;`

19. **Timestamp Data Type**: Use `timestamp` (not `timestamptz`) with the assumption that database stores timestamps in UTC timezone.

20. **No Database-Level Limits**: Do not enforce maximum numbers of decks or flashcards at the database level for MVP. Implement at application level if needed.

21. **Statistics Aggregation**: Rely on aggregating from the `flashcards` table using `is_ai_generated` boolean. No dedicated statistics table needed.

22. **RLS Policy Naming Convention**: Use consistent naming:
    - `[table]_select_policy` for SELECT operations
    - `[table]_insert_policy` for INSERT operations
    - `[table]_update_policy` for UPDATE operations
    - `[table]_delete_policy` for DELETE operations

23. **Flashcard Field Storage**: Use separate columns (`front text`, `back text`) rather than JSONB object for better query performance and simpler validation.

24. **No Soft Delete Infrastructure**: Do not add `deleted_at` columns. Stick strictly to hard deletes as specified in PRD.

## Matched Recommendations

### Core Entities and Structure

**Users and Authentication**

- Leverage Supabase's built-in authentication system (`auth.users`)
- Create minimal `profiles` table only if additional user metadata is required
- All user-owned tables include `user_id uuid` foreign key to `auth.users(id)`

**Decks Table**

- Primary key: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- Fields: `user_id uuid NOT NULL`, `name varchar(255) NOT NULL`, `created_at timestamp DEFAULT now()`, `updated_at timestamp DEFAULT now()`
- Constraints: `UNIQUE(user_id, name)`, `CHECK (trim(name) != '')`
- Foreign key: `user_id REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE`
- Index: `CREATE INDEX idx_decks_user_id ON decks(user_id);`

**Flashcards Table**

- Primary key: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- Core fields: `deck_id uuid NOT NULL`, `user_id uuid NOT NULL`, `front text NOT NULL`, `back text NOT NULL`
- Metadata: `is_ai_generated boolean NOT NULL DEFAULT false`, `created_at timestamp DEFAULT now()`, `updated_at timestamp DEFAULT now()`
- Spaced repetition fields: `next_review_date date DEFAULT CURRENT_DATE`, `ease_factor decimal DEFAULT 2.5`, `interval_days integer DEFAULT 0`, `repetitions integer DEFAULT 0`
- Constraints: `CHECK (trim(front) != '')`, `CHECK (trim(back) != '')`
- Foreign keys:
  - `deck_id REFERENCES decks(id) ON DELETE CASCADE ON UPDATE CASCADE`
  - `user_id REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE`
- Indexes:
  - `CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);`
  - `CREATE INDEX idx_flashcards_due_review ON flashcards(user_id, next_review_date, deck_id) WHERE next_review_date <= CURRENT_DATE;`

**Reviews Table**

- Primary key: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- Fields: `flashcard_id uuid NOT NULL`, `user_id uuid NOT NULL`, `reviewed_at timestamp DEFAULT now()`, `difficulty_rating smallint NOT NULL`, `next_review_date date NOT NULL`
- Constraints: `CHECK (difficulty_rating BETWEEN 0 AND 3)`
- Foreign keys:
  - `flashcard_id REFERENCES flashcards(id) ON DELETE CASCADE ON UPDATE CASCADE`
  - `user_id REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE`
- Index: `CREATE INDEX idx_reviews_flashcard_reviewed ON reviews(flashcard_id, reviewed_at);`

### Security Implementation

**Row Level Security Policies**

- Enable RLS on all tables: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`
- Create separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
- All policies for `authenticated` role only
- Standard policy pattern: `auth.uid() = user_id`
- Example naming: `decks_select_policy`, `decks_insert_policy`, etc.

**Data Validation**

- Use CHECK constraints to prevent empty/whitespace-only strings
- Enforce non-null constraints on required fields
- Use foreign key constraints with CASCADE behavior for referential integrity
- Validate difficulty ratings within acceptable range

### Performance Optimization

**Indexing Strategy**

- Index all foreign key columns for join performance
- Create composite indexes for common query patterns (e.g., finding due cards)
- Use partial indexes with WHERE clauses to reduce index size (e.g., only index cards due for review)
- Primary keys automatically indexed via uuid type

**Query Optimization**

- Compute statistics dynamically using aggregate queries
- Leverage indexes for filtering by user_id and next_review_date
- Use efficient data types (smallint for ratings, uuid for keys)

### Automation and Triggers

**Updated At Trigger**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

Apply to all tables with `updated_at` column:

```sql
CREATE TRIGGER update_[table]_updated_at
BEFORE UPDATE ON [table]
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Data Integrity

**Referential Integrity**

- All foreign keys use `ON DELETE CASCADE` to automatically clean up orphaned records
- Deck deletion automatically removes all flashcards and their reviews
- User deletion (if implemented) would cascade to all user data

**Consistency**

- Use CHECK constraints to enforce business rules at database level
- Maintain both direct and derived relationships (e.g., user_id on both decks and flashcards)
- Default values ensure new records enter valid states

## Database Planning Summary

### Overview

The database schema for the AI Flashcard Learning Platform MVP follows a straightforward relational design using PostgreSQL through Supabase. The schema supports four main entities: users (via Supabase auth), decks, flashcards, and reviews. The design prioritizes simplicity, security, and performance while supporting the core MVP features: AI-powered flashcard generation, manual flashcard creation, deck organization, and spaced repetition study sessions.

### Key Entities and Relationships

**1. Authentication (auth.users)**

- Managed entirely by Supabase's built-in authentication system
- Stores username and hashed passwords
- Serves as the root entity for all user-owned data
- Optional `profiles` table can be added if user metadata needs are identified

**2. Decks**

- Represents flashcard collections organized by topic/subject
- Each deck belongs to exactly one user (many-to-one relationship)
- Deck names must be unique within a user's account
- Deletion cascades to all contained flashcards and their reviews

**3. Flashcards**

- Core learning content with front/back text pairs
- Belongs to exactly one deck and one user (many-to-one relationships)
- Tracks creation method via `is_ai_generated` boolean for success metrics
- Contains spaced repetition metadata (ease factor, interval, repetitions, next review date)
- Supports both AI-generated and manually created cards

**4. Reviews**

- Records individual study session events
- Links to both flashcard and user (many-to-one relationships)
- Stores difficulty rating and calculates next review date
- Enables spaced repetition algorithm implementation
- Maintains complete review history for each flashcard

### Entity Relationship Diagram (Conceptual)

```
auth.users (Supabase managed)
    |
    ├─→ decks (1:N)
    |     |
    |     └─→ flashcards (1:N)
    |           |
    |           └─→ reviews (1:N)
    |
    ├─→ flashcards (1:N) [direct relationship for RLS]
    |
    └─→ reviews (1:N) [direct relationship for RLS]
```

### Security and Access Control

**Row Level Security (RLS)**
The schema implements comprehensive RLS policies following the principle of least privilege:

- All tables have RLS enabled
- Separate policies for each CRUD operation (SELECT, INSERT, UPDATE, DELETE)
- All policies verify `auth.uid() = user_id` to ensure users only access their own data
- Policies apply only to `authenticated` role; anonymous users have no direct table access
- Consistent naming convention for policy identification and maintenance

**Data Isolation**

- Each user's data is completely isolated via RLS policies
- Foreign key relationships ensure data consistency
- Cascade deletes prevent orphaned records
- UUID primary keys prevent enumeration attacks

**Input Validation**

- CHECK constraints prevent empty/whitespace-only strings
- NOT NULL constraints enforce required fields
- Foreign key constraints maintain referential integrity
- Data type constraints (e.g., smallint for ratings) prevent invalid values

### Scalability Considerations

**Performance Optimization**

- Strategic indexing on frequently queried columns (user_id, deck_id)
- Composite indexes for complex queries (finding due cards)
- Partial indexes to reduce index size and improve performance
- UUID primary keys support horizontal scaling if needed

**Query Efficiency**

- Statistics computed dynamically to avoid synchronization overhead
- Denormalized `next_review_date` on flashcards table for quick due card queries
- Direct user_id foreign keys on all tables simplify RLS and improve query performance

**Future Growth**

- Text fields use unlimited length to accommodate evolving content needs
- No artificial limits on decks or flashcards per user
- Schema supports multiple spaced repetition algorithms through flexible metadata fields
- Timestamp precision supports detailed analytics if needed post-MVP

### Data Integrity and Consistency

**Constraints**

- Unique constraint on `(user_id, name)` for deck names
- CHECK constraints for non-empty strings and valid rating ranges
- NOT NULL constraints on required fields
- Foreign key constraints with CASCADE behavior

**Defaults and Triggers**

- `created_at` automatically set via `DEFAULT now()`
- `updated_at` automatically maintained via database triggers
- Spaced repetition fields have sensible defaults for new cards
- New flashcards immediately enter review queue with current date

**Cascade Behavior**

- Deleting a deck removes all flashcards and their reviews
- Deleting a flashcard removes all associated reviews
- Hard deletes align with PRD requirement: "Deletion is permanent (no undo in MVP)"

### Spaced Repetition Implementation

The schema supports flexible spaced repetition algorithm implementation:

**Storage Fields**

- `next_review_date`: When card should appear in study queue
- `ease_factor`: Multiplier for calculating future intervals (default 2.5)
- `interval_days`: Current spacing interval in days (default 0 for new cards)
- `repetitions`: Number of successful reviews (default 0)

**Review Tracking**

- Complete history of all reviews in `reviews` table
- Each review records difficulty rating (0-3 scale)
- Algorithm can calculate next review date based on performance
- Query optimization via partial index on due cards

**Algorithm Flexibility**

- Schema accommodates SM-2, FSRS, or other algorithms
- Specific algorithm selection deferred to implementation phase
- Fields support common algorithm requirements
- Can adjust difficulty rating scale via CHECK constraint modification

### Success Metrics Support

The schema directly supports the two primary success metrics defined in the PRD:

**AI Flashcard Acceptance Rate**

- `is_ai_generated` boolean tracks creation method
- Query: `SELECT COUNT(*) WHERE is_ai_generated = true` for accepted AI cards
- Total AI generated cards tracked through application logging
- Acceptance rate = (Accepted AI cards / Total AI generated) × 100

**AI Generation Usage Rate**

- Compare AI-generated vs manually created flashcards
- Query: `SELECT is_ai_generated, COUNT(*) FROM flashcards GROUP BY is_ai_generated`
- Usage rate = (AI-generated count / Total flashcard count) × 100

**Secondary Metrics**

- Review history enables retention analysis
- Timestamps support session frequency calculations
- Deck and flashcard counts available via aggregation
- User activity patterns derivable from created_at fields

### Technical Alignment

**Supabase Integration**

- Uses Supabase auth.users for authentication
- Compatible with Supabase JavaScript client and TypeScript types
- Follows Supabase RLS best practices
- Migration files follow Supabase naming conventions

**PostgreSQL Features**

- UUID generation via `gen_random_uuid()`
- Trigger functions for automated timestamp updates
- Partial indexes for query optimization
- CHECK constraints for data validation

**Development Workflow**

- Migrations stored in `supabase/migrations/`
- TypeScript types auto-generated from schema
- Database types imported in application code
- Local development via Supabase CLI

## Unresolved Issues

### Items Deferred to Implementation Phase

1. **Spaced Repetition Algorithm Selection**: The exact algorithm (SM-2, FSRS, or alternative) will be determined during implementation. The schema supports common algorithms, but specific difficulty rating scales and calculation logic require algorithm selection.

2. **Difficulty Rating Scale**: While the schema uses a 0-3 scale, the final range should match the chosen spaced repetition algorithm's requirements. This may need adjustment in the CHECK constraint.

3. **Session Expiration Time**: The PRD mentions "reasonable period of inactivity" but doesn't specify duration. This is a Supabase configuration decision rather than a schema concern.

4. **Profiles Table Necessity**: Whether a `profiles` table is needed depends on if any user metadata beyond authentication is required. Currently, no additional user data is specified in the PRD, so this table may not be necessary for MVP.

5. **Review History Retention**: No policy specified for how long to retain review history. For MVP, infinite retention is assumed, but future optimization might archive or summarize old reviews.

### Clarifications for Next Phase

1. **Migration Sequencing**: Determine if all tables should be created in a single migration or split across multiple migrations for better version control.

2. **Seed Data Requirements**: Decide if any seed data (e.g., sample decks, demo users) should be included for development/testing.

3. **Database Naming Conventions**: Confirm preference for plural table names (`decks`, `flashcards`, `reviews`) vs singular.

4. **Index Creation Timing**: Decide whether indexes should be created in the same migration as tables or in subsequent migrations for cleaner separation.

All unresolved issues are minor and do not block schema creation. They represent implementation details that can be determined during the development phase without requiring schema modifications.
