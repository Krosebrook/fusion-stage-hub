# Refactoring Recommendations

This document outlines code quality improvements, architectural enhancements, and technical debt to address for a production-ready codebase.

---

## Executive Summary

**Current State (v0.1.0)**:
- ✅ Well-structured component hierarchy
- ✅ Consistent use of TypeScript
- ✅ Modern React patterns (hooks, functional components)
- ⚠️ Mock data throughout (no real API integration)
- ⚠️ Some code duplication
- ⚠️ Limited error handling
- ⚠️ No abstraction for API calls

**Priority Refactoring Areas**:
1. **API Layer**: Create abstraction for Supabase calls
2. **State Management**: Consolidate data fetching patterns
3. **Error Handling**: Consistent error boundaries and user feedback
4. **Code Duplication**: Extract shared logic into hooks
5. **Type Safety**: Improve type definitions and remove any types
6. **Configuration Management**: Centralize constants and settings
7. **Performance**: Optimize re-renders and bundle size

---

## Table of Contents

1. [API Layer Refactoring](#api-layer-refactoring)
2. [State Management](#state-management)
3. [Component Structure](#component-structure)
4. [Type Safety](#type-safety)
5. [Error Handling](#error-handling)
6. [Performance Optimizations](#performance-optimizations)
7. [Configuration Management](#configuration-management)
8. [Testing Infrastructure](#testing-infrastructure)
9. [Code Organization](#code-organization)
10. [Anti-Patterns to Eliminate](#anti-patterns-to-eliminate)

---

## API Layer Refactoring

### Current Issues

**Problem**: Direct Supabase client calls scattered throughout components
```typescript
// ❌ Anti-pattern: Direct DB calls in components
const { data } = useQuery({
  queryKey: ['jobs'],
  queryFn: async () => {
    const { data, error } = await supabase.from('jobs').select('*');
    if (error) throw error;
    return data;
  }
});
```

### Recommended Solution

**Create API abstraction layer** (`src/lib/api/`)

```typescript
// src/lib/api/jobs.ts
export const jobsApi = {
  list: async (filters?: JobFilters): Promise<Job[]> => {
    const query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.status) {
      query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    if (error) throw new ApiError(error);
    return data;
  },
  
  get: async (id: string): Promise<Job> => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new ApiError(error);
    return data;
  },
  
  retry: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'pending', attempts: 0 })
      .eq('id', id);
    
    if (error) throw new ApiError(error);
  },
};
```

**Usage in components:**
```typescript
// ✅ Clean: Use API abstraction
import { jobsApi } from '@/lib/api/jobs';

const { data: jobs } = useQuery({
  queryKey: ['jobs', filters],
  queryFn: () => jobsApi.list(filters),
});
```

**Benefits**:
- Centralized API logic
- Easier to test (mock API layer)
- Consistent error handling
- Type-safe by default
- Easy to add caching, retries, etc.

---

## State Management

### Current Issues

**Problem**: Inconsistent data fetching patterns

```typescript
// ❌ Some components use useEffect + useState
const [jobs, setJobs] = useState([]);
useEffect(() => {
  fetchJobs().then(setJobs);
}, []);

// ❌ Others use TanStack Query
const { data: jobs } = useQuery(['jobs'], fetchJobs);
```

### Recommended Solution

**Standardize on TanStack Query** for all server state

```typescript
// src/hooks/useJobs.ts
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsApi.list(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 10000, // Poll every 10s for active jobs
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: jobsApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
    },
  });
}
```

**Benefits**:
- Consistent pattern across all components
- Automatic caching and deduplication
- Optimistic updates
- Background refetching
- Loading/error states handled

---

## Component Structure

### Current Issues

**Problem**: Large page components with mixed concerns

```typescript
// ❌ Jobs.tsx - 162 lines, handles filtering, table, search
export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  // Filtering logic
  const filteredJobs = jobs.filter(/* ... */);
  
  return (
    <AppLayout>
      {/* Search input */}
      {/* Filter dropdown */}
      {/* Jobs table */}
    </AppLayout>
  );
}
```

### Recommended Solution

**Extract smaller, focused components**

```typescript
// src/pages/Jobs.tsx (simplified)
export default function Jobs() {
  return (
    <AppLayout>
      <JobsHeader />
      <JobsFilters />
      <JobsTable />
    </AppLayout>
  );
}

// src/components/jobs/JobsFilters.tsx
export function JobsFilters() {
  const [filters, setFilters] = useJobFilters();
  
  return (
    <div className="flex gap-4">
      <SearchInput value={filters.search} onChange={/* ... */} />
      <StatusFilter value={filters.status} onChange={/* ... */} />
    </div>
  );
}

// src/components/jobs/JobsTable.tsx
export function JobsTable() {
  const filters = useJobFilters();
  const { data: jobs, isLoading } = useJobs(filters);
  
  if (isLoading) return <JobsTableSkeleton />;
  
  return (
    <Table>
      {jobs.map(job => <JobRow key={job.id} job={job} />)}
    </Table>
  );
}
```

**Benefits**:
- Smaller, easier to understand components
- Better testability
- Reusability
- Clearer separation of concerns

---

## Type Safety

### Current Issues

**Problem 1**: Inline type definitions

```typescript
// ❌ Types defined inline
const mockJobs: {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
}[] = [/* ... */];
```

**Problem 2**: Supabase types not fully utilized

```typescript
// ❌ Manual type definitions duplicate database schema
interface Job {
  id: string;
  org_id: string;
  type: string;
  status: string;
  // ... mirrors DB columns
}
```

### Recommended Solution

**Use Supabase generated types**

```typescript
// ✅ Import from generated types
import type { Database } from '@/integrations/supabase/types';

export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];
export type JobStatus = Database['public']['Enums']['job_status'];
```

**Create domain-specific types**

```typescript
// src/types/jobs.ts
import type { Job } from '@/integrations/supabase/types';

export interface JobWithStore extends Job {
  store: {
    id: string;
    name: string;
    platform: string;
  };
}

export interface JobFilters {
  status?: JobStatus;
  storeId?: string;
  search?: string;
  dateRange?: [Date, Date];
}

export interface JobStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}
```

**Benefits**:
- Single source of truth (database schema)
- Automatic updates when schema changes
- Better IDE autocomplete
- Catch type errors at compile time

---

## Error Handling

### Current Issues

**Problem**: Inconsistent error handling

```typescript
// ❌ Silent failures
try {
  const data = await fetchJobs();
  setJobs(data);
} catch (error) {
  // Error ignored
}

// ❌ Generic error messages
catch (error) {
  toast.error("Something went wrong");
}
```

### Recommended Solution

**Create custom error classes**

```typescript
// src/lib/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
  
  static fromSupabaseError(error: PostgrestError): ApiError {
    const message = getUserFriendlyMessage(error.code);
    return new ApiError(message, error.code, 500, error);
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`);
    this.name = 'RateLimitError';
  }
}
```

**Global error boundary**

```typescript
// src/components/ErrorBoundary.tsx
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log to Sentry/Datadog
        console.error('Error caught by boundary:', error, errorInfo);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  if (error instanceof AuthError) {
    return <AuthErrorPage onRetry={resetErrorBoundary} />;
  }
  
  if (error instanceof ApiError) {
    return <ApiErrorPage error={error} onRetry={resetErrorBoundary} />;
  }
  
  return <GenericErrorPage onRetry={resetErrorBoundary} />;
}
```

**Usage in queries**

```typescript
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        return await jobsApi.list();
      } catch (error) {
        if (error instanceof ApiError) {
          // Show user-friendly message
          toast.error(error.message);
        }
        throw error; // Re-throw for React Query error state
      }
    },
  });
}
```

---

## Performance Optimizations

### 1. Code Splitting

**Current**: All routes loaded upfront

```typescript
// ❌ No code splitting
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
```

**Recommended**: Lazy load routes

```typescript
// ✅ Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Jobs = lazy(() => import("./pages/Jobs"));

// In router
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/jobs" element={<Jobs />} />
  </Routes>
</Suspense>
```

### 2. Memoization

**Current**: Expensive computations on every render

```typescript
// ❌ Filters recalculated every render
const filteredJobs = jobs.filter(job => 
  job.status === filter && job.store.includes(search)
);
```

**Recommended**: Use `useMemo`

```typescript
// ✅ Memoize filtered results
const filteredJobs = useMemo(() => 
  jobs.filter(job => 
    job.status === filter && job.store.includes(search)
  ),
  [jobs, filter, search]
);
```

### 3. Callback Stability

**Current**: New callbacks every render

```typescript
// ❌ onClick recreated every render
<Button onClick={() => handleRetry(job.id)} />
```

**Recommended**: Use `useCallback`

```typescript
// ✅ Stable callback reference
const handleRetry = useCallback((id: string) => {
  retryMutation.mutate(id);
}, [retryMutation]);

<Button onClick={() => handleRetry(job.id)} />
```

### 4. Virtual Scrolling

**Current**: Render all rows (can be 1000+)

```typescript
// ❌ Renders all jobs
{jobs.map(job => <JobRow key={job.id} job={job} />)}
```

**Recommended**: Use `react-window` or `@tanstack/react-virtual`

```typescript
// ✅ Only render visible rows
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: jobs.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});

