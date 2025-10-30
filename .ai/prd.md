# Product Requirements Document (PRD) - AI Flashcard Learning Platform

## 1. Product Overview

The AI Flashcard Learning Platform is a web-based application designed to help learners create effective study materials through AI-assisted flashcard generation combined with proven spaced repetition techniques. The platform addresses the common challenge faced by learners who want to study efficiently but struggle with creating high-quality flashcards.

### Target Audience

People who want to learn new things but lack the knowledge or time to create effective flashcards manually.

### Core Value Proposition

Transform study materials into optimized flashcards in seconds using AI, while maintaining full control over content quality through an accept/discard review system.

### Key Features

- AI-powered flashcard generation from pasted text
- Manual flashcard creation for supplemental content
- Deck-based organization system
- Spaced repetition study sessions using open-source algorithms
- Simple username/password authentication
- Full flashcard lifecycle management (create, view, edit, delete)

### Technical Scope

This is a minimum viable product (MVP) designed for 2-week development by a single developer working after hours. The platform will be web-only, supporting plain text content without rich formatting or media attachments.

## 2. User Problem

### Problem Statement

Learners who want to use flashcards for effective studying face significant barriers:

1. Creating effective flashcards requires skill and knowledge of learning principles
2. Manual flashcard creation is time-consuming and tedious
3. Poor quality flashcards lead to ineffective studying and wasted time
4. Learners often don't know how to break down complex material into digestible chunks
5. Without proper spacing algorithms, review sessions are inefficient

### Current Alternatives and Limitations

Existing flashcard applications like Anki and Quizlet require users to manually create all content, which is a significant time investment. While some tools offer community-shared decks, these may not align with individual learning materials or curriculum requirements. AI writing assistants can help generate flashcards but require switching between multiple applications and manual copying.

### Target User Persona

Students, professionals, and lifelong learners who:

- Have study materials (textbooks, lecture notes, articles) they want to learn from
- Recognize the value of spaced repetition for retention
- Want to minimize time spent on flashcard creation
- Prefer to focus cognitive effort on learning rather than content preparation

## 3. Functional Requirements

### 3.1 User Authentication and Account Management

- Username and password-based authentication system
- Account creation without email verification for immediate access
- Secure password storage using industry-standard hashing
- User session management with automatic authentication on return visits
- Row Level Security (RLS) implementation for data isolation between users
- Basic input validation for username and password fields

### 3.2 Deck Management

- Users can create multiple decks to organize flashcards by topic or subject
- Each deck has a unique name within a user's account
- Basic CRUD operations for decks:
  - Create new deck with custom name
  - View list of all user's decks
  - Edit deck name
  - Delete deck (including all contained flashcards)
- Decks display metadata: number of flashcards, number of cards due for review

### 3.3 AI-Powered Flashcard Generation

- Text input field accepting 1,000 to 10,000 characters
- Character count display to guide users on input length
- Validation preventing submission below minimum or above maximum length
- AI service generates minimum of 5 flashcard candidates from submitted text
- AI service/model abstracted to allow future provider changes
- Generated flashcards presented in review interface with:
  - Front text
  - Back text
  - "Accept" button to save flashcard to deck
  - "Discard" button to reject flashcard
- Only accepted flashcards are saved to user's selected deck
- System tracks flashcard origin (AI-generated flag) for metrics
- Original input text is not stored in database
- Error handling displays message: "Generation failed, please try again"
- No retry logic or complex error recovery in MVP

### 3.4 Manual Flashcard Creation

- Direct flashcard creation interface within selected deck
- Two required text fields: Front and Back
- Plain text only (no formatting, no rich media)
- Basic validation: non-empty fields
- Immediate save to selected deck
- System marks manually created flashcards for differentiation from AI-generated content

### 3.5 Flashcard Management

- View all flashcards within a deck as a list
- Display both front and back for each flashcard
- Edit functionality for existing flashcards:
  - Modify front text
  - Modify back text
  - Save changes to update flashcard
- Delete functionality to remove individual flashcards
- System maintains metadata: creation date, last modified date, creation method (AI vs manual)

