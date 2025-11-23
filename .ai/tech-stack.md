Frontend - Astro with React for interactive components:

- Astro 5 allows you to create fast, efficient websites and applications with minimal JavaScript
- React 19 provides interactivity where it is needed
- TypeScript 5 for static code typing and better IDE support
- Tailwind 4 allows for convenient application styling
- Shadcn/ui provides a library of available React components on which we will base the UI

Backend - Supabase as a comprehensive backend solution:

- Provides a PostgreSQL database
- Provides SDKs in multiple languages that will serve as Backend-as-a-Service
- Is an open source solution that can be hosted locally or on your own server
- Has built-in user authentication

AI - Communication with models via the Openrouter.ai service:

- Access to a wide range of models (OpenAI, Anthropic, Google, and many others) that will allow us to find a solution that ensures high efficiency and low costs
- Allows you to set financial limits on API keys

Testing:

- **Vitest** - Fast, Vite-native test runner for unit and integration tests with native ESM support
- **React Testing Library** - Component testing library focused on testing from user perspective
- **Playwright** - Cross-browser E2E testing framework with excellent SSR support for Astro
- **axe-core** - Automated accessibility testing engine for WCAG 2.1 compliance
- **MSW (Mock Service Worker)** - HTTP request mocking for testing without hitting real APIs (OpenRouter.ai, Supabase)
- **Lighthouse CI** - Automated performance, accessibility, and SEO auditing
- **@faker-js/faker** - Test data generation for realistic test scenarios

CI/CD and Hosting:

- Github Actions for creating CI/CD pipelines with automated test execution on every PR
- DigitalOcean for hosting applications via a docker image