{virtualizer.getVirtualItems().map(virtualRow => (
  <JobRow key={jobs[virtualRow.index].id} job={jobs[virtualRow.index]} />
))}
```

---

## Configuration Management

### Current Issues

**Problem**: Magic strings and numbers throughout code

```typescript
// ❌ Hardcoded values
useQuery({
  queryKey: ['jobs'],
  staleTime: 30000,
  refetchInterval: 10000,
});

// ❌ Inline rate limits
if (requestCount > 10) {
  throw new Error("Rate limit exceeded");
}
```

### Recommended Solution

**Centralize configuration**

```typescript
// src/config/index.ts
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
  },
  
  cache: {
    staleTime: {
      jobs: 30000,      // 30 seconds
      products: 300000, // 5 minutes
      stores: 600000,   // 10 minutes
    },
    refetchInterval: {
      jobs: 10000,      // 10 seconds (for active jobs)
      dashboard: 60000, // 1 minute
    },
  },
  
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  
  pagination: {
    defaultPageSize: 30,
    maxPageSize: 100,
  },
  
  jobs: {
    maxRetries: 3,
    retryDelays: [1000, 5000, 15000], // 1s, 5s, 15s
  },
} as const;
```

**Usage**:
```typescript
// ✅ Use config constants
import { config } from '@/config';