### 3.6 Spaced Repetition Study System

- Integration with free, open-source spaced repetition library
- Study session initiated by user selecting a deck
- Session reviews all flashcards with due date of today or earlier
- One-card-at-a-time review flow:
  1. Display front of the card only
  2. User attempts recall
  3. User reveals back of the card
  4. User rates difficulty using provided buttons
  5. Algorithm calculates next review date based on difficulty rating
  6. Card removed from today's queue
  7. Next card displayed until all due cards reviewed
- Session completion message when no more cards due
- Review history tracked for each flashcard

### 3.7 Data Validation and Security

- Framework-provided XSS protection for all user inputs
- Basic input validation:
  - Character length limits enforced
  - Non-empty field validation
  - Username uniqueness check
- Row Level Security policies ensuring users access only their own data
- Password requirements (minimum length, basic complexity)

## 4. Product Boundaries

### 4.1 Included in MVP

- Web-based application (browser access only)
- Username and password authentication
- Deck creation and management
- AI-powered flashcard generation from text input (1,000-10,000 characters)
- Accept/discard interface for AI-generated flashcards
- Manual flashcard creation
- Flashcard editing and deletion
- Plain text flashcards (front and back pairs)
- Spaced repetition study sessions using open-source algorithm
- Tracking of flashcard origin (AI vs manual) for success metrics
- Basic security: RLS, XSS protection, password hashing

### 4.2 Explicitly Excluded from MVP

- Email verification for user registration
- Password reset via email
- Rich text formatting (bold, italics, lists, etc.)
- Image uploads or embedding
- Audio or video content
- File import functionality (PDF, DOCX, CSV, etc.)
- Export of flashcard decks
- Sharing or collaboration features
- Public or community deck browsing
- Mobile native applications
- Custom spaced repetition algorithm development
- AI prompt customization by users
- Deck tags or categories beyond deck names
- Search functionality within flashcards
- Statistics dashboard or detailed progress tracking
- Integration with external platforms (Google Drive, Notion, etc.)
- Multi-language support
- Deck capacity limits (to be determined based on usage)
- User feedback or bug reporting mechanism in-app
- Storage of original input text used for AI generation

### 4.3 Technical Constraints

- 2-week development timeline
- Single developer working after hours
- Must maintain extreme implementation simplicity
- Free hobby project with no monetization
- Technology stack to be determined during implementation
- Hosting and infrastructure decisions deferred

## 5. User Stories

### 5.1 Authentication and Account Management

#### US-001: User Registration

- ID: US-001
- Title: Create New User Account
- Description: As a new user, I want to create an account using a username and password so that I can start using the flashcard application immediately.
- Acceptance Criteria:
  - Registration form requires username and password fields
  - Username must be unique across all users
  - Password must meet minimum security requirements (length, complexity)
  - No email address required for registration
  - No email verification step required
  - Upon successful registration, user is automatically logged in
  - User is redirected to main application interface after registration
  - Username cannot be empty or contain only whitespace
  - System displays error message if username already exists
  - System displays error message if password doesn't meet requirements

#### US-002: User Login

- ID: US-002
- Title: Login to Existing Account
- Description: As a returning user, I want to log in with my username and password so that I can access my flashcard decks and study.
- Acceptance Criteria:
  - Login form requires username and password fields
  - System validates credentials against stored user data
  - Successful login redirects user to main application interface
  - Failed login displays error message: "Invalid username or password"
  - User session is created upon successful login
  - Session persists across browser refreshes
  - System does not reveal whether username or password was incorrect (security best practice)

#### US-003: User Logout

- ID: US-003
- Title: Logout from Account
- Description: As a logged-in user, I want to log out of my account so that my data remains secure when I'm finished using the application.
- Acceptance Criteria:
  - Logout button or link is visible when user is logged in
  - Clicking logout terminates user session
  - User is redirected to login page after logout
  - Attempting to access authenticated pages after logout redirects to login
  - Session data is cleared from browser

#### US-004: Persistent Authentication

