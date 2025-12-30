# Debugging Guide

A comprehensive guide to debugging common issues in Fusion Stage Hub.

---

## Table of Contents

1. [Development Environment Issues](#development-environment-issues)
2. [Authentication Problems](#authentication-problems)
3. [Database & Supabase Issues](#database--supabase-issues)
4. [Job Queue Problems](#job-queue-problems)
5. [UI & Rendering Issues](#ui--rendering-issues)
6. [API Integration Issues](#api-integration-issues)
7. [Performance Problems](#performance-problems)
8. [Deployment Issues](#deployment-issues)
9. [Debugging Tools](#debugging-tools)
10. [Common Error Messages](#common-error-messages)

---

## Development Environment Issues

### Issue: `npm install` fails

**Symptoms**:
- Package installation errors
- Peer dependency conflicts
- Version mismatch warnings

**Solutions**:

1. **Clear cache and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

2. **Use correct Node version**:
   ```bash
   nvm use 18
   # or
   nvm install 18 && nvm use 18
   ```

3. **Check npm version** (should be 9+):
   ```bash
   npm --version
   npm install -g npm@latest
   ```

---

### Issue: `npm run dev` fails to start

**Symptoms**:
- Port already in use
- Vite errors
- TypeScript errors blocking build

**Solutions**:

1. **Port conflict** (8080 in use):
   ```bash
   # Kill process on port 8080
   lsof -ti:8080 | xargs kill -9
   
   # Or change port in vite.config.ts
   server: { port: 3000 }
   ```

2. **Clear Vite cache**:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Fix TypeScript errors**:
   ```bash
   npm run build  # Shows all TS errors
   # Fix errors, then retry dev server
   ```

---

### Issue: Changes not reflecting in browser

**Symptoms**:
- Code changes don't appear
- Old version still loading
- Stale cache

**Solutions**:

1. **Hard refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Clear browser cache**: DevTools → Network → Disable cache
3. **Restart dev server**: Stop and `npm run dev` again
4. **Clear React Query cache**:
   ```typescript
   // In browser console
   queryClient.clear()
   ```

---

## Authentication Problems

### Issue: Cannot log in (v0.1.0 - Not Implemented)

**Symptoms**:
- Auth page doesn't work
- No response on login

**Reason**: Authentication not yet implemented in v0.1.0 MVP

**Workaround**: None for now. Coming in v0.2.0.

---

### Issue: RLS policy errors (403 Forbidden)

**Symptoms**:
```
Error: Row level security policy violation
```

**Cause**: Database query blocked by RLS policy

**Solutions**:

1. **Check authentication**:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session); // Should have user
   ```

2. **Verify org membership**:
   ```sql
   SELECT * FROM org_members WHERE user_id = auth.uid();
   ```

3. **Check RLS policies**:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM pg_policies WHERE tablename = 'jobs';
   ```

4. **Disable RLS for debugging** (dev only):
   ```sql
   ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
   -- Re-enable after debugging!
   ```

---

## Database & Supabase Issues

### Issue: Migrations fail

**Symptoms**:
```
Error: relation "jobs" already exists
```

**Cause**: Migration already applied or manual changes

**Solutions**:

1. **Reset database** (dev only, loses all data):
   ```bash
   supabase db reset
   ```

2. **Check migration status**:
   ```bash
   supabase migration list
   ```

3. **Skip failed migration**:
   ```bash
   supabase migration repair <version> --status applied
   ```

---

### Issue: "Too many connections" error

**Symptoms**:
```
Error: remaining connection slots are reserved
```

**Cause**: Connection pool exhausted

**Solutions**:

1. **Close unused connections**:
   ```typescript
   // Don't create multiple Supabase clients
   // ❌ Bad
   function MyComponent() {
     const supabase = createClient(...); // New client every render!
   }
   
   // ✅ Good
   import { supabase } from '@/integrations/supabase/client';
   ```

2. **Use connection pooling** (production):
   - Enable PgBouncer in Supabase dashboard
   - Use transaction mode for short queries

---

### Issue: Query returns empty results

**Symptoms**:
- Query succeeds but returns `[]`
- Expected data not found

**Debug Steps**:

1. **Check query in SQL Editor**:
   ```sql
   SELECT * FROM jobs WHERE org_id = '<YOUR_ORG_ID>';
   ```

2. **Verify RLS policy allows read**:
   ```sql
   SET ROLE authenticated;
   SET request.jwt.claims TO '{"sub":"<USER_ID>"}';
   SELECT * FROM jobs;
   ```

3. **Log query result**:
   ```typescript
   const { data, error, count } = await supabase
     .from('jobs')
     .select('*', { count: 'exact' });
   
   console.log('Data:', data);
   console.log('Count:', count);
   console.log('Error:', error);
   ```

---

## Job Queue Problems

### Issue: Jobs stuck in "pending" status

**Symptoms**:
- Jobs never transition to "running"
- No worker processing jobs

**Cause**: Job worker not implemented yet (v0.1.0)

**Workaround**: Manual status update for testing
```sql
UPDATE jobs SET status = 'completed' WHERE id = '<JOB_ID>';
```

**Future Fix** (v0.2.0): Implement Edge Function job worker

---

### Issue: Jobs fail immediately

**Symptoms**:
- Job status changes to "failed"
- No useful error message

**Debug Steps**:

1. **Check job logs**:
   ```sql
   SELECT * FROM job_logs WHERE job_id = '<JOB_ID>' ORDER BY created_at DESC;
   ```

2. **Check job payload**:
   ```sql
   SELECT payload FROM jobs WHERE id = '<JOB_ID>';
   ```

3. **Validate payload schema**:
   ```typescript
   // Ensure payload matches expected structure
   const jobSchema = z.object({
     storeId: z.string().uuid(),
     productId: z.string().uuid(),
   });
   
   jobSchema.parse(job.payload); // Throws if invalid
   ```

---

## UI & Rendering Issues

### Issue: Page shows "loading" indefinitely

**Symptoms**:
- Spinner never disappears
- Data never loads

**Debug Steps**:

1. **Check TanStack Query DevTools**:
   ```typescript
   // Add to App.tsx
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   
   <ReactQueryDevtools initialIsOpen={false} />
   ```
   
   - Open DevTools (bottom right icon)
   - Check query status (loading, error, success)
   - View error details

2. **Check browser console** for errors

3. **Check network tab**:
   - Failed requests (red)
   - CORS errors
   - 401/403 auth errors

---

### Issue: Components not updating on data change

**Symptoms**:
- Data changes in database but UI doesn't reflect
- Stale data displayed

**Cause**: Query not invalidated

**Solutions**:

1. **Manual invalidation after mutation**:
   ```typescript
   const mutation = useMutation({
     mutationFn: updateJob,
     onSuccess: () => {
       queryClient.invalidateQueries(['jobs']);
     },
   });
   ```

2. **Enable real-time subscriptions**:
   ```typescript
   useEffect(() => {
     const subscription = supabase
       .channel('jobs-changes')
       .on('postgres_changes', 
         { event: '*', schema: 'public', table: 'jobs' },
         (payload) => {
           queryClient.invalidateQueries(['jobs']);
         }
       )
       .subscribe();
     
     return () => subscription.unsubscribe();
   }, []);
   ```

---

### Issue: Styling not applied / Tailwind classes missing

**Symptoms**:
- Components have no styles
- Tailwind classes not working

**Solutions**:

1. **Check Tailwind config**:
   ```typescript
   // tailwind.config.ts
   content: [
     "./index.html",
     "./src/**/*.{ts,tsx}", // Must include all files
   ],
   ```

2. **Restart dev server** after config changes

3. **Check for typos** in class names:
   ```typescript
   // ❌ Won't work
   className="bg-primry"
   
   // ✅ Correct
   className="bg-primary"
   ```

4. **Use cn() utility** for conditional classes:
   ```typescript
   import { cn } from "@/lib/utils";
   
   className={cn(
     "base-class",
     condition && "conditional-class"
   )}
   ```

---

## API Integration Issues

### Issue: Shopify OAuth redirect fails

**Symptoms**:
- Redirect loops
- "Invalid redirect_uri" error
- Access token not received

**Debug Steps**:

1. **Verify redirect URI** matches exactly in Shopify Partner Dashboard
   - Dev: `http://localhost:8080/callback/shopify`
   - Prod: `https://yourapp.com/callback/shopify`

2. **Check state parameter** (CSRF protection):
   ```typescript
   // Store state before redirect
   sessionStorage.setItem('oauth_state', state);
   
   // Verify on callback
   const storedState = sessionStorage.getItem('oauth_state');
   if (callbackState !== storedState) {
     throw new Error('State mismatch');
   }
   ```

3. **Log OAuth flow**:
   ```typescript
   console.log('1. Redirect URL:', authUrl);
   console.log('2. Callback params:', callbackParams);
   console.log('3. Access token:', accessToken);
   ```

---

### Issue: Rate limit errors from platform APIs

**Symptoms**:
```
Error: 429 Too Many Requests
Retry-After: 60
```

**Solutions**:

1. **Respect Retry-After header**:
   ```typescript
   if (response.status === 429) {
     const retryAfter = response.headers.get('Retry-After');
     await sleep(parseInt(retryAfter) * 1000);
     return retry();
   }
   ```

2. **Implement exponential backoff**:
   ```typescript
   const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
   await sleep(delay);
   ```

3. **Check token bucket state**:
   ```sql
   SELECT rate_limit_state FROM stores WHERE id = '<STORE_ID>';
   ```

---

## Performance Problems

### Issue: Slow page loads

**Symptoms**:
- Pages take 3+ seconds to load
- UI feels sluggish
- High CPU usage

**Debug Steps**:

1. **Profile with React DevTools**:
   - Open React DevTools → Profiler
   - Record interaction
   - Find slow components (red bars)

2. **Check bundle size**:
   ```bash
   npm run build
   # Check dist/ folder size
   # Should be < 500KB gzipped
   ```

3. **Analyze bundle**:
   ```bash
   npm install -D rollup-plugin-visualizer
   # Add to vite.config.ts
   ```

**Solutions**:

1. **Add code splitting**:
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Memoize expensive computations**:
   ```typescript
   const filtered = useMemo(() => 
     jobs.filter(filterFn),
     [jobs, filterFn]
   );
   ```

3. **Virtual scrolling** for long lists

---

### Issue: Memory leaks

**Symptoms**:
- Browser tab uses increasing memory
- App slows down over time
- "Out of memory" errors

**Debug Steps**:

1. **Chrome DevTools → Memory → Heap Snapshot**
2. **Look for detached DOM nodes**
3. **Check for unsubscribed listeners**

**Common Causes**:

```typescript
// ❌ Memory leak: event listener not removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);

// ✅ Fixed
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// ❌ Memory leak: subscription not unsubscribed
const subscription = supabase.channel('jobs').subscribe();

// ✅ Fixed
useEffect(() => {
  const sub = supabase.channel('jobs').subscribe();
  return () => sub.unsubscribe();
}, []);
```

---

## Deployment Issues

### Issue: Build fails in production

**Symptoms**:
```
npm run build
ERROR: TypeScript compilation failed
```

**Solutions**:

1. **Fix TypeScript errors locally first**:
   ```bash
   npm run build  # Must pass before deploying
   ```

2. **Check for environment-specific issues**:
   ```typescript
   // ❌ May fail in production
   const config = process.env.VITE_API_URL;
   
   // ✅ Provide default
   const config = import.meta.env.VITE_API_URL || 'https://api.example.com';
   ```

---

### Issue: Environment variables not working

**Symptoms**:
- `undefined` values in production
- Features work locally but not in deployed app

**Solutions**:

1. **Prefix with `VITE_`**:
   ```bash
   # ❌ Won't work
   API_URL=https://api.example.com
   
   # ✅ Correct
   VITE_API_URL=https://api.example.com
   ```

2. **Set in hosting platform** (Vercel/Netlify):
   - Add env vars in dashboard
   - Redeploy after adding

3. **Don't commit `.env` to Git**:
   ```bash
   # .gitignore should include:
   .env
   .env.local
   .env.production
   ```

---

## Debugging Tools

### 1. React DevTools

**Install**: [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)

**Usage**:
- **Components tab**: Inspect props, state, hooks
- **Profiler tab**: Identify slow renders
- **⚡ icon**: Open component source in IDE

---

### 2. TanStack Query DevTools

**Already included** in project

**Usage**:
- Click icon (bottom right) to open
- View all queries and their status
- Inspect cached data
- Manually trigger refetch/invalidate

---

### 3. Supabase Studio

**Access**: `https://<project-id>.supabase.co`

**Features**:
- SQL Editor: Run queries directly
- Table Editor: View/edit data
- Auth: Manage users
- Logs: View Edge Function logs
- Storage: Browse uploaded files

---

### 4. Browser DevTools

**Network Tab**:
- Filter by XHR to see API calls
- Check request/response headers
- View payload and response body
- Identify slow requests (waterfall view)

**Console Tab**:
- Log debugging info
- Execute JavaScript
- View errors and warnings

**Application Tab**:
- View localStorage/sessionStorage
- Check cookies
- Service worker status

---

## Common Error Messages

### "Cannot read property 'X' of undefined"

**Cause**: Accessing property on undefined/null object

**Fix**: Add optional chaining
```typescript
// ❌ Error if job is undefined
const type = job.type;

// ✅ Safe
const type = job?.type;
```

---

### "Hydration mismatch" (if using SSR in future)

**Cause**: Server-rendered HTML doesn't match client

**Fix**: Ensure consistent rendering
```typescript
// ❌ Random data on each render
<div>{Math.random()}</div>

// ✅ Consistent
const [random] = useState(Math.random());
<div>{random}</div>
```

---

### "Maximum update depth exceeded"

**Cause**: setState called in render causing infinite loop

**Fix**: Move setState to useEffect or event handler
```typescript
// ❌ Infinite loop
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Called every render!
}

// ✅ Fixed
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(count + 1);
  }, []); // Only on mount
}
```

---

## Getting Help

If you're still stuck:

1. **Search GitHub Issues**: Someone may have hit the same problem
2. **Check documentation**: README, ARCHITECTURE, CONTRIBUTING
3. **Ask in Discussions**: [GitHub Discussions](https://github.com/Krosebrook/fusion-stage-hub/discussions)
4. **Create an issue**: Include error message, steps to reproduce, environment

---

**Last Updated**: 2024-12-30  
**Version**: 1.0
