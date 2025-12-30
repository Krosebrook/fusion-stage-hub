# Fusion Stage Hub

**A unified control center for multi-platform e-commerce operations**

Fusion Stage Hub is a modern web application designed to streamline the management of multiple e-commerce platforms from a single dashboard. It provides approval workflows, job orchestration, inventory synchronization, and plugin-based integrations for platforms like Shopify, Etsy, Amazon, Printify, and more.

---

## 🎯 Overview

Fusion Stage Hub acts as a centralized operations hub for managing:
- **Multiple store connections** (Shopify, Etsy, Amazon SC/KDP, Printify, Gumroad)
- **Approval workflows** for critical operations (publish, update, delete)
- **Background job orchestration** with retry logic and status monitoring
- **Product and inventory synchronization** across platforms
- **Plugin-based architecture** with capability-aware integrations

Built with modern technologies for performance, scalability, and developer experience.

---

## 🚀 Features

### Core Capabilities
- **Dashboard**: Real-time metrics showing pending approvals, active jobs, connected stores, and product counts
- **Approval Queue**: Review and approve/reject pending actions before execution
- **Job Management**: Monitor background jobs with filtering, retry logic, and status tracking
- **Store Management**: Connect and configure multiple e-commerce platforms
- **Plugin Registry**: View platform capabilities, constraints, and integration details
- **Product Management**: Centralized product catalog across all platforms
- **Publishing Workflow**: Stage and publish listings with approval gates
- **Audit Logging**: Track all operations and changes
- **Settings**: Configure system preferences and integrations

### Platform Integrations
| Platform | Status | Capabilities |
|----------|--------|--------------|
| **Shopify** | ✅ Active | Full CRUD, GraphQL API, bulk operations |
| **Etsy** | ✅ Active | Full CRUD, listing management, order processing |
| **Printify** | ✅ Active | POD integration, catalog sync, fulfillment |
| **Gumroad** | ✅ Active | Digital products, webhook-driven sync |
| **Amazon SC** | ✅ Active | SP-API, async feeds, inventory sync |
| **Amazon KDP** | 🚧 Pending | Manual integration, report reconciliation |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Radix UI** - Accessible primitives

### Backend & Infrastructure
- **Supabase** - PostgreSQL database, Auth, Real-time subscriptions
- **React Query** - Server state management and caching
- **React Router v6** - Client-side routing
- **date-fns** - Date manipulation and formatting

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS + Autoprefixer** - CSS processing
- **Vite SWC** - Fast React compilation

---

## 📦 Installation

