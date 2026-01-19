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

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build all packages
pnpm build

# Run linter
pnpm lint
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