- ID: US-004
- Title: Maintain User Session
- Description: As a user, I want to remain logged in when I return to the application so that I don't have to log in every time.
- Acceptance Criteria:
  - User session persists when browser tab is closed and reopened
  - User remains logged in when navigating to different pages within application
  - Session expires after reasonable period of inactivity (to be defined)
  - User can manually log out at any time

### 5.2 Deck Management

#### US-005: Create New Deck

- ID: US-005
- Title: Create a New Flashcard Deck
- Description: As a user, I want to create a new deck with a custom name so that I can organize my flashcards by subject or topic.
- Acceptance Criteria:
  - "Create New Deck" button or interface element is accessible from main dashboard
  - Clicking create deck opens form or input field for deck name
  - Deck name field accepts text input
  - Deck name cannot be empty
  - User can save new deck with entered name
  - New deck appears in user's list of decks immediately after creation
  - New deck starts with zero flashcards
  - Each user can have multiple decks
  - Deck names must to be unique within a user's account

#### US-006: View Deck List

- ID: US-006
- Title: View All My Decks
- Description: As a user, I want to see a list of all my decks so that I can choose which deck to study or manage.
- Acceptance Criteria:
  - Main dashboard displays list of all decks belonging to logged-in user
  - Each deck in list shows deck name
  - Each deck displays number of total flashcards
  - Each deck displays number of flashcards due for review today
  - Empty state message shown when user has no decks
  - User can access each deck's detailed view by clicking on deck

#### US-007: Edit Deck Name

- ID: US-007
- Title: Rename Existing Deck
- Description: As a user, I want to edit the name of an existing deck so that I can update organization as my learning evolves.
- Acceptance Criteria:
  - Edit option available for each deck in deck list
  - Clicking edit opens input field with current deck name
  - User can modify deck name text
  - User can save new deck name
  - Deck name cannot be changed to empty string
  - Updated deck name appears immediately in deck list
  - All flashcards remain associated with deck after name change

#### US-008: Delete Deck

- ID: US-008
- Title: Delete Unwanted Deck
- Description: As a user, I want to delete a deck I no longer need so that my interface remains organized.
- Acceptance Criteria:
  - Delete option available for each deck in deck list
  - Clicking delete removes deck and all associated flashcards
  - Deleted deck no longer appears in deck list
  - Deletion is permanent (no undo in MVP)
  - User is warned that deletion will remove all flashcards in deck
  - User must confirm deletion action before execution
  - All flashcards within deleted deck are removed from database

#### US-009: View Empty Deck

- ID: US-009
- Title: View Deck with No Flashcards
- Description: As a user, I want to see appropriate messaging when viewing a deck that contains no flashcards so that I understand the deck's status.
- Acceptance Criteria:
  - Opening empty deck displays message: "This deck has no flashcards yet"
  - Interface provides options to create flashcards (AI generation or manual)
  - Empty deck still appears in deck list with "0 flashcards" count
  - User can add flashcards to empty deck
  - Study session cannot be started for empty deck

### 5.3 AI-Powered Flashcard Generation

#### US-010: Submit Text for AI Generation

- ID: US-010
- Title: Generate Flashcards from Study Material
- Description: As a user, I want to paste my study material and have AI generate flashcards so that I can save time creating study materials.
- Acceptance Criteria:
  - AI generation interface is accessible from within a selected deck
  - Text input field accepts pasted text
  - Character counter displays current character count
  - Input field enforces minimum 1,000 characters
  - Input field enforces maximum 10,000 characters
  - Submit button is disabled until minimum character count reached
  - Error message displays if user attempts to submit below minimum
  - Error message displays if user attempts to submit above maximum
  - Submission triggers AI generation process
  - Loading indicator shows while AI is generating flashcards
  - User receives feedback when generation is complete

#### US-011: Review AI-Generated Flashcards