### Prerequisites
- **Node.js** >= 18.0.0 (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **npm** >= 9.0.0 or **yarn** >= 1.22.0
- **Git** for version control

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Krosebrook/fusion-stage-hub.git
   cd fusion-stage-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:8080
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: API Keys for integrations
VITE_SHOPIFY_API_KEY=your_shopify_api_key
VITE_ETSY_API_KEY=your_etsy_api_key
# ... add other platform keys as needed
```

---

## 🏗️ Project Structure

```
fusion-stage-hub/
├── public/                # Static assets
├── src/
│   ├── App.tsx           # Root application component
│   ├── main.tsx          # Application entry point
│   ├── components/       # React components
│   │   ├── approvals/    # Approval-specific components
│   │   ├── dashboard/    # Dashboard widgets
│   │   ├── jobs/         # Job management components
│   │   ├── layout/       # Layout components (Sidebar, Header, AppLayout)
│   │   ├── plugins/      # Plugin registry components
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Third-party integrations
│   │   └── supabase/     # Supabase client and types
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components (routes)
│   └── index.css         # Global styles
├── supabase/             # Supabase configuration
│   ├── config.toml       # Supabase project config
│   └── migrations/       # Database migrations
├── .gitignore
├── package.json
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

---

## 🎨 Architecture

### Design Principles
1. **Plugin-Based Architecture**: Each platform is a plugin with declared capabilities
2. **Approval-First Workflow**: Critical operations require approval before execution
3. **Job Queue System**: Asynchronous background processing with retry logic
4. **Type Safety**: Full TypeScript coverage for reliability
5. **Component Modularity**: Reusable components following atomic design
6. **Accessibility**: WCAG 2.1 AA compliance through Radix UI primitives

### Key Patterns
- **Layout Components**: Consistent `AppLayout` wrapper for all pages
- **Data Fetching**: React Query for server state with caching and optimistic updates
- **State Management**: Local state with `useState`, server state with React Query
- **Routing**: File-based routing conventions with React Router
- **Styling**: Utility-first CSS with Tailwind, design tokens via CSS variables
- **Error Handling**: Toast notifications (Sonner) for user feedback

### Database Schema (Supabase)
- **stores**: Connected e-commerce platforms
- **products**: Master product catalog
- **listings**: Platform-specific product listings
- **approvals**: Pending approval queue
- **jobs**: Background job queue
- **audit_logs**: Operation audit trail
- **plugins**: Plugin registry and configuration

---

## 💻 Development

### Available Scripts

```bash
# Start development server (hot reload enabled)
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build locally
npm run preview

# Run linter
npm run lint
```

### Code Style Guidelines
- **Naming Conventions**:
  - Components: PascalCase (`MetricCard.tsx`)
  - Files: PascalCase for components, camelCase for utilities
  - Variables/Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase with descriptive names

- **Component Structure**:
  - Import external libraries first
  - Import internal modules second
  - Define types/interfaces before component
  - Export component as default
  - Keep components focused and single-responsibility

- **TypeScript**:
  - Prefer explicit types over implicit
  - Use interfaces for objects, types for unions/intersections
  - Avoid `any`, use `unknown` when type is truly unknown

### Adding a New Page
1. Create page component in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/layout/Sidebar.tsx`
4. Follow existing page structure (use `AppLayout` wrapper)

### Adding a New Plugin Integration
1. Create plugin definition in `src/pages/Plugins.tsx`
2. Define capabilities with levels: `native`, `workaround`, `unsupported`
3. Document API constraints and rate limits
4. Implement API client in `src/integrations/{platform}/`
5. Add store configuration in Settings

---

## 🧪 Testing

Currently, the project does not have automated tests. Testing infrastructure is planned for future releases.

**Planned Testing Strategy**:
- Unit tests with Vitest
- Component tests with React Testing Library
- E2E tests with Playwright
- Integration tests for Supabase functions

---

## 📖 API Documentation

### Supabase Integration
The application uses Supabase for:
- **Authentication**: User login/signup with email
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Live updates for job status and approvals
- **Storage**: File uploads for product images

See `src/integrations/supabase/client.ts` for configuration.

### Plugin API
Each plugin exposes a standard interface:
```typescript
interface Plugin {
  slug: string;
  name: string;
  capabilities: Record<string, CapabilityConfig>;
  constraints?: Record<string, string>;
  
  // Methods
  listProducts(): Promise<Product[]>;
  createProduct(data: ProductInput): Promise<Product>;
  updateProduct(id: string, data: Partial<ProductInput>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  syncInventory(): Promise<SyncResult>;
}
```

---

## 🚢 Deployment

### Production Build
```bash
npm run build
```
Output is generated in the `dist/` directory.

### Deployment Options

#### Vercel (Recommended)
1. Connect your GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables
4. Deploy

#### Netlify
1. Connect GitHub repository
2. Build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Add environment variables
4. Deploy

#### Self-Hosted
```bash
npm run build
# Serve dist/ with your preferred web server (nginx, Apache, etc.)
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following code style guidelines
4. **Commit your changes** with descriptive messages
5. **Push to your branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request** with a clear description

### Commit Message Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add new approval workflow
fix: resolve job retry bug
docs: update README with new setup steps
refactor: extract metric calculation logic
style: format code with prettier
test: add unit tests for approval service
chore: update dependencies
```

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful component library
- **Tailwind CSS** for the utility-first CSS framework
- **Supabase** for the backend infrastructure
- **Radix UI** for accessible component primitives
- **Lovable** for the initial scaffolding

---

## 📞 Support

For questions, issues, or feature requests:
- **GitHub Issues**: [Create an issue](https://github.com/Krosebrook/fusion-stage-hub/issues)
- **Email**: support@fusionstagehub.com
- **Documentation**: [docs.fusionstagehub.com](https://docs.fusionstagehub.com)

---

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and improvements.

---

**Built with ❤️ by the Fusion Stage Hub team**
