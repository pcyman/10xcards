# 10XCards - AI Flashcard Learning Platform

A web-based application that helps learners create effective study materials through AI-assisted flashcard generation combined with proven spaced repetition techniques. Transform study materials into optimized flashcards in seconds using AI, while maintaining full control over content quality through an accept/discard review system.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Overview

### Target Audience

People who want to learn new things but lack the knowledge or time to create effective flashcards manually.

### Core Features

- **AI-Powered Flashcard Generation**: Paste your study material (1,000-10,000 characters) and let AI generate flashcard candidates
- **Manual Flashcard Creation**: Create flashcards manually for supplemental content
- **Deck Organization**: Organize flashcards by topic or subject using deck-based system
- **Spaced Repetition Study**: Review flashcards using open-source spaced repetition algorithms
- **User Authentication**: Simple username/password authentication system
- **Complete Flashcard Management**: Create, view, edit, and delete flashcards with full lifecycle control

### Success Metrics

The MVP aims to achieve:
- **75% AI Flashcard Acceptance Rate**: Percentage of AI-generated flashcards that users accept
- **75% AI Usage Rate**: Percentage of total flashcards created using AI generation

## Tech Stack

### Frontend

- **Astro 5**: Modern web framework with server-side rendering (SSR mode)
- **React 19**: UI library for interactive components
- **TypeScript 5**: Type-safe JavaScript with strict configuration
- **Tailwind CSS 4**: Utility-first CSS framework with CSS variables
- **Shadcn/ui**: Accessible component library (New York style, neutral base color)

### Backend

- **Supabase**: Comprehensive backend solution providing:
  - PostgreSQL database
  - Backend-as-a-Service SDKs
  - Built-in user authentication
  - Row Level Security (RLS) for data isolation
  - Open-source solution with local/self-hosting options

### AI Integration

- **OpenRouter.ai**: Access to multiple AI models (OpenAI, Anthropic, Google, and others) for:
  - High efficiency and low costs
  - Financial limits on API keys
  - Flexible model selection

### CI/CD and Hosting

- **GitHub Actions**: Automated CI/CD pipelines
- **DigitalOcean**: Application hosting via Docker images

## Getting Started

### Prerequisites

- **Node.js**: v22.14.0 (specified in `.nvmrc`)
- **npm**: Latest version compatible with Node.js 22.14.0

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/10xcards.git
   cd 10xcards
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon/public key
   - Additional AI service credentials as needed

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

### Development

```bash
npm run dev          # Start development server on port 3000
npm run preview      # Preview production build locally
```

### Building

```bash
npm run build        # Build for production
```

### Code Quality

```bash
npm run lint         # Run ESLint to check for issues
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
```

### Pre-commit Hooks

The project uses Husky and lint-staged to automatically run linters on staged files before commits:
- TypeScript, TSX, and Astro files: ESLint with auto-fix
- JSON, CSS, and Markdown files: Prettier formatting

## Project Scope

### Included in MVP

✅ Web-based application (browser access only)
✅ Username and password authentication
✅ Deck creation and management
✅ AI-powered flashcard generation from text input (1,000-10,000 characters)
✅ Accept/discard interface for AI-generated flashcards
✅ Manual flashcard creation
✅ Flashcard editing and deletion
✅ Plain text flashcards (front and back pairs)
✅ Spaced repetition study sessions using open-source algorithm
✅ Tracking of flashcard origin (AI vs manual) for success metrics
✅ Basic security: RLS, XSS protection, password hashing

### Explicitly Excluded from MVP

❌ Email verification or password reset
❌ Rich text formatting (bold, italics, lists)
❌ Image, audio, or video content
❌ File import functionality (PDF, DOCX, CSV)
❌ Export of flashcard decks
❌ Sharing or collaboration features
❌ Public or community deck browsing
❌ Mobile native applications
❌ Custom spaced repetition algorithm development
❌ AI prompt customization by users
❌ Search functionality within flashcards
❌ Statistics dashboard or detailed progress tracking
❌ Multi-language support

### Technical Constraints

- **Timeline**: 2-week development window
- **Team**: Single developer working after hours
- **Focus**: Extreme implementation simplicity
- **Model**: Free hobby project with no monetization

## Project Status

**Current Status**: 🚧 In Development

This project is in active development as an MVP (Minimum Viable Product).

### What's Working

- ✅ Project scaffolding with Astro 5
- ✅ React 19 integration
- ✅ Tailwind CSS 4 configuration
- ✅ ESLint and Prettier setup
- ✅ TypeScript configuration
- ✅ Shadcn/ui component library foundation

### What's In Progress

- 🔄 Supabase database schema and migrations
- 🔄 User authentication system
- 🔄 Deck management features
- 🔄 AI flashcard generation integration
- 🔄 Spaced repetition study system

### Contributing

This is currently a personal project developed as an MVP. Contributions are not being accepted at this time, but feel free to fork the project and adapt it for your own needs.

---

## Additional Resources

- [CLAUDE.md](./CLAUDE.md) - Detailed development guidelines for Claude Code
- [Product Requirements Document](./.ai/prd.md) - Complete product specifications
- [Tech Stack Details](./.ai/tech-stack.md) - Technology choices and rationale

## Support

This is a hobby project without formal support channels. If you encounter issues or have questions, please check the documentation files.
