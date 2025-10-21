# FamHub - Family Finance Manager

A Progressive Web App (PWA) for managing family finances, contracts, fixed costs, assets, and loans.

## Features

- **Contract Management**: Track subscriptions, utilities, and service contracts
- **Fixed Costs**: Manage recurring monthly and annual expenses
- **Asset Management**: Keep track of real estate, vehicles, and other assets
- **Loan Tracking**: Monitor mortgages, personal loans, and their terms
- **Reminder System**: Get notified about contract renewals and payment due dates
- **Family Collaboration**: Share financial data with family members
- **CSV Import**: Import existing data from spreadsheets
- **PWA Support**: Install as a native app on mobile devices

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- React Router
- React Query (TanStack Query)
- Workbox (PWA)

### Backend
- Fastify (Node.js + TypeScript)
- Prisma ORM
- PostgreSQL
- BullMQ (Redis)
- JWT Authentication

### Infrastructure
- Heroku (EU region)
- Heroku Postgres
- Redis
- AWS S3 (eu-central-1)

## Development

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL
- Redis

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

5. Start development servers:
   ```bash
   pnpm dev
   ```

This will start:
- API server on http://localhost:3001
- Web app on http://localhost:5173

## Deployment

The app is configured for deployment on Heroku with the following dynos:
- `web`: API server + static file serving
- `worker`: Background job processing
- `release`: Database migrations and seeding

## Project Structure

```
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Fastify backend
├── packages/
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configuration
├── prisma/           # Database schema and migrations
└── .github/workflows/ # CI/CD pipelines
```

## License

MIT
