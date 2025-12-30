# Fusion Stage Hub - Architecture Documentation

**Technical Design & System Architecture**

This document provides an in-depth technical overview of Fusion Stage Hub's architecture, design patterns, data flow, and system components.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Component Structure](#component-structure)
5. [Data Flow](#data-flow)
6. [Database Design](#database-design)
7. [API Design](#api-design)
8. [Security Architecture](#security-architecture)
9. [Performance Considerations](#performance-considerations)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Approvals │  │   Jobs   │  │  Stores  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           React Query (State Management)             │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS/REST API
┌───────────────────────▼──────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │   Auth   │  │ Realtime │  │ Storage  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                   Platform Integrations                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Shopify  │  │   Etsy   │  │Printify  │  │ Amazon   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### System Components

1. **Frontend Application**: React SPA with TypeScript
2. **Backend Services**: Supabase (PostgreSQL + Auth + Realtime + Storage)
3. **Platform Plugins**: Integration layer for e-commerce platforms
4. **Job Queue**: Background task processing system
5. **Approval Engine**: Workflow orchestration for critical operations

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool & dev server |
| React Router | 6.30.1 | Client-side routing |
| React Query | 5.83.0 | Server state management |
| Tailwind CSS | 3.4.17 | Styling framework |
| shadcn/ui | Latest | Component library |
| Radix UI | Latest | Accessible primitives |
| Lucide React | 0.462.0 | Icon library |
| date-fns | 3.6.0 | Date manipulation |
| Zod | 3.25.76 | Schema validation |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Relational database |
| PostgREST | Auto-generated REST API |
| Supabase Auth | Authentication & authorization |
| Supabase Realtime | WebSocket subscriptions |
| Supabase Storage | File storage |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| TypeScript ESLint | TS-specific linting |
| PostCSS | CSS processing |
| Autoprefixer | CSS vendor prefixes |
| Lovable Tagger | Component tracking |

---

## Architecture Patterns

### 1. Plugin-Based Architecture

Each platform integration is designed as a plugin with a standard interface:

```typescript
interface PlatformPlugin {
  // Metadata
  slug: string;
  name: string;
  version: string;
  
  // Capabilities
  capabilities: {
    [operation: string]: {
      level: 'native' | 'workaround' | 'unsupported';
      description?: string;
    };
  };
  
  // Constraints
  constraints?: {
    rateLimits?: RateLimit;
    batchSize?: number;
    asyncOperations?: boolean;
  };
  
  // Core Methods
  authenticate(credentials: Credentials): Promise<AuthResult>;
  listProducts(options?: ListOptions): Promise<Product[]>;
  createProduct(data: ProductInput): Promise<Product>;
  updateProduct(id: string, data: Partial<ProductInput>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  syncInventory(productId: string): Promise<InventorySync>;
  processOrder(orderId: string): Promise<Order>;
}
```

**Benefits**:
- Consistent interface across platforms
- Easy to add new integrations
- Capability-aware system (knows what each platform can/can't do)
- Graceful degradation for unsupported features

### 2. Approval-First Workflow

All critical operations (publish, update, delete) go through an approval queue:

```typescript
// Operation Flow
User Action → Create Approval Request → Pending Queue
                                          ↓
                                    Reviewer Action
                                          ↓
                            Approve ←────┴────→ Reject
                                ↓                  ↓
                          Create Job         Discard
                                ↓
                          Job Queue
                                ↓
                        Execute Operation
```

**Benefits**:
- Risk mitigation for critical operations
- Audit trail of all decisions
- Multi-level approval chains
- Configurable approval policies

### 3. Job Queue System

Asynchronous background processing for long-running operations:

```typescript
interface Job {
  id: string;
  type: JobType;
  status: 'pending' | 'claimed' | 'running' | 'completed' | 'failed' | 'cancelled';
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata: JobMetadata;
}

// Job Lifecycle
Create Job → Pending → Claimed → Running → Completed/Failed
                ↑                            ↓
                └──────── Retry ─────────────┘
```

**Features**:
- Priority queues
- Retry logic with exponential backoff
- Dead letter queue for persistent failures
- Job dependencies and chaining
- Pause/resume capabilities

### 4. Component Architecture

Following atomic design principles:

```
Atoms (ui/)
  ↓
Molecules (dashboard/, jobs/, approvals/)
  ↓
Organisms (layout/)
  ↓
Templates (pages/)
  ↓
Pages (App.tsx routes)
```

**Component Hierarchy**:
- **Atoms**: Basic UI elements (Button, Input, Badge)
- **Molecules**: Simple component groups (MetricCard, StatusIndicator)
- **Organisms**: Complex components (Sidebar, ApprovalCard, JobTable)
- **Templates**: Page layouts (AppLayout)
- **Pages**: Full pages with data fetching

---

## Component Structure

### File Organization

```
src/
├── components/
│   ├── ui/                    # Atomic components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── MetricCard.tsx
│   │   └── StatusIndicator.tsx
│   ├── approvals/             # Approval components
│   │   └── ApprovalCard.tsx
│   ├── jobs/                  # Job components
│   │   └── JobStatusBadge.tsx
│   ├── plugins/               # Plugin components
│   │   └── CapabilityBadge.tsx
│   └── layout/                # Layout components
│       ├── AppLayout.tsx
│       ├── Sidebar.tsx
│       └── Header.tsx
├── pages/                     # Page components
│   ├── Dashboard.tsx
│   ├── Approvals.tsx
│   ├── Jobs.tsx
│   └── ...
├── hooks/                     # Custom React hooks
│   └── use-toast.ts
├── lib/                       # Utilities
│   └── utils.ts
└── integrations/              # Third-party integrations
    └── supabase/
        ├── client.ts
        └── types.ts
```

### Component Patterns

#### 1. Page Components
```typescript
// Pattern: Page with AppLayout wrapper
export default function PageName() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page content */}
      </div>
    </AppLayout>
  );
}
```

#### 2. Data Fetching
```typescript
// Pattern: React Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs', filters],
  queryFn: () => fetchJobs(filters),
  staleTime: 30000, // 30 seconds
});
```

#### 3. Form Handling
```typescript
// Pattern: React Hook Form + Zod validation
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {},
});

const onSubmit = async (data: FormData) => {
  // Handle submission
};
```

---

## Data Flow

### Request Flow

```
User Action
    ↓
React Component
    ↓
React Query Mutation/Query
    ↓
Supabase Client
    ↓
PostgREST API
    ↓
PostgreSQL
    ↓
Response
    ↓
React Query Cache
    ↓
Component Re-render
```

### Real-time Updates

```
Database Change (INSERT/UPDATE/DELETE)
    ↓
PostgreSQL Trigger
    ↓
Supabase Realtime
    ↓
WebSocket
    ↓
React Query Invalidation
    ↓
Component Re-render with Fresh Data
```

### Job Processing Flow

```
User Action → Approval → Job Creation → Job Queue
                                            ↓
                                     Job Worker Claims
                                            ↓
                                  Execute Platform API
                                            ↓
                                     Success/Failure
                                            ↓
                                   Update Job Status
                                            ↓
                              Trigger Realtime Update
                                            ↓
                                 UI Reflects Status
```

---

## Database Design

### Entity Relationship Diagram

```
users (Supabase Auth)
  ↓
  ├─→ stores (one-to-many)
  │     ↓
  │     ├─→ products (one-to-many)
  │     │     ↓
  │     │     └─→ listings (one-to-many)
  │     │           ↓
  │     │           └─→ inventory_logs
  │     │
  │     └─→ sync_logs (one-to-many)
  │
  ├─→ approvals (one-to-many)
  │     ↓
  │     └─→ approval_history
  │
  ├─→ jobs (one-to-many)
  │     ↓
  │     └─→ job_logs
  │
  └─→ audit_logs (one-to-many)
```

### Core Tables

#### stores
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  platform TEXT NOT NULL, -- 'shopify', 'etsy', etc.
  name TEXT NOT NULL,
  credentials JSONB NOT NULL, -- Encrypted credentials
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active', -- 'active', 'disconnected', 'error'
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_user_id ON stores(user_id);
CREATE INDEX idx_stores_platform ON stores(platform);
```

#### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  tags TEXT[],
  status TEXT DEFAULT 'draft', -- 'draft', 'staged', 'published'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
```

#### listings
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products NOT NULL,
  store_id UUID REFERENCES stores NOT NULL,
  external_id TEXT NOT NULL, -- Platform's listing ID
  price DECIMAL(10, 2) NOT NULL,
  inventory INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'out_of_stock'
  platform_data JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, external_id)
);

CREATE INDEX idx_listings_product_id ON listings(product_id);
CREATE INDEX idx_listings_store_id ON listings(store_id);
```

#### approvals
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  resource_type TEXT NOT NULL, -- 'listing', 'product', 'store'
  resource_id UUID,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'publish'
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users,
  reviewed_at TIMESTAMPTZ,
  comments TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_user_id ON approvals(user_id);
```

#### jobs
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL, -- 'sync_inventory', 'publish_listing', etc.
  status TEXT DEFAULT 'pending',
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## API Design

### REST API (Supabase PostgREST)

All API endpoints follow RESTful conventions:

```
GET    /stores              List all stores
GET    /stores/:id          Get store details
POST   /stores              Create new store
PATCH  /stores/:id          Update store
DELETE /stores/:id          Delete store

GET    /products            List all products
GET    /products/:id        Get product details
POST   /products            Create product
PATCH  /products/:id        Update product
DELETE /products/:id        Delete product

GET    /approvals           List approvals
POST   /approvals           Create approval
PATCH  /approvals/:id       Update approval (approve/reject)

GET    /jobs                List jobs
GET    /jobs/:id            Get job details
POST   /jobs                Create job
PATCH  /jobs/:id            Update job status
```

### Query Parameters

```typescript
// Filtering
GET /jobs?status=eq.pending

// Sorting
GET /jobs?order=created_at.desc

// Pagination
GET /jobs?limit=20&offset=40

// Select specific fields
GET /products?select=id,title,sku

// Complex queries
GET /jobs?status=eq.pending&type=in.(sync_inventory,publish_listing)
```

### Response Format

```json
{
  "data": [...],
  "count": 100,
  "page": 1,
  "pageSize": 20
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid product data",
    "details": {
      "field": "sku",
      "issue": "SKU already exists"
    }
  }
}
```

---

## Security Architecture

### Authentication Flow

```
User Login
    ↓
Supabase Auth
    ↓
JWT Token (Access + Refresh)
    ↓
Store in HTTP-only Cookie
    ↓
Include in API Requests (Authorization Header)
    ↓
Supabase Validates JWT
    ↓
Access Granted/Denied
```

### Row Level Security (RLS)

```sql
-- Users can only see their own stores
CREATE POLICY "Users can view own stores"
  ON stores FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create stores for themselves
CREATE POLICY "Users can create own stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own stores
CREATE POLICY "Users can update own stores"
  ON stores FOR UPDATE
  USING (auth.uid() = user_id);
```

### API Key Security

```typescript
// Store encrypted in database
interface StoreCredentials {
  apiKey: string; // Encrypted with Supabase Vault
  apiSecret: string; // Encrypted
  shopDomain?: string;
  // Never exposed to frontend
}

// Decrypt only in secure Supabase functions
const decryptedKey = await vault.decrypt(credentials.apiKey);
```

### Security Best Practices

1. **Never store API keys in frontend code**
2. **Use environment variables for sensitive config**
3. **Implement rate limiting per user**
4. **Validate all inputs with Zod schemas**
5. **Sanitize user-generated content**
6. **Use HTTPS only**
7. **Implement CSRF protection**
8. **Regular security audits**

---

## Performance Considerations

### Frontend Optimization

1. **Code Splitting**: Lazy load routes
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **React Query Caching**: Minimize API calls
   ```typescript
   staleTime: 5 * 60 * 1000, // 5 minutes
   cacheTime: 10 * 60 * 1000, // 10 minutes
   ```

3. **Memoization**: Prevent unnecessary re-renders
   ```typescript
   const memoizedValue = useMemo(() => expensiveCalc(), [deps]);
   ```

4. **Virtual Scrolling**: For large lists
   ```typescript
   <VirtualList items={products} height={600} itemHeight={80} />
   ```

### Backend Optimization

1. **Database Indexes**: On frequently queried fields
2. **Connection Pooling**: Reuse database connections
3. **Query Optimization**: Select only needed fields
4. **Pagination**: Limit result sets
5. **Caching**: Redis for frequently accessed data

### Monitoring

- **Frontend**: Lighthouse, Web Vitals
- **Backend**: Supabase Dashboard, PostgreSQL slow query log
- **Error Tracking**: Sentry
- **Performance Monitoring**: DataDog/New Relic

---

## Deployment Architecture

### Development Environment

```
Local Machine
    ↓
Vite Dev Server (localhost:8080)
    ↓
Supabase Local (Docker)
```

### Staging Environment

```
GitHub → Vercel Preview Deploy
              ↓
         Supabase Staging Project
              ↓
         Platform Test Accounts
```

### Production Environment

```
GitHub Main Branch
    ↓
Vercel Production Deploy
    ↓
CDN (Edge Network)
    ↓
Supabase Production
    ↓
Platform Production APIs
```

### CI/CD Pipeline

```
git push → GitHub Actions
              ↓
         Run Tests
              ↓
         Run Linter
              ↓
         Build Application
              ↓
         Deploy to Vercel
              ↓
         Run E2E Tests
              ↓
         Notify Team
```

---

## Conclusion

This architecture is designed for:
- **Scalability**: Handle growing user base and data volume
- **Maintainability**: Clean code structure and patterns
- **Extensibility**: Easy to add new features and integrations
- **Security**: Multiple layers of protection
- **Performance**: Optimized for speed and efficiency
- **Reliability**: Error handling and monitoring at every level

---

**Document Version**: 1.0  
**Last Updated**: December 30, 2024  
**Next Review**: February 2025
