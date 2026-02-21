# DayPilot

**Pilot your day with AI.**

DayPilot is an AI-powered scheduling assistant that helps you manage your calendar across platforms. Connect your calendars, let AI plan your day, and pilot your schedule with confidence.

Visit [daypilot.co](https://daypilot.co) to learn more.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth + Database)
- **Routing**: React Router
- **State Management**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8.15.9+
- Supabase account (for backend)

### Development Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp ENV_SETUP.md apps/web/.env
# Edit apps/web/.env with your Supabase credentials

# Start development server
pnpm dev

# Build all packages
pnpm build

# Run linter
pnpm lint
```

### Environment Variables

See [ENV_SETUP.md](./ENV_SETUP.md) for required environment variables.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Quick Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

## Project Structure

```
DayPilot/
├── apps/
│   └── web/          # Marketing site + web app
├── packages/
│   ├── ui/           # Shared UI components
│   ├── lib/          # Shared utilities and helpers
│   └── types/        # Shared TypeScript types
└── supabase/         # Database migrations
```

## License

See [LICENSE](./LICENSE) file for details.
