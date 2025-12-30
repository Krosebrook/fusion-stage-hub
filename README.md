# Fusion Stage Hub

> **FlashFusion E-commerce Operations Hub** - A multi-tenant, multi-platform e-commerce orchestration system with approval workflows, job queues, and intelligent plugin architecture.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)

---

## 🎯 Overview

**Fusion Stage Hub** is a comprehensive e-commerce operations platform designed to orchestrate product publishing, inventory synchronization, and order management across multiple marketplaces and platforms. It provides:

- **Multi-Platform Integration**: Connect Shopify, Etsy, Amazon (Seller Central & KDP), Printify, Gumroad, and more
- **Approval Workflows**: Stage and review changes before publishing to live stores
- **Job Queue System**: Reliable background processing with retry logic and rate limiting
- **Plugin Architecture**: Modular capability-based system for platform integrations
- **Multi-Tenancy**: Organization-based access control with role-based permissions
- **Real-Time Monitoring**: Dashboard with live job status, metrics, and platform health

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- **React 18.3** with TypeScript 5.8
- **Vite** for fast builds and hot module replacement
- **TanStack Query** for server state management
- **React Router** for navigation
- **shadcn/ui** + **Radix UI** for accessible components
- **Tailwind CSS** for styling with custom design system

**Backend & Infrastructure:**
- **Supabase** (PostgreSQL + Auth + Real-time subscriptions)
- **Edge Functions** (planned) for serverless API endpoints
- **Row Level Security** for multi-tenant data isolation
- **pgcron** (planned) for scheduled job execution

**Key Design Patterns:**
- **Plugin System**: Capability matrix for platform-specific features
- **Job Queue**: Reliable background task processing with exponential backoff
- **Approval Workflow**: RBAC-based change management
- **Rate Limiting**: Token bucket algorithm per store/plugin
- **Multi-Tenancy**: Organization-scoped data with RLS policies

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  Dashboard │ Jobs │ Approvals │ Stores │ Products │ Plugins │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Layer                            │
│  • PostgreSQL Database (Multi-tenant schema)                 │
│  • Authentication (Row Level Security)                       │
│  • Real-time Subscriptions (Job updates, approvals)          │
│  • Storage (Product images, documents)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Plugin Layer (Planned)                     │
│  Shopify │ Etsy │ Amazon SC │ KDP │ Printify │ Gumroad     │
└─────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn/bun (recommended: [nvm](https://github.com/nvm-sh/nvm))
- **Supabase Account** (for database and auth)
- **Git** for version control

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Krosebrook/fusion-stage-hub.git
   cd fusion-stage-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Set up database:**
   ```bash
   # Install Supabase CLI (if not already installed)
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-id
   
   # Run migrations
   supabase db push
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:8080`

---

## 📖 Usage Guide

### For Store Operators

1. **Dashboard Overview**
   - View real-time metrics: pending approvals, active jobs, connected stores, product counts
   - Monitor platform health status
   - Track recent job execution

2. **Connecting Stores**
   - Navigate to **Stores** → **Connect New Store**
   - Select platform (Shopify, Etsy, Amazon SC, etc.)
   - Authenticate and configure sync settings
   - Monitor connection status and last sync time

3. **Publishing Products**
   - Navigate to **Publishing** → **New Publish Workflow**
   - Select products to publish
   - Choose target store(s)
   - Configure platform-specific settings
   - Submit for approval (if required)

4. **Managing Approvals**
   - Navigate to **Approvals**
   - Review pending publish/update/delete requests
   - Approve or reject with reason
   - View approval history and audit log

5. **Monitoring Jobs**
   - Navigate to **Jobs**
   - Filter by status: pending, running, completed, failed
   - View job details, logs, and retry attempts
   - Cancel or retry failed jobs

### For Administrators

1. **Plugin Configuration**
   - Navigate to **Plugins**
   - Review capability matrix for each platform
   - Configure rate limits and constraints
   - Enable/disable specific capabilities

2. **Settings Management**
   - Navigate to **Settings**
   - Configure org-wide defaults
   - Manage approval policies
   - Set up notification preferences
   - Configure job queue settings

3. **Audit & Compliance**
   - Navigate to **Audit**
   - Review system logs and user actions
   - Export audit trails for compliance
   - Monitor security events

---

## 🔌 Platform Integrations

### Supported Platforms

| Platform | Status | Capabilities |
|----------|--------|--------------|
| **Shopify** | ✅ Ready | Full API support via GraphQL Admin API |
| **Etsy** | ✅ Ready | REST API v3 with listing management |
| **Amazon Seller Central** | 🚧 Planned | SP-API integration (MWS deprecation) |
| **Amazon KDP** | 🚧 Planned | Publishing API for books/content |
| **Printify** | ✅ Ready | POD product sync and order routing |
| **Gumroad** | ✅ Ready | Digital product management |

### Capability Levels

- **Native**: Fully supported via official API
- **Workaround**: Achievable through alternative methods
- **Unsupported**: Not available on this platform

See [docs/plugins.md](./docs/plugins.md) for detailed plugin documentation.

---

## 🛠️ Development

### Project Structure

```
fusion-stage-hub/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui base components
│   │   ├── layout/        # AppLayout, Header, Sidebar
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── jobs/          # Job queue components
│   │   ├── approvals/     # Approval workflow components
│   │   └── plugins/       # Plugin system components
│   ├── pages/             # Route pages
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and helpers
│   └── integrations/      # External service integrations
│       └── supabase/      # Supabase client and types
├── supabase/
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase configuration
├── public/                # Static assets
└── docs/                  # Documentation
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Imports**: Absolute imports via `@/` alias
- **Formatting**: ESLint + Prettier (configured)
- **Naming**: 
  - Components: PascalCase (`MetricCard.tsx`)
  - Hooks: camelCase with `use` prefix (`useToast.ts`)
  - Utilities: camelCase (`utils.ts`)

### Testing Strategy (Planned)

- **Unit Tests**: Vitest + React Testing Library
- **Integration Tests**: Playwright for E2E
- **API Tests**: Supabase Edge Function testing
- **CI/CD**: GitHub Actions for automated testing

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development setup guide
- Code contribution workflow
- PR guidelines and review process
- Community guidelines

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📋 Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed development plans.

### Current Status: v0.1.0 (MVP)
- ✅ Core UI scaffold with all major pages
- ✅ Database schema and migrations
- ✅ Multi-tenant architecture
- ✅ Basic component library
- 🚧 Backend API integration (in progress)
- 🚧 Authentication flow (in progress)

### Next Milestone: v0.2.0 (Alpha)
- Functional authentication and authorization
- Working job queue with background processing
- Basic approval workflow implementation
- Initial Shopify integration

---

## 🔒 Security

### Security Considerations

- **Credential Storage**: All API keys encrypted at rest using Supabase Vault
- **Authentication**: Supabase Auth with Row Level Security
- **API Security**: Rate limiting per store/plugin to respect platform limits
- **Audit Logging**: All critical actions logged with user attribution
- **Data Isolation**: Organization-scoped queries enforced at database level

To report security vulnerabilities, please see [SECURITY.md](./SECURITY.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev) for rapid UI prototyping
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons by [Lucide](https://lucide.dev)
- Backend by [Supabase](https://supabase.com)

---

## 📞 Support & Community

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/Krosebrook/fusion-stage-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Krosebrook/fusion-stage-hub/discussions)

---

**Built with ❤️ for e-commerce operators who need reliable multi-platform orchestration.**