- ID: US-011
- Title: Accept or Discard Generated Flashcard Candidates
- Description: As a user, I want to review AI-generated flashcard candidates and choose which ones to keep so that I maintain quality control over my study materials.
- Acceptance Criteria:
  - After successful AI generation, user sees list of candidate flashcards
  - Minimum of 5 flashcard candidates are generated
  - Each candidate displays front text
  - Each candidate displays back text
  - Each candidate has "Accept" button
  - Each candidate has "Discard" button
  - Clicking "Accept" saves flashcard to current deck
  - Clicking "Discard" removes candidate from view without saving
  - User can accept all, some, or none of the generated flashcards
  - Accepted flashcards are marked as AI-generated in database
  - Interface updates to show how many flashcards have been accepted
  - User can return to deck view after reviewing all candidates

#### US-012: Handle AI Generation Failure

- ID: US-012
- Title: Receive Error Message When AI Generation Fails
- Description: As a user, I want to see a clear error message when AI generation fails so that I know to try again or use manual creation.
- Acceptance Criteria:
  - When AI service fails, user sees message: "Generation failed, please try again"
  - Error message is clearly visible and understandable
  - User can dismiss error message
  - After dismissing error, user returns to text input interface
  - User can attempt generation again with same or different text
  - No automatic retry mechanism in MVP
  - Original input text is not stored if generation fails

#### US-013: Track AI Generation Success

- ID: US-013
- Title: System Tracks AI Flashcard Acceptance
- Description: As the system, I need to track which flashcards were AI-generated and whether they were accepted so that we can measure product success.
- Acceptance Criteria:
  - Each flashcard in database has "is_ai_generated" boolean field
  - Field is set to true when flashcard is accepted from AI generation
  - Field is set to false when flashcard is manually created
  - System logs total number of flashcards generated by AI
  - System logs total number of AI-generated flashcards accepted
  - System logs total number of AI-generated flashcards discarded
  - Metrics can be queried from database for analysis

### 5.4 Manual Flashcard Creation

#### US-014: Create Flashcard Manually

- ID: US-014
- Title: Manually Create a Flashcard
- Description: As a user, I want to manually create a flashcard with a front and back so that I can add specific content or supplement AI-generated cards.
- Acceptance Criteria:
  - "Create New Flashcard" option available within selected deck
  - Form displays two text input fields: Front and Back
  - Front field accepts plain text input
  - Back field accepts plain text input
  - Neither field supports rich formatting in MVP
  - Front field cannot be empty
  - Back field cannot be empty
  - User can save flashcard after entering both fields
  - Saved flashcard appears in deck's flashcard list immediately
  - Flashcard is marked as manually created (not AI-generated) in database
  - New flashcard is added to spaced repetition schedule

#### US-015: Create Flashcard with Invalid Input

- ID: US-015
- Title: Handle Empty Fields in Manual Creation
- Description: As a user, I want to receive validation feedback when I try to create a flashcard with empty fields so that I understand what's required.
- Acceptance Criteria:
  - Save button is disabled when either front or back is empty
  - Attempting to save with empty front shows error message
  - Attempting to save with empty back shows error message
  - Error messages clearly indicate which field needs completion
  - User can correct errors and successfully save flashcard
  - Validation prevents saving invalid flashcards to database

### 5.5 Flashcard Management

#### US-016: View All Flashcards in Deck

- ID: US-016
- Title: Browse Flashcards Within a Deck
- Description: As a user, I want to view all flashcards in a deck so that I can review my study material and manage individual cards.
- Acceptance Criteria:
  - Deck detail view displays list of all flashcards in that deck
  - Each flashcard shows front text
  - Each flashcard shows back text
  - Flashcards are displayed in a readable format
  - Both AI-generated and manually created cards appear in same list
  - Empty deck shows appropriate "no flashcards" message
  - List includes options to edit or delete each flashcard

#### US-017: Edit Existing Flashcard

- ID: US-017
- Title: Modify Flashcard Content
- Description: As a user, I want to edit a flashcard's front or back so that I can correct mistakes or refine the content as my understanding improves.
- Acceptance Criteria:
  - Edit option available for each flashcard in deck view
  - Clicking edit opens form pre-populated with current front and back
  - User can modify front text
  - User can modify back text
  - User can save changes to update flashcard
  - Front cannot be changed to empty string
  - Back cannot be changed to empty string
  - Updated flashcard displays new content immediately
  - Spaced repetition schedule is maintained after edit
  - System tracks last modified date

