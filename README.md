# TMS-Portal

Freight operations portal for managing loads, customers, carriers, quotes, invoices, commissions, approvals, notifications, and team activity.

## Tech stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite
- MongoDB with Mongoose
- Tailwind CSS and Radix UI

## Requirements

- Node.js 22 or newer
- npm, pnpm, or Bun
- A reachable MongoDB instance

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/freight-agent-portal
   JWT_REFRESH_SECRET=replace-with-a-long-random-secret
   ```

   Keep secrets out of source control. The application uses the `freight-agent-portal` database.

3. Start the development server:

   ```bash
   npm run dev
   ```

   Open the URL printed by Vite, usually `http://localhost:3000`.

## Available commands

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the development server         |
| `npm run build`     | Create a production build            |
| `npm run build:dev` | Create a development-mode build      |
| `npm run preview`   | Preview the production build locally |
| `npm run lint`      | Run ESLint                           |
| `npm run format`    | Format the project with Prettier     |
| `npm run seed:db`   | Seed the database with demo data     |

## Demo accounts

Run `npm run seed:db` after configuring MongoDB to create the seeded users. Every seeded account uses the password `Welcome@123`. The complete account list and roles are in [docs/LOGIN_ACCOUNTS.md](docs/LOGIN_ACCOUNTS.md).

Use seeded credentials only for local development. Change or remove them before deploying anywhere shared.

## Project structure

```text
src/
  api/          API handlers
  components/   Shared UI components
  hooks/        React hooks
  lib/          Authentication, database, and utility code
  models/       Mongoose models
  routes/       TanStack Start routes
```

## Documentation

- [DJ Freight Portal User Guide](docs/DJ-Freight-Portal-User-Guide.md)
- [Role permissions](docs/ROLE_PERMISSIONS.md)
- [CRM implementation plan](docs/CRM_IMPLEMENTATION_PLAN.md)
- [Feature status](docs/feature-status.txt)

## Deployment notes

Set `MONGO_URI`, `JWT_REFRESH_SECRET`, and `NODE_ENV=production` in the deployment environment. Build the application with `npm run build`, then use the hosting platform's documented command for serving the generated TanStack Start output.

<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
>
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history, force pushing, or rebasing/amending commits that are already pushed, as it rewrites history on Lovable's side and the user may lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->
