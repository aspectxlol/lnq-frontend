
# LNQ Frontend

This is a modern e-commerce frontend built with [Next.js](https://nextjs.org), React, and TypeScript. It provides a user interface for managing products and orders, and connects to a backend API (see `swagger.json` for API spec).

## Features

- Product management (CRUD, image upload)
- Order management (CRUD, custom items, notes, pickup date)
- Dashboard for orders and products
- Settings page for backend configuration and health check
- Responsive UI with Tailwind CSS and Radix UI components
- Toast notifications and confirmation dialogs
- Print order functionality

## Project Structure

```
frontend/
├── Dockerfile
├── package.json
├── public/
│   └── ... (static assets)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # App layout
│   │   ├── globals.css        # Global styles
│   │   ├── page.tsx           # Home page
│   │   ├── products/          # Product pages (list, new, detail)
│   │   ├── orders/            # Order pages (list, new, detail)
│   │   └── settings/          # Settings page
│   ├── components/            # UI and app components
│   ├── lib/                   # API, queries, types, utils
│   └── ...
├── tsconfig.json
└── ...
```

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended, see [pnpm.io](https://pnpm.io/))

### Install dependencies

```bash
pnpm install
```

### Development

Start the development server (default port: 3001):

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

### Docker

Build and run the app in Docker:

```bash
pnpm docker:publish
# or manually:
docker build -t lnq-frontend .
docker run -p 3001:3001 lnq-frontend
```

## Environment & Configuration

- The backend API URL can be configured in the Settings page at runtime.
- The frontend expects the backend to implement the API described in `swagger.json`.

## Key Technologies

- [Next.js 16](https://nextjs.org/) (App Router, SSR, API routes)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [@tanstack/react-query](https://tanstack.com/query/latest) (data fetching/caching)
- [Sonner](https://sonner.emilkowal.ski/) (toasts)

## Main Pages & Components

- **Products**: List, create, edit, and delete products. Supports image upload.
- **Orders**: List, create, edit, and delete orders. Supports custom items, notes, and pickup date.
- **Settings**: Configure backend API URL and check server health.
- **Reusable UI**: Located in `src/components/ui/` (Button, Card, Table, Dialog, etc.)

## API Integration

- All API calls are defined in `src/lib/api.ts` and use the backend URL set in settings.
- Data fetching and mutations use React Query hooks from `src/lib/queries.ts`.
- Types for products, orders, and API responses are in `src/lib/types.ts`.

## Development Notes

- Uses the new Next.js App Router and React Server Components where possible.
- All forms use controlled React state.
- Toasts and dialogs provide user feedback for actions.
- Custom price and notes are supported for both products and custom order items.
- Print order functionality is available via the backend API.

## Contributing

1. Fork and clone the repository
2. Create a new branch for your feature or bugfix
3. Run `pnpm install` and `pnpm dev`
4. Make your changes and add tests if needed
5. Open a pull request

## License

MIT