#### US-018: Delete Flashcard

- ID: US-018
- Title: Remove Unwanted Flashcard
- Description: As a user, I want to delete a flashcard from my deck so that I can remove content I no longer need to study.
- Acceptance Criteria:
  - Delete option available for each flashcard in deck view
  - Clicking delete removes flashcard from deck
  - Deleted flashcard no longer appears in deck's flashcard list
  - Deleted flashcard is removed from database
  - Deletion is permanent (no undo in MVP)
  - Deck's total flashcard count updates after deletion
  - Future review schedule updates to exclude deleted card

#### US-019: View Flashcard Metadata

- ID: US-019
- Title: See Flashcard Creation Details
- Description: As a user, I want to see whether a flashcard was AI-generated or manually created so that I can understand my deck composition.
- Acceptance Criteria:
  - Each flashcard displays indicator of creation method (AI vs manual)
  - Indicator is clearly visible in flashcard list view
  - User can distinguish between AI-generated and manual flashcards at a glance
  - Creation date is accessible for each flashcard
  - Last modified date is accessible for flashcards that have been edited

### 5.6 Spaced Repetition Study System

#### US-020: Start Study Session

- ID: US-020
- Title: Begin Reviewing Due Flashcards
- Description: As a user, I want to start a study session for a specific deck so that I can review flashcards that are due today.
- Acceptance Criteria:
  - "Start Study Session" button available for each deck
  - Button shows number of cards due for review
  - Button is disabled if no cards are due for review
  - Clicking button initiates study session
  - Study session displays first card due for review
  - Session only includes cards with due date of today or earlier
  - Cards appear one at a time during session

#### US-021: Review Flashcard During Session

- ID: US-021
- Title: Study Individual Flashcard
- Description: As a user, I want to see a flashcard's front, attempt recall, reveal the back, and rate my performance so that the system can schedule my next review.
- Acceptance Criteria:
  - Initially, only front of the card is visible
  - "Reveal Answer" button allows user to see the back of the card
  - After revealing answer, user sees back text
  - Difficulty rating buttons become available after back revealed
  - User selects difficulty rating (implementation details TBD)
  - System calculates next review date based on rating
  - After rating, card is removed from today's review queue
  - Next due card is automatically displayed
  - User progresses through all due cards one by one

#### US-022: Complete Study Session

- ID: US-022
- Title: Finish Reviewing All Due Cards
- Description: As a user, I want to see a completion message when I've reviewed all due flashcards so that I know my study session is complete.
- Acceptance Criteria:
  - After reviewing last due card, completion message displays
  - Message indicates how many cards were reviewed in session
  - User is returned to deck view or main dashboard
  - "Start Study Session" button now shows "0 cards due"
  - Next review date is visible for deck
  - User can start new session when more cards become due

#### US-023: Study Session with No Due Cards

- ID: US-023
- Title: Handle Deck with No Cards Due
- Description: As a user, I want to see appropriate messaging when no flashcards are due for review so that I understand my study status.
- Acceptance Criteria:
  - When deck has no cards due, "Start Study Session" button is disabled
  - Message displays: "No cards due for review today"
  - User can see next review date when cards will become due
  - User can still access manual flashcard creation and management
  - User can navigate back to deck list

#### US-024: Track Review History

- ID: US-024
- Title: Record Flashcard Review Performance
- Description: As the system, I need to track each flashcard review so that the spaced repetition algorithm can calculate optimal next review dates.
- Acceptance Criteria:
  - System records timestamp of each review
  - System records difficulty rating for each review
  - System calculates next review date using spaced repetition algorithm
  - Review history is associated with specific flashcard
  - Algorithm adjusts intervals based on past performance
  - User's review streak is maintained across sessions

### 5.7 Error Handling and Edge Cases

#### US-025: Handle Database Connection Error