useQuery({
  queryKey: ['jobs'],
  staleTime: config.cache.staleTime.jobs,
  refetchInterval: config.cache.refetchInterval.jobs,
});
```

---

## Testing Infrastructure

### Current State

- ❌ No tests currently
- ❌ No testing utilities

### Recommended Setup

**1. Unit Testing Setup**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '**/*.test.tsx'],
    },
  },
});
```

**2. Testing Utilities**

```typescript
// src/test/utils.tsx
export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
};
```

**3. Component Tests**

```typescript
// src/components/jobs/JobRow.test.tsx
import { renderWithProviders } from '@/test/utils';
import { JobRow } from './JobRow';

describe('JobRow', () => {
  const mockJob = {
    id: '123',
    type: 'sync_inventory',
    status: 'completed',
    created_at: new Date().toISOString(),
  };
  
  it('renders job information', () => {
    const { getByText } = renderWithProviders(<JobRow job={mockJob} />);
    expect(getByText('sync_inventory')).toBeInTheDocument();
    expect(getByText('completed')).toBeInTheDocument();
  });
});
```

---

## Code Organization

### Recommended Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base components (shadcn/ui)
│   ├── layout/         # Layout components
│   └── [feature]/      # Feature-specific components
│       ├── index.ts    # Barrel export
│       ├── Component.tsx
│       └── Component.test.tsx
│
├── pages/              # Route pages (thin wrappers)
│   └── Jobs.tsx
│
├── hooks/              # Custom React hooks
│   ├── useJobs.ts
│   └── useJobFilters.ts
│
├── lib/                # Core utilities
│   ├── api/           # API abstraction layer
│   │   ├── jobs.ts
│   │   ├── stores.ts
│   │   └── index.ts
│   ├── errors.ts      # Custom error classes
│   └── utils.ts       # General utilities
│
├── types/              # TypeScript type definitions
│   ├── jobs.ts
│   ├── stores.ts
│   └── index.ts
│
├── config/             # Configuration constants
│   └── index.ts
│
├── integrations/       # External service integrations
│   └── supabase/
│
└── test/               # Testing utilities
    ├── setup.ts
    └── utils.tsx
```

---

## Anti-Patterns to Eliminate

### 1. Prop Drilling

**❌ Problem**:
```typescript
<Parent>
  <Child userId={userId}>
    <GrandChild userId={userId}>
      <GreatGrandChild userId={userId} />
    </GrandChild>
  </Child>
</Parent>
```

**✅ Solution**: Use Context or state management
```typescript
const UserContext = createContext<User | null>(null);

function Parent() {
  const user = useUser();
  return (
    <UserContext.Provider value={user}>
      <Child />
    </UserContext.Provider>
  );
}

function GreatGrandChild() {
  const user = useContext(UserContext);
}
```

### 2. Inconsistent Naming

**❌ Problem**:
```typescript
const data = fetchData();
const result = getData();
const info = retrieveInfo();
```

**✅ Solution**: Consistent verb + noun pattern
```typescript
const jobs = getJobs();
const job = getJobById(id);
const success = createJob(data);
```

### 3. Long Parameter Lists

**❌ Problem**:
```typescript
function createJob(
  type: string,
  storeId: string,
  payload: object,
  priority: number,
  retries: number,
  timeout: number
) { }
```

**✅ Solution**: Use options object
```typescript
interface CreateJobOptions {
  type: string;
  storeId: string;
  payload: object;
  priority?: number;
  retries?: number;
  timeout?: number;
}

function createJob(options: CreateJobOptions) { }
```

---

## Implementation Priority

### Phase 1: Foundation (v0.2.0)
1. ✅ API abstraction layer
2. ✅ Consistent state management (TanStack Query)
3. ✅ Error handling infrastructure
4. ✅ Type safety improvements

### Phase 2: Quality (v0.3.0)
1. ✅ Component extraction and organization
2. ✅ Testing infrastructure
3. ✅ Performance optimizations
4. ✅ Configuration management

### Phase 3: Polish (v0.5.0)
1. ✅ Code splitting
2. ✅ Virtual scrolling
3. ✅ Advanced caching strategies
4. ✅ Bundle size optimization

---

**Remember**: Refactor incrementally. Don't rewrite everything at once!
