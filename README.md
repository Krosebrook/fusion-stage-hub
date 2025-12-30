# FlashFusion - E-Commerce Operations Hub

<div align="center">

![FlashFusion Logo](https://img.shields.io/badge/FlashFusion-Operations%20Hub-blue?style=for-the-badge)

**A unified platform for managing multi-store e-commerce operations with intelligent approval workflows, job orchestration, and plugin-based integrations.**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## 🚀 Overview

FlashFusion is a production-ready e-commerce operations platform designed to centralize and orchestrate operations across multiple marketplace integrations. It provides:

- **🔄 Multi-Store Sync**: Connect and manage Shopify, Etsy, Amazon, Printify, Gumroad, and more
- **✅ Approval Workflows**: Stage changes with granular approval requirements before execution
- **⚙️ Job Orchestration**: Reliable background job processing with retry logic and monitoring
- **🔌 Plugin Architecture**: Extensible platform integration system with capability awareness
- **📊 Real-Time Monitoring**: Dashboard with metrics, platform status, and actionable insights
- **🔐 SOC2 Compliance**: Immutable audit logs with tagging for compliance requirements
- **💰 Budget Controls**: Circuit breakers to prevent runaway API usage and costs

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [Core Concepts](#-core-concepts)
- [Configuration](#-configuration)
- [Development](#-development)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Dashboard & Monitoring
- **Real-time metrics**: Active jobs, pending approvals, store health, inventory levels
- **Platform status indicators**: Visual health checks for all connected stores
- **Recent activity feed**: Quick view of jobs, approvals, and system events
- **Trend analytics**: Growth indicators and performance metrics

### Approval System
- **Staged operations**: Preview changes before they go live
- **Multi-level approval**: Configure approval requirements per action type
- **Audit trail**: Complete history of who approved what and when
- **Expiration handling**: Time-based approval expiration with notifications

### Job Queue
- **Async processing**: Background jobs for sync, publish, import operations
- **Retry logic**: Configurable max attempts with exponential backoff
- **Priority queuing**: Critical operations can jump the queue
- **Status tracking**: Real-time visibility into job progress
- **Bulk operations**: Efficient batch processing for large datasets

### Store Management
- **Multi-platform support**: Unified interface for diverse marketplaces
- **Health monitoring**: Connection status and last sync timestamps
- **Sync configuration**: Per-store sync schedules and preferences
- **Inventory reconciliation**: Detect and resolve inventory discrepancies

### Plugin System
- **Capability matrix**: Visual representation of what each platform supports
- **Native/Workaround/Unsupported**: Clear indication of integration quality
- **Rate limiting**: Per-plugin constraints and budget tracking
- **Extensible architecture**: Easy to add new platform integrations

### Product Management
- **Unified catalog**: Single source of truth across all stores
- **Bulk editing**: Efficient multi-product updates
- **Multi-store publishing**: Stage products for one or more stores
- **Inventory tracking**: Real-time stock levels per store
- **SKU management**: Consistent product identification

### Audit & Compliance
- **Immutable logs**: All actions permanently recorded
- **SOC2 tagging**: Categorized for compliance reporting
- **Export capabilities**: Generate audit reports on-demand
- **User tracking**: Every action tied to a user identity
- **Retention policies**: Configurable log retention (90 days default)

---

## 🛠 Tech Stack

### Frontend
- **React 18.3**: Modern React with hooks and concurrent features
- **TypeScript 5.8**: Type-safe development with strict mode
- **Vite 5.4**: Lightning-fast build tool and dev server
- **React Router 6**: Client-side routing with nested routes
- **TanStack Query**: Server state management and caching

### UI Framework
- **shadcn/ui**: High-quality, accessible component library
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **Lucide React**: Beautiful, consistent icon library
- **Tailwind Animate**: Smooth animations and transitions

### Backend Integration
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Supabase Auth**: Authentication and authorization
- **React Hook Form**: Performant form management with validation
- **Zod**: TypeScript-first schema validation

### Development Tools
- **ESLint 9**: Code quality and consistency
- **TypeScript ESLint**: TypeScript-specific linting rules
- **PostCSS**: CSS transformations and optimizations
- **SWC**: Ultra-fast TypeScript/JavaScript compiler

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher ([install with nvm](https://github.com/nvm-sh/nvm))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Krosebrook/fusion-stage-hub.git
   cd fusion-stage-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # The .env file is already configured with Supabase credentials
   # Review and update if needed
   cat .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:8080`

### Quick Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Production build
npm run build:dev        # Development build with source maps

# Code Quality
npm run lint             # Run ESLint
npm run preview          # Preview production build locally
```

---

## 🏗 Architecture

FlashFusion follows a modern, modular architecture designed for scalability and maintainability.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Approvals │  │   Jobs   │  │  Stores  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Products │  │Publishing│  │ Settings │  │  Audit   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Supabase)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │   Auth   │  │ Real-time│  │  Storage │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│               External Integrations (Plugins)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Shopify  │  │   Etsy   │  │ Amazon SC│  │ Printify │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                 │
│  │ Gumroad  │  │Amazon KDP│                                 │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
fusion-stage-hub/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── layout/         # Layout components (Header, Sidebar, AppLayout)
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── jobs/           # Job queue components
│   │   ├── approvals/      # Approval workflow components
│   │   └── plugins/        # Plugin system components
│   ├── pages/              # Route-level page components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Approvals.tsx   # Approval queue
│   │   ├── Jobs.tsx        # Job management
│   │   ├── Stores.tsx      # Store connections
│   │   ├── Plugins.tsx     # Plugin registry
│   │   ├── Products.tsx    # Product catalog
│   │   ├── Publishing.tsx  # Publishing wizard
│   │   ├── Settings.tsx    # System settings
│   │   ├── Audit.tsx       # Audit logs
│   │   └── Auth.tsx        # Authentication
│   ├── integrations/       # External service integrations
│   │   └── supabase/       # Supabase client and types
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Root application component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── supabase/              # Supabase configuration
│   ├── config.toml        # Supabase project config
│   └── migrations/        # Database migrations
├── .env                   # Environment variables
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── eslint.config.js       # ESLint configuration
```

For detailed architecture documentation, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 💡 Core Concepts

### 1. Stores
Stores represent connected e-commerce platforms. Each store has:
- Platform type (Shopify, Etsy, Amazon, etc.)
- Connection credentials (OAuth tokens, API keys)
- Sync settings and schedules
- Health status and last sync timestamp

### 2. Products
The unified product catalog is the single source of truth. Products can be:
- **Active**: Published and live on stores
- **Draft**: Work-in-progress, not published
- **Archived**: Removed from stores but retained in catalog

### 3. Jobs
Background jobs handle asynchronous operations:
- **Sync inventory**: Update stock levels across stores
- **Publish listing**: Create/update products on stores
- **Import orders**: Pull orders from stores
- **Update prices**: Bulk price changes
- **Reconcile stock**: Resolve inventory discrepancies

Jobs support:
- Configurable retry attempts
- Priority levels
- Status tracking (pending, running, completed, failed)
- Scheduled execution

### 4. Approvals
The approval system prevents unauthorized changes:
- **Listing operations**: Publish, update, delete
- **Product changes**: Price updates, inventory changes
- **Bulk operations**: Mass updates, bulk deletions
- **Store configuration**: Connection changes

Approvals include:
- Requester information
- Timestamp and expiration
- Resource details and proposed changes
- Approve/reject actions with audit trail

### 5. Plugins
Plugins encapsulate platform-specific integration logic:
- **Capability matrix**: What operations are supported
- **Rate limiting**: Per-plugin API constraints
- **Workarounds**: Platform-specific edge cases
- **Error handling**: Platform-specific error recovery

Plugin capabilities:
- **Native**: Directly supported by platform API
- **Workaround**: Supported via alternative methods
- **Unsupported**: Not available on this platform

### 6. Audit Logs
Immutable record of all system actions:
- User identity
- Action type (create, update, delete, approve, etc.)
- Resource type and ID
- Metadata and context
- SOC2 compliance tags
- Timestamp

---

## ⚙️ Configuration

### Environment Variables

Create or modify `.env` in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### Application Settings

Settings are managed through the Settings page (`/settings`):

- **Organization**: Name, slug, contact info
- **Job Queue**: Retry behavior, error thresholds
- **Budgets**: API usage limits and circuit breakers
- **Notifications**: Email/webhook alerts
- **Security**: 2FA requirements, audit retention

---

## 🔧 Development

### Project Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open browser**
   Navigate to `http://localhost:8080`

### Code Style

The project uses ESLint with TypeScript rules:

```bash
npm run lint
```

Key conventions:
- Use TypeScript for all new code
- Follow React hooks best practices
- Use functional components with hooks
- Implement proper error boundaries
- Add loading states for async operations

### Component Development

When creating new components:

1. Place in appropriate directory (`components/` or `pages/`)
2. Use TypeScript interfaces for props
3. Export as named export (not default, except for pages)
4. Include proper TypeScript types
5. Use shadcn/ui components when possible

Example:
```typescript
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction}>Action</Button>
      </CardContent>
    </Card>
  );
}
```

### Adding New Routes

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/layout/Sidebar.tsx`
4. Update documentation

---

## 🚢 Deployment

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deployment Options

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Custom Server
```bash
# Build the project
npm run build

# Serve the dist directory with any static file server
npx serve dist
```

### Environment Variables

Ensure all environment variables are set in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## 📚 Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: Detailed system architecture
- **[CHANGELOG.md](./CHANGELOG.md)**: Version history and changes
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute
- **[ROADMAP.md](./ROADMAP.md)**: Future plans and milestones
- **[API.md](./docs/API.md)**: API integration guide
- **[PLUGINS.md](./docs/PLUGINS.md)**: Plugin development guide
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)**: Deployment guide

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on:

- Code of Conduct
- Development setup
- Pull request process
- Coding standards
- Testing requirements

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful component library
- **Radix UI** for accessible primitives
- **Supabase** for the backend infrastructure
- **Lovable** for the initial project scaffolding
- All the open-source contributors who make projects like this possible

---

## 📞 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: [GitHub Issues](https://github.com/Krosebrook/fusion-stage-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Krosebrook/fusion-stage-hub/discussions)

---

<div align="center">

**Built with ❤️ by the FlashFusion team**

[Website](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) · [Documentation](./docs/) · [Report Bug](https://github.com/Krosebrook/fusion-stage-hub/issues) · [Request Feature](https://github.com/Krosebrook/fusion-stage-hub/issues)

</div>