- ID: US-025
- Title: Display Error When System Cannot Access Data
- Description: As a user, I want to see a clear error message when the system cannot access my data so that I understand there's a technical issue.
- Acceptance Criteria:
  - When database connection fails, user sees error message
  - Error message is non-technical and user-friendly
  - User is advised to try again later
  - System does not crash or show technical stack traces
  - User session remains valid if possible

#### US-026: Handle Unauthorized Access

- ID: US-026
- Title: Prevent Access to Other Users' Data
- Description: As a user, I want my data to be protected so that other users cannot access or modify my flashcards and decks.
- Acceptance Criteria:
  - Row Level Security policies prevent cross-user data access
  - Attempting to access another user's deck returns error
  - API endpoints validate user ownership before returning data
  - Direct URL manipulation cannot expose other users' content
  - All database queries filter by current user ID

#### US-027: Handle Session Expiration

- ID: US-027
- Title: Redirect to Login After Session Expires
- Description: As a user, I want to be redirected to login page when my session expires so that I can securely log back in.
- Acceptance Criteria:
  - When session expires, user is redirected to login page
  - User sees message indicating session expiration
  - After re-login, user returns to previous page if possible
  - No data is lost during session expiration
  - Session expiration time is reasonable for typical usage

## 6. Success Metrics

### 6.1 Primary Success Metrics

The MVP success will be measured using two key metrics that directly reflect the product's value proposition:

#### Metric 1: AI Flashcard Acceptance Rate

- Definition: Percentage of AI-generated flashcards that users accept (vs. discard) during the review process
- Target: 75% acceptance rate
- Formula: (Number of Accepted AI Flashcards / Total Number of AI-Generated Flashcards) × 100
- Measurement Method:
  - Track each "Accept" button click during AI flashcard review
  - Track each "Discard" button click during AI flashcard review
  - Calculate ratio from database query
- Significance: Indicates quality of AI-generated content and validates core product value

#### Metric 2: AI Generation Usage Rate

- Definition: Percentage of total flashcards in the system that were created via AI generation
- Target: 75% of all flashcards created using AI
- Formula: (Number of AI-Generated Flashcards / Total Number of Flashcards) × 100
- Measurement Method:
  - Query flashcards table filtering by "is_ai_generated" boolean field
  - Count AI-generated flashcards (is_ai_generated = true)
  - Count total flashcards across all users and decks
  - Calculate ratio
- Significance: Demonstrates user preference for AI generation vs. manual creation and validates product-market fit

### 6.2 Data Collection Implementation

#### Required Database Fields

- Flashcard table must include:
  - is_ai_generated (boolean): true for AI-generated, false for manual
  - created_at (timestamp): flashcard creation date
  - user_id (foreign key): associates flashcard with user
  - deck_id (foreign key): associates flashcard with deck

#### Tracking Events

- Accept button click: Save flashcard with is_ai_generated = true
- Discard button click: Log event but do not save flashcard
- Manual flashcard creation: Save flashcard with is_ai_generated = false

### 6.3 Metrics Evaluation Process

#### Analysis Approach

- Calculate metrics using database queries
- Compare actual rates against 75% targets
- Segment data by user cohorts if sufficient sample size
- Identify patterns in acceptance/rejection of specific flashcard types

#### Success Criteria Validation

- If both metrics exceed 75%, core product hypotheses are validated
- If AI acceptance rate is low, investigate AI generation quality
- If AI usage rate is low, investigate user experience friction points
- Adjust targets based on real-world usage patterns if initial assumptions prove unrealistic

### 6.4 Secondary Indicators (Informational Only)

While not formal success criteria, these metrics provide additional context:

- User retention: Percentage of users who return after first session
- Average study sessions per user per week
- Average flashcards per deck
- Time spent in study sessions vs. flashcard creation
- Ratio of deck creation to deck deletion

### 6.5 Measurement Tools

#### Implementation Options

- Direct database queries for metric calculation
- Simple admin dashboard showing key metrics
- Scheduled reports generated from database
- Third-party analytics tool integration (if implemented)

#### Reporting Frequency

- Weekly review during first month post-launch
- Monthly review thereafter
- Ad-hoc queries available for product decisions
