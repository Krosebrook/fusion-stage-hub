# Architecture Documentation

## Overview

Fusion Stage Hub is a **multi-tenant, event-driven e-commerce orchestration platform** designed to manage product publishing, inventory synchronization, and order processing across multiple marketplace platforms. This document explains the architectural decisions, system design, and implementation patterns.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Architecture](#data-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Plugin System](#plugin-system)
6. [Job Queue Architecture](#job-queue-architecture)
7. [Approval Workflow](#approval-workflow)
8. [Security Architecture](#security-architecture)
9. [Scalability Considerations](#scalability-considerations)
10. [Technology Decisions](#technology-decisions)

---

## System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  React SPA (TypeScript + Vite)                                 │  │
│  │  • Pages: Dashboard, Jobs, Stores, Products, Publishing, etc.  │  │
│  │  • State: TanStack Query (server) + React hooks (local)        │  │
│  │  • UI: shadcn/ui + Radix UI + Tailwind CSS                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS/WebSocket
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Supabase Layer                                │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL     │  │   Auth       │  │  Real-time           │   │
│  │  • Multi-tenant │  │   • RLS      │  │  • Subscriptions     │   │
│  │  • RLS policies │  │   • JWT      │  │  • Presence          │   │
│  │  • JSON indexes │  │   • MFA      │  │  • Broadcast         │   │
│  └─────────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Storage        │  │  Functions   │  │  Vault (Secrets)     │   │
│  │  • Images       │  │  • Workers   │  │  • API keys          │   │
│  │  • Documents    │  │  • Webhooks  │  │  • OAuth tokens      │   │
│  └─────────────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ REST/GraphQL APIs
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       External Platform APIs                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │ Shopify  │  │   Etsy   │  │  Amazon SC │  │  Printify/etc.  │   │
│  │ GraphQL  │  │  REST v3 │  │   SP-API   │  │     REST        │   │
│  └──────────┘  └──────────┘  └────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles

1. **Multi-Tenancy First**: All data scoped to organizations with strict isolation
2. **Event-Driven**: Asynchronous job processing for long-running operations
3. **Plugin-Based**: Modular platform integrations with capability contracts
4. **Approval-Driven**: Human-in-the-loop for critical operations
5. **Observable**: Comprehensive logging and audit trails
6. **Resilient**: Retry logic, rate limiting, and graceful degradation

---

## Data Architecture

### Entity-Relationship Model

```
┌──────────────┐
│     orgs     │ 1:N
│ (tenant)     ├────────┐
└──────┬───────┘        │
       │ 1:N            │
       │                │
┌──────▼───────┐  ┌────▼────────┐
│ org_members  │  │   stores    │ 1:N
│ (RBAC)       │  │ (platforms) ├──────┐
└──────────────┘  └────┬────────┘      │
                       │ 1:N           │
                       │               │
                  ┌────▼────────┐ ┌───▼──────────┐
                  │  products   │ │   jobs       │
                  │ (catalog)   │ │ (queue)      │
                  └────┬────────┘ └──────────────┘
                       │ 1:N
                  ┌────▼────────┐
                  │  listings   │
                  │ (published) │
                  └─────────────┘
```

### Database Tables (Simplified)

#### Core Tables

**orgs**: Organization/tenant root
- `id`: UUID (PK)
- `name`: Text
- `slug`: Text (unique)
- `settings`: JSONB (org-wide config)

**org_members**: Organization membership with RBAC
- `org_id`: UUID (FK → orgs)
- `user_id`: UUID (FK → auth.users)
- `role`: Enum (owner, operator, viewer)

**stores**: Connected platform accounts
- `org_id`: UUID (FK → orgs)
- `platform`: Text (shopify, etsy, amazon-sc, etc.)
- `external_id`: Text (store ID from platform)
- `credentials_encrypted`: Text (API keys, OAuth tokens)
- `rate_limit_state`: JSONB (token bucket state)
- `last_synced_at`: Timestamp

#### Plugin System

**plugins**: Available platform integrations
- `slug`: Text (unique) - e.g., "shopify", "etsy"
- `name`: Text - "Shopify"
- `version`: Text - "2.1.0"

**plugin_contracts**: Capability matrix
- `plugin_id`: UUID (FK → plugins)
- `capability`: Text - "list_products", "bulk_update", etc.
- `level`: Enum (native, workaround, unsupported)
- `constraints`: JSONB - rate limits, batch sizes

**plugin_instances**: Per-store plugin config
- `store_id`: UUID (FK → stores)
- `plugin_id`: UUID (FK → plugins)
- `config`: JSONB (store-specific settings)

#### Job Queue

**jobs**: Asynchronous task queue
- `org_id`: UUID (FK → orgs)
- `store_id`: UUID (FK → stores) - nullable
- `type`: Text - "sync_inventory", "publish_listing"
- `status`: Enum (pending, claimed, running, completed, failed, cancelled)
- `payload`: JSONB (job parameters)
- `scheduled_at`: Timestamp (for delayed execution)
- `attempts`: Int (retry counter)
- `max_attempts`: Int
- `claimed_by`: Text (worker ID)
- `claimed_at`: Timestamp

**job_logs**: Execution history
- `job_id`: UUID (FK → jobs)
- `level`: Enum (info, warning, error)
- `message`: Text
- `metadata`: JSONB

#### Approval Workflow

**approvals**: Change approval requests
- `org_id`: UUID (FK → orgs)
- `resource_type`: Text - "product", "listing"
- `resource_id`: UUID
- `action`: Text - "publish", "update", "delete"
- `status`: Enum (pending, approved, rejected, expired)
- `requested_by`: UUID (FK → profiles)
- `decided_by`: UUID (FK → profiles) - nullable
- `payload`: JSONB (change details)
- `expires_at`: Timestamp

**approval_policies**: Org-level rules
- `org_id`: UUID (FK → orgs)
- `resource_type`: Text
- `action`: Text
- `requires_approval`: Boolean
- `auto_approve_threshold`: JSONB (criteria)

#### Product & Publishing

**products**: Unified product catalog
- `org_id`: UUID (FK → orgs)
- `title`: Text
- `description`: Text
- `category`: Text
- `tags`: Text[]
- `base_price`: Numeric
- `metadata`: JSONB (custom fields)

**product_variants**: SKU management
- `product_id`: UUID (FK → products)
- `sku`: Text (unique within org)
- `attributes`: JSONB - {"size": "L", "color": "blue"}
- `price`: Numeric
- `inventory_qty`: Int

**listings**: Store-specific published products
- `product_id`: UUID (FK → products)
- `store_id`: UUID (FK → stores)
- `external_id`: Text (ID on platform)
- `status`: Enum (draft, staged, publishing, published, failed, delisted)
- `platform_data`: JSONB (platform-specific fields)
- `published_at`: Timestamp

### Indexes and Performance

**Composite Indexes:**
- `(org_id, created_at DESC)` on most tables for paginated queries
- `(store_id, status)` on jobs for queue polling
- `(org_id, status, expires_at)` on approvals for dashboard

**JSONB Indexes:**
- GIN index on `payload` in jobs for JSON queries
- GIN index on `platform_data` in listings

**Partitioning (Future):**
- Partition `job_logs` by month for archival
- Partition `audit_logs` by quarter

---

## Frontend Architecture

### Component Hierarchy

```
App
├── QueryClientProvider (TanStack Query)
├── TooltipProvider (Radix UI)
├── BrowserRouter
│   └── Routes
│       ├── Dashboard
│       │   └── AppLayout
│       │       ├── Sidebar
│       │       ├── Header
│       │       └── MetricCard[]
│       ├── Jobs
│       │   └── AppLayout
│       │       └── JobTable
│       ├── Stores
│       │   └── AppLayout
│       │       └── StoreCard[]
│       └── [other pages]
├── Toaster (sonner notifications)
└── Toaster (shadcn toast)
```

### State Management Strategy

**Server State (TanStack Query):**
- API calls to Supabase
- Real-time subscriptions
- Optimistic updates
- Cache invalidation

**Local State (React useState/useReducer):**
- Form inputs
- UI toggles (sidebar collapsed, modals)
- Filters and search

**URL State (React Router):**
- Current page
- Query parameters for filters
- Pagination

### Data Flow

```
User Action
    │
    ▼
Component Event Handler
    │
    ▼
TanStack Query Mutation
    │
    ▼
Supabase Client
    │
    ▼
PostgreSQL + RLS
    │
    ▼
Real-time Subscription (optional)
    │
    ▼
Auto Cache Update
    │
    ▼
UI Re-render
```

### Component Design Patterns

**Composition over Inheritance:**
```tsx
<AppLayout>
  <PageContent>
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <JobTable />
      </CardContent>
    </Card>
  </PageContent>
</AppLayout>
```

**Render Props for Flexibility:**
```tsx
<DataTable
  data={jobs}
  columns={columns}
  renderRow={(job) => <JobRow job={job} />}
/>
```

**Custom Hooks for Logic Reuse:**
```tsx
function useJobQueue(storeId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['jobs', storeId],
    queryFn: () => fetchJobs(storeId),
  });
  return { jobs: data, loading: isLoading };
}
```

---

## Backend Architecture

### Supabase Edge Functions (Planned)

**Job Worker Function** (`/functions/job-worker`)
```typescript
// Polls jobs table, claims pending jobs, executes, updates status
Deno.serve(async (req) => {
  const job = await claimNextJob();
  if (job) {
    try {
      await executeJob(job);
      await markJobCompleted(job.id);
    } catch (err) {
      await markJobFailed(job.id, err);
    }
  }
  return new Response("OK");
});
```

**Webhook Handler** (`/functions/webhook`)
```typescript
// Receives webhooks from platforms (Shopify order created, etc.)
Deno.serve(async (req) => {
  const signature = req.headers.get("X-Shopify-Hmac-SHA256");
  const payload = await req.json();
  
  // Verify signature
  if (!verifySignature(payload, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // Insert webhook log
  await supabase.from("webhooks").insert({
    platform: "shopify",
    event: payload.type,
    payload,
  });
  
  // Enqueue processing job
  await enqueueJob("process_webhook", { webhook_id: ... });
  
  return new Response("OK");
});
```

**Approval Expiry Function** (`/functions/expire-approvals`)
```typescript
// Scheduled via pg_cron to run every 5 minutes
Deno.serve(async (req) => {
  await supabase
    .from("approvals")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
  
  return new Response("OK");
});
```

### Database Functions (PostgreSQL)

**Enqueue Job**
```sql
CREATE FUNCTION enqueue_job(
  p_org_id UUID,
  p_type TEXT,
  p_payload JSONB,
  p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
  INSERT INTO jobs (org_id, type, payload, scheduled_at)
  VALUES (p_org_id, p_type, p_payload, p_scheduled_at)
  RETURNING id;
$$ LANGUAGE SQL;
```

**Claim Next Job (with locking)**
```sql
CREATE FUNCTION claim_next_job(p_worker_id TEXT) RETURNS jobs AS $$
  UPDATE jobs
  SET 
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = NOW()
  WHERE id = (
    SELECT id FROM jobs
    WHERE status = 'pending'
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE SQL;
```

### Row Level Security (RLS) Policies

**Example: jobs table**
```sql
-- Users can only see jobs in their org
CREATE POLICY "Users can view own org jobs"
ON jobs FOR SELECT
USING (org_id IN (
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid()
));

-- Only operators/owners can create jobs
CREATE POLICY "Operators can create jobs"
ON jobs FOR INSERT
WITH CHECK (org_id IN (
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid()
    AND role IN ('owner', 'operator')
));
```

---

## Plugin System

### Capability Matrix

Each plugin declares which capabilities it supports and at what level:

| Capability | Shopify | Etsy | Amazon SC | Printify |
|------------|---------|------|-----------|----------|
| list_products | Native | Native | Native | Native |
| create_product | Native | Native | Native | Workaround |
| update_product | Native | Native | Native | Workaround |
| delete_product | Native | Native | Native | Unsupported |
| bulk_operations | Native | Workaround | Native | Unsupported |
| real_time_inventory | Native | Unsupported | Workaround | Native |
| order_webhooks | Native | Native | Native | Native |

### Plugin Interface (Conceptual)

```typescript
interface Plugin {
  slug: string;
  name: string;
  version: string;
  
  // Capability implementation
  capabilities: {
    list_products: (config: StoreConfig) => Promise<Product[]>;
    create_product: (config: StoreConfig, product: Product) => Promise<string>;
    // ... other capabilities
  };
  
  // Rate limiting constraints
  rateLimit: {
    requestsPerSecond: number;
    burstSize: number;
    costFunction?: (capability: string) => number;
  };
  
  // Authentication
  auth: {
    type: "oauth" | "api_key";
    setup: (credentials: unknown) => Promise<void>;
  };
}
```

### Rate Limiting Implementation

**Token Bucket Algorithm** (stored in `stores.rate_limit_state`):
```json
{
  "tokens": 850,
  "capacity": 1000,
  "refill_rate": 10,
  "last_refill": "2024-12-30T12:00:00Z"
}
```

Before each API call:
1. Check if tokens available
2. If yes, decrement tokens and proceed
3. If no, delay or queue job
4. Refill tokens based on elapsed time

---

## Job Queue Architecture

### Job Lifecycle

```
pending → claimed → running → completed
                      ↓
                    failed → (retry) → pending
                      ↓ (max attempts)
                   failed (permanent)
```

### Job Processing Flow

1. **Enqueue**: Insert job with `status='pending'`
2. **Claim**: Worker claims job with `FOR UPDATE SKIP LOCKED`
3. **Execute**: Worker calls plugin capability
4. **Log**: Write progress to `job_logs`
5. **Complete/Fail**: Update job status
6. **Retry**: If failed and attempts < max_attempts, reset to pending with delay

### Worker Implementation (Pseudo-code)

```typescript
while (true) {
  const job = await claimNextJob(workerId);
  
  if (!job) {
    await sleep(POLL_INTERVAL);
    continue;
  }
  
  try {
    const plugin = getPlugin(job.payload.platform);
    const result = await plugin.execute(job.type, job.payload);
    
    await logJobProgress(job.id, "info", "Completed successfully");
    await markJobCompleted(job.id, result);
  } catch (err) {
    await logJobProgress(job.id, "error", err.message);
    
    if (job.attempts < job.max_attempts) {
      const delay = exponentialBackoff(job.attempts);
      await retryJob(job.id, delay);
    } else {
      await markJobFailed(job.id, "Max attempts exceeded");
    }
  }
}
```

### Scheduled Jobs

Use `scheduled_at` column for delayed execution:
- **Recurring syncs**: Schedule inventory sync every 15 minutes
- **Batch operations**: Schedule heavy operations during off-peak hours
- **Retry delays**: Exponential backoff (1m, 5m, 15m, 1h)

---

## Approval Workflow

### Approval Process

```
User Action → Check Policy → Requires Approval?
                                │
                        Yes ─────┼───── No
                        │               │
                  Create Approval   Execute Directly
                        │
                  Notify Approvers
                        │
          ┌─────────────┴─────────────┐
          │                           │
    Approve Decision            Reject Decision
          │                           │
    Execute Action              Cancel Action
          │                           │
    Log Audit                   Log Audit
```

### Policy Evaluation

```typescript
function requiresApproval(
  orgId: string,
  action: string,
  resourceType: string,
  payload: unknown
): boolean {
  const policy = getPolicyFor(orgId, resourceType, action);
  
  if (!policy || !policy.requires_approval) {
    return false;
  }
  
  // Check auto-approve criteria
  if (policy.auto_approve_threshold) {
    return !meetsThreshold(payload, policy.auto_approve_threshold);
  }
  
  return true;
}
```

**Example Policy**:
```json
{
  "resource_type": "listing",
  "action": "publish",
  "requires_approval": true,
  "auto_approve_threshold": {
    "max_price": 50,
    "max_quantity": 10
  }
}
```

---

## Security Architecture

### Authentication Flow

```
User Login
    │
    ▼
Supabase Auth
    │
    ▼
JWT issued
    │
    ▼
Client stores JWT in memory
    │
    ▼
All requests include JWT
    │
    ▼
RLS policies validate auth.uid()
```

### Data Isolation

**Organization Scoping**:
- All queries filtered by `org_id`
- RLS policies enforce at database level
- No cross-org data leakage possible

**Role-Based Access**:
- `owner`: Full access, can manage members
- `operator`: Can create/update, requires approval for deletes
- `viewer`: Read-only access

### Credential Management

**API Keys/OAuth Tokens**:
- Stored in `stores.credentials_encrypted`
- Encrypted using Supabase Vault
- Never exposed to frontend
- Edge Functions decrypt for API calls

**Audit Logging**:
- All write operations logged
- Includes user, timestamp, before/after state
- Immutable append-only log

---

## Scalability Considerations

### Current Bottlenecks (MVP)

1. **Single Worker**: Job processing limited to one Edge Function instance
2. **No Caching**: Every query hits database
3. **No CDN**: Static assets served directly
4. **No Connection Pooling**: Direct Supabase client connections

### Scaling Strategy (Future)

**Horizontal Scaling**:
- Multiple worker instances with distributed locking
- Job partitioning by org_id or store_id
- Read replicas for heavy queries

**Caching Layer**:
- Redis for session state and job queue
- CDN for static assets (Cloudflare)
- Query result caching with TTL

**Database Optimization**:
- Connection pooling (PgBouncer)
- Table partitioning (by time)
- Materialized views for analytics

**Rate Limiting**:
- Per-org API quotas
- Distributed rate limiting (Redis)
- Queue backpressure handling

---

## Technology Decisions

### Why React?
- ✅ Large ecosystem and talent pool
- ✅ Excellent TypeScript support
- ✅ Component reusability
- ✅ Great devtools and debugging

### Why Vite?
- ✅ Fast HMR (Hot Module Replacement)
- ✅ ESM-first approach
- ✅ Plugin ecosystem
- ✅ Production-ready build optimization

### Why Supabase?
- ✅ Managed PostgreSQL (no ops overhead)
- ✅ Built-in auth with RLS
- ✅ Real-time subscriptions
- ✅ Edge Functions (Deno runtime)
- ✅ Generous free tier
- ⚠️ Vendor lock-in (mitigated by standard Postgres)

### Why PostgreSQL?
- ✅ ACID compliance (critical for e-commerce)
- ✅ JSONB for flexible schemas
- ✅ Advanced indexing (GIN, GiST)
- ✅ Row Level Security
- ✅ Mature ecosystem

### Why TanStack Query?
- ✅ Automatic caching and deduplication
- ✅ Optimistic updates
- ✅ Background refetching
- ✅ Request cancellation
- ✅ DevTools for debugging

### Why shadcn/ui?
- ✅ Copy-paste components (no npm bloat)
- ✅ Full TypeScript support
- ✅ Accessibility via Radix UI
- ✅ Customizable (Tailwind)
- ✅ High-quality components

### Why Not X?

**Why not Next.js?**
- No need for SSR (internal tool)
- Simpler deployment (SPA)
- Edge Functions replace API routes

**Why not Redux?**
- TanStack Query handles server state
- Local state simple enough for hooks
- Avoids boilerplate

**Why not MongoDB?**
- E-commerce needs ACID transactions
- Relational data (orgs → stores → products)
- PostgreSQL JSONB provides flexibility

---

## Future Architecture Evolution

### v0.5.0: Event Sourcing
- Event store for audit trail
- Event replay for debugging
- CQRS for read/write separation

### v1.0.0: Microservices (Maybe)
- Separate services per platform
- Message queue (RabbitMQ/SQS)
- API Gateway (Kong/AWS API Gateway)

### v2.0.0: Multi-Region
- Regional databases
- Global CDN
- Active-active replication

---

**Last Updated**: 2024-12-30  
**Author**: Architecture Team  
**Status**: Living Document
