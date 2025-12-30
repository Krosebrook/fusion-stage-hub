# Fusion Stage Hub - Agents & Modules Documentation

**Agent System Architecture & Module Specifications**

This document describes the agent-based architecture, autonomous modules, and their interactions within the Fusion Stage Hub ecosystem.

---

## Table of Contents
1. [Agent System Overview](#agent-system-overview)
2. [Core Agents](#core-agents)
3. [Platform Integration Agents](#platform-integration-agents)
4. [Background Processing Agents](#background-processing-agents)
5. [Decision Logic & Algorithms](#decision-logic--algorithms)
6. [Agent Communication](#agent-communication)
7. [Error Handling & Recovery](#error-handling--recovery)

---

## Agent System Overview

### What is an Agent?

In Fusion Stage Hub, an **agent** is an autonomous module responsible for a specific domain of functionality. Agents:
- Operate independently with well-defined responsibilities
- Communicate through standardized interfaces
- Make decisions based on configured policies
- Handle errors and edge cases gracefully
- Log all actions for audit and debugging

### Agent Architecture

```
┌─────────────────────────────────────────────────┐
│              Agent Orchestrator                  │
│  (Coordinates agent lifecycle and communication) │
└────────────────┬────────────────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
┌────▼────┐ ┌───▼────┐ ┌───▼────┐
│ Approval│ │  Job   │ │Platform│
│  Agent  │ │ Agent  │ │ Agent  │
└─────────┘ └────────┘ └────────┘
```

### Agent Lifecycle

```
Initialize → Configure → Activate → Monitor → Deactivate
                ↑                       ↓
                └───────── Restart ←────┘
```

---

## Core Agents

### 1. Approval Agent

**Purpose**: Manages approval workflows for critical operations

**Responsibilities**:
- Create approval requests from user actions
- Route approvals to appropriate reviewers
- Enforce approval policies and rules
- Track approval chain and decision history
- Trigger job creation upon approval
- Handle approval expiration

**Input**:
```typescript
interface ApprovalRequest {
  resourceType: 'listing' | 'product' | 'store';
  resourceId?: string;
  action: 'create' | 'update' | 'delete' | 'publish';
  payload: unknown;
  requestedBy: string;
  approvalPolicy?: ApprovalPolicy;
}
```

**Output**:
```typescript
interface ApprovalResult {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  comments?: string;
  nextAction?: JobRequest;
}
```

**Decision Logic**:
```typescript
class ApprovalAgent {
  async evaluate(request: ApprovalRequest): Promise<ApprovalDecision> {
    // 1. Load approval policy for resource type + action
    const policy = await this.loadPolicy(request);
    
    // 2. Check if auto-approval rules apply
    if (policy.autoApprove && this.meetsAutoApprovalCriteria(request, policy)) {
      return { decision: 'auto-approved', reason: 'Meets auto-approval criteria' };
    }
    
    // 3. Determine required approvers
    const approvers = await this.getRequiredApprovers(policy, request);
    
    // 4. Create approval request in pending queue
    const approval = await this.createApproval({
      ...request,
      requiredApprovers: approvers,
      expiresAt: new Date(Date.now() + policy.expirationHours * 3600000),
    });
    
    return { decision: 'pending', approvalId: approval.id };
  }
  
  async processApprovalDecision(
    approvalId: string,
    decision: 'approve' | 'reject',
    reviewerId: string,
    comments?: string
  ): Promise<void> {
    const approval = await this.getApproval(approvalId);
    
    // Update approval record
    await this.updateApproval(approvalId, {
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      comments,
    });
    
    // If approved, create job
    if (decision === 'approve') {
      await this.jobAgent.createJob({
        type: this.mapActionToJobType(approval.action),
        payload: approval.payload,
        userId: approval.requestedBy,
      });
    }
    
    // Notify requester
    await this.notificationAgent.notify({
      userId: approval.requestedBy,
      type: 'approval_decision',
      data: { approvalId, decision, comments },
    });
  }
}
```

**Error Handling**:
- Invalid approval policy → Reject with reason
- Reviewer not authorized → Reject with error
- Approval expired → Auto-reject and notify

---

### 2. Job Agent

**Purpose**: Manages background job queue and execution

**Responsibilities**:
- Create and schedule jobs
- Claim jobs for execution
- Execute job logic with retry mechanism
- Update job status in real-time
- Handle job failures and dead-letter queue
- Monitor job queue health

**Input**:
```typescript
interface JobRequest {
  type: JobType;
  payload: unknown;
  priority?: number;
  scheduledAt?: Date;
  maxAttempts?: number;
  userId: string;
}

type JobType = 
  | 'sync_inventory'
  | 'publish_listing'
  | 'update_product'
  | 'import_orders'
  | 'reconcile_stock'
  | 'webhook_process';
```

**Output**:
```typescript
interface JobResult {
  id: string;
  status: JobStatus;
  result?: unknown;
  error?: string;
  completedAt?: Date;
}
```

**Decision Logic**:
```typescript
class JobAgent {
  async claimAndExecute(): Promise<void> {
    // 1. Claim next available job
    const job = await this.claimNextJob();
    if (!job) return;
    
    try {
      // 2. Update status to running
      await this.updateJobStatus(job.id, 'running', { startedAt: new Date() });
      
      // 3. Execute job based on type
      const result = await this.executeJob(job);
      
      // 4. Mark as completed
      await this.updateJobStatus(job.id, 'completed', {
        result,
        completedAt: new Date(),
      });
      
      // 5. Trigger any dependent jobs
      await this.triggerDependentJobs(job, result);
      
    } catch (error) {
      // 6. Handle failure
      await this.handleJobFailure(job, error);
    }
  }
  
  async handleJobFailure(job: Job, error: Error): Promise<void> {
    const newAttempts = job.attempts + 1;
    
    if (newAttempts < job.maxAttempts) {
      // Retry with exponential backoff
      const delaySeconds = Math.pow(2, newAttempts) * 60; // 2, 4, 8 minutes...
      await this.updateJobStatus(job.id, 'pending', {
        attempts: newAttempts,
        scheduledAt: new Date(Date.now() + delaySeconds * 1000),
        error: error.message,
      });
    } else {
      // Move to dead-letter queue
      await this.updateJobStatus(job.id, 'failed', {
        attempts: newAttempts,
        error: error.message,
        completedAt: new Date(),
      });
      
      // Notify user of permanent failure
      await this.notificationAgent.notify({
        userId: job.userId,
        type: 'job_failed',
        data: { jobId: job.id, error: error.message },
      });
    }
  }
  
  private async executeJob(job: Job): Promise<unknown> {
    switch (job.type) {
      case 'sync_inventory':
        return await this.syncInventoryHandler(job);
      case 'publish_listing':
        return await this.publishListingHandler(job);
      case 'update_product':
        return await this.updateProductHandler(job);
      // ... other job types
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }
}
```

**Error Handling**:
- Job execution fails → Retry with exponential backoff
- Max retries exceeded → Move to dead-letter queue
- Invalid job type → Log error and mark as failed
- Worker crash → Job auto-released after timeout

---

### 3. Sync Agent

**Purpose**: Synchronizes data between Fusion Stage Hub and external platforms

**Responsibilities**:
- Poll platforms for updates
- Push local changes to platforms
- Reconcile data discrepancies
- Handle sync conflicts
- Maintain sync state and logs

**Input**:
```typescript
interface SyncRequest {
  storeId: string;
  syncType: 'full' | 'incremental' | 'inventory_only';
  direction: 'pull' | 'push' | 'bidirectional';
  filters?: SyncFilters;
}
```

**Output**:
```typescript
interface SyncResult {
  storeId: string;
  syncedAt: Date;
  statistics: {
    productsCreated: number;
    productsUpdated: number;
    productsFailed: number;
    ordersImported: number;
    inventoryUpdated: number;
  };
  errors: SyncError[];
}
```

**Decision Logic**:
```typescript
class SyncAgent {
  async synchronize(request: SyncRequest): Promise<SyncResult> {
    const store = await this.getStore(request.storeId);
    const plugin = this.pluginRegistry.get(store.platform);
    
    const stats = {
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      ordersImported: 0,
      inventoryUpdated: 0,
    };
    const errors: SyncError[] = [];
    
    try {
      // 1. Pull data from platform
      if (request.direction === 'pull' || request.direction === 'bidirectional') {
        const platformProducts = await plugin.listProducts({
          since: request.syncType === 'incremental' ? store.lastSyncedAt : undefined,
        });
        
        // 2. Reconcile with local database
        for (const platformProduct of platformProducts) {
          try {
            const existingProduct = await this.findProductByExternalId(
              store.id,
              platformProduct.id
            );
            
            if (existingProduct) {
              // Update existing
              await this.updateProduct(existingProduct.id, platformProduct);
              stats.productsUpdated++;
            } else {
              // Create new
              await this.createProduct(store.id, platformProduct);
              stats.productsCreated++;
            }
          } catch (error) {
            stats.productsFailed++;
            errors.push({ productId: platformProduct.id, error: error.message });
          }
        }
      }
      
      // 3. Push local changes to platform
      if (request.direction === 'push' || request.direction === 'bidirectional') {
        const localChanges = await this.getLocalChanges(
          store.id,
          store.lastSyncedAt
        );
        
        for (const change of localChanges) {
          try {
            await plugin.updateProduct(change.externalId, change.data);
          } catch (error) {
            errors.push({ productId: change.id, error: error.message });
          }
        }
      }
      
      // 4. Update last sync timestamp
      await this.updateStore(store.id, { lastSyncedAt: new Date() });
      
    } catch (error) {
      errors.push({ storeId: store.id, error: error.message });
    }
    
    return {
      storeId: store.id,
      syncedAt: new Date(),
      statistics: stats,
      errors,
    };
  }
  
  async resolveConflict(
    productId: string,
    localVersion: Product,
    remoteVersion: Product
  ): Promise<Product> {
    // Conflict resolution strategy: Most recent wins
    const localTimestamp = new Date(localVersion.updatedAt).getTime();
    const remoteTimestamp = new Date(remoteVersion.updatedAt).getTime();
    
    if (localTimestamp > remoteTimestamp) {
      // Keep local, push to remote
      await this.pushToRemote(productId, localVersion);
      return localVersion;
    } else {
      // Keep remote, update local
      await this.updateLocal(productId, remoteVersion);
      return remoteVersion;
    }
  }
}
```

**Error Handling**:
- Network failure → Retry with backoff
- Data conflict → Apply resolution strategy
- API rate limit → Queue and throttle
- Invalid data → Log error and skip

---

## Platform Integration Agents

Each platform has a dedicated agent that implements the standard plugin interface:

### 4. Shopify Agent

**Purpose**: Interface with Shopify GraphQL Admin API

**Capabilities**:
- ✅ Native: Full CRUD operations, bulk operations, webhooks
- ✅ Native: Inventory sync, order import
- ✅ Native: Multi-location support

**Constraints**:
- Query cost: 1000 points per request
- Calculated bucket throttling
- GraphQL complexity limits

**Implementation**:
```typescript
class ShopifyAgent implements PlatformPlugin {
  async listProducts(options?: ListOptions): Promise<Product[]> {
    const query = `
      query($first: Int!, $cursor: String) {
        products(first: $first, after: $cursor) {
          edges {
            node {
              id
              title
              description
              variants { edges { node { ... } } }
            }
          }
          pageInfo { hasNextPage, endCursor }
        }
      }
    `;
    
    // Paginate through all products
    let products: Product[] = [];
    let hasNextPage = true;
    let cursor = null;
    
    while (hasNextPage) {
      const result = await this.graphqlRequest(query, {
        first: 50,
        cursor,
      });
      
      products = products.concat(this.mapShopifyProducts(result));
      hasNextPage = result.data.products.pageInfo.hasNextPage;
      cursor = result.data.products.pageInfo.endCursor;
      
      // Check query cost and throttle if needed
      await this.checkThrottle(result.extensions.cost);
    }
    
    return products;
  }
  
  private async checkThrottle(cost: QueryCost): Promise<void> {
    const remaining = cost.throttleStatus.currentlyAvailable;
    const max = cost.throttleStatus.maximumAvailable;
    
    // If less than 20% remaining, wait for restore
    if (remaining < max * 0.2) {
      const waitMs = cost.throttleStatus.restoreRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}
```

---

### 5. Etsy Agent

**Purpose**: Interface with Etsy REST API v3

**Capabilities**:
- ✅ Native: Listing CRUD, order processing
- ⚠️ Workaround: Delete requires deactivation first
- ❌ Unsupported: Bulk operations

**Constraints**:
- Rate limit: 10 requests/second, 10,000 requests/day
- Daily burn tracked per-store

**Implementation**:
```typescript
class EtsyAgent implements PlatformPlugin {
  private rateLimiter = new RateLimiter({ qps: 10, qpd: 10000 });
  
  async createProduct(data: ProductInput): Promise<Product> {
    await this.rateLimiter.acquire();
    
    // Etsy requires specific fields
    const etsyListing = {
      quantity: data.inventory || 1,
      title: data.title,
      description: data.description,
      price: data.price,
      who_made: 'i_did',
      when_made: '2020_2024',
      taxonomy_id: await this.findTaxonomy(data.category),
      shipping_profile_id: await this.getShippingProfile(),
    };
    
    const response = await this.apiRequest('POST', '/listings', etsyListing);
    
    // Upload images separately
    if (data.images && data.images.length > 0) {
      await this.uploadImages(response.listing_id, data.images);
    }
    
    return this.mapEtsyListing(response);
  }
  
  async deleteProduct(id: string): Promise<void> {
    // Etsy workaround: Must deactivate before delete
    await this.updateProduct(id, { state: 'inactive' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.apiRequest('DELETE', `/listings/${id}`);
  }
}
```

---

### 6. Printify Agent

**Purpose**: Interface with Printify REST API

**Capabilities**:
- ✅ Native: Product CRUD, catalog sync
- ⚠️ Workaround: Inventory is polling-based, not real-time
- ⚠️ Workaround: Batch operations limited to 100 items

**Constraints**:
- Global: 600 RPM
- Catalog endpoints: 100 RPM
- Batch size: 100 items maximum

**Implementation**:
```typescript
class PrintifyAgent implements PlatformPlugin {
  private globalLimiter = new RateLimiter({ rpm: 600 });
  private catalogLimiter = new RateLimiter({ rpm: 100 });
  
  async syncInventory(productId: string): Promise<InventorySync> {
    await this.catalogLimiter.acquire();
    
    // Printify doesn't have real-time inventory webhooks
    // Must poll for updates
    const product = await this.apiRequest('GET', `/products/${productId}`);
    
    const variants = product.variants.map(v => ({
      sku: v.sku,
      inventory: v.is_available ? 999 : 0, // POD has "unlimited" inventory
      inStock: v.is_available,
    }));
    
    return {
      productId,
      variants,
      syncedAt: new Date(),
    };
  }
  
  async bulkUpdate(products: ProductUpdate[]): Promise<BulkResult> {
    // Batch into chunks of 100
    const chunks = this.chunk(products, 100);
    const results: BulkResult[] = [];
    
    for (const chunk of chunks) {
      await this.globalLimiter.acquire();
      const result = await this.apiRequest('POST', '/products/batch', chunk);
      results.push(result);
    }
    
    return this.aggregateResults(results);
  }
}
```

---

## Background Processing Agents

### 7. Webhook Agent

**Purpose**: Handle incoming webhooks from platforms

**Responsibilities**:
- Receive and validate webhook payloads
- Verify webhook signatures
- Parse platform-specific formats
- Queue jobs for webhook processing
- Handle duplicate webhooks

**Decision Logic**:
```typescript
class WebhookAgent {
  async handleIncoming(
    platform: string,
    event: string,
    payload: unknown,
    signature: string
  ): Promise<void> {
    // 1. Verify signature
    if (!await this.verifySignature(platform, payload, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    // 2. Check for duplicate (idempotency)
    const webhookId = this.extractWebhookId(platform, payload);
    if (await this.isDuplicate(webhookId)) {
      return; // Already processed
    }
    
    // 3. Parse webhook
    const parsedEvent = await this.parseWebhook(platform, event, payload);
    
    // 4. Create job to process webhook
    await this.jobAgent.createJob({
      type: 'webhook_process',
      payload: {
        platform,
        event,
        data: parsedEvent,
      },
      priority: this.getEventPriority(event),
    });
    
    // 5. Mark as received
    await this.markWebhookReceived(webhookId);
  }
  
  private getEventPriority(event: string): number {
    // Higher priority for time-sensitive events
    const priorityMap = {
      'order_created': 10,
      'inventory_updated': 8,
      'product_deleted': 5,
      'product_updated': 3,
    };
    return priorityMap[event] || 1;
  }
}
```

---

### 8. Notification Agent

**Purpose**: Send notifications to users

**Responsibilities**:
- Send in-app notifications
- Send email notifications
- Send push notifications (PWA)
- Manage notification preferences
- Batch and digest notifications

**Decision Logic**:
```typescript
class NotificationAgent {
  async notify(notification: Notification): Promise<void> {
    const user = await this.getUser(notification.userId);
    const prefs = await this.getNotificationPreferences(user.id);
    
    // Check if user wants this notification type
    if (!prefs.enabled[notification.type]) {
      return;
    }
    
    // Check quiet hours
    if (this.isInQuietHours(prefs.quietHours)) {
      await this.queueForLater(notification);
      return;
    }
    
    // Send via enabled channels
    const promises = [];
    
    if (prefs.channels.inApp) {
      promises.push(this.sendInApp(notification));
    }
    
    if (prefs.channels.email && this.shouldSendEmail(notification, prefs)) {
      promises.push(this.sendEmail(notification, user.email));
    }
    
    if (prefs.channels.push && user.pushSubscription) {
      promises.push(this.sendPush(notification, user.pushSubscription));
    }
    
    await Promise.all(promises);
  }
  
  private shouldSendEmail(
    notification: Notification,
    prefs: NotificationPreferences
  ): boolean {
    // Only send email for high-priority notifications
    if (notification.priority === 'high') return true;
    
    // Or if digest mode and it's digest time
    if (prefs.emailDigest && this.isDigestTime(prefs.digestSchedule)) {
      return true;
    }
    
    return false;
  }
}
```

---

## Decision Logic & Algorithms

### Rate Limiting Algorithm

```typescript
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private qps: number, // Queries per second
    private qpd?: number // Queries per day
  ) {
    this.tokens = qps;
    this.lastRefill = Date.now();
  }
  
  async acquire(): Promise<void> {
    await this.refillTokens();
    
    if (this.tokens < 1) {
      const waitMs = 1000 / this.qps;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      await this.acquire();
    } else {
      this.tokens--;
    }
  }
  
  private async refillTokens(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.qps;
    
    this.tokens = Math.min(this.tokens + tokensToAdd, this.qps);
    this.lastRefill = now;
  }
}
```

### Conflict Resolution Strategy

```typescript
enum ConflictStrategy {
  LOCAL_WINS,      // Always keep local changes
  REMOTE_WINS,     // Always keep remote changes
  NEWEST_WINS,     // Keep most recently updated
  MANUAL,          // Require manual resolution
}

class ConflictResolver {
  async resolve(
    conflict: DataConflict,
    strategy: ConflictStrategy
  ): Promise<Resolution> {
    switch (strategy) {
      case ConflictStrategy.NEWEST_WINS:
        return this.newestWins(conflict);
      case ConflictStrategy.LOCAL_WINS:
        return { keep: conflict.local, discard: conflict.remote };
      case ConflictStrategy.REMOTE_WINS:
        return { keep: conflict.remote, discard: conflict.local };
      case ConflictStrategy.MANUAL:
        return await this.queueForManualReview(conflict);
    }
  }
  
  private newestWins(conflict: DataConflict): Resolution {
    const localTime = new Date(conflict.local.updatedAt).getTime();
    const remoteTime = new Date(conflict.remote.updatedAt).getTime();
    
    if (localTime > remoteTime) {
      return { keep: conflict.local, discard: conflict.remote };
    } else {
      return { keep: conflict.remote, discard: conflict.local };
    }
  }
}
```

---

## Agent Communication

Agents communicate through:
1. **Direct method calls** (synchronous)
2. **Event bus** (asynchronous, pub/sub)
3. **Job queue** (asynchronous, durable)

### Event Bus Pattern

```typescript
class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  
  subscribe(event: string, handler: EventHandler): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(handler);
  }
  
  async publish(event: string, data: unknown): Promise<void> {
    const handlers = this.subscribers.get(event) || new Set();
    await Promise.all([...handlers].map(h => h(data)));
  }
}

// Usage
eventBus.subscribe('approval.approved', async (data) => {
  await jobAgent.createJob({ type: 'publish_listing', payload: data });
});

eventBus.publish('approval.approved', { approvalId: '123', payload: {...} });
```

---

## Error Handling & Recovery

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime?: number;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= 5) {
      this.state = 'open';
    }
  }
  
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const elapsed = Date.now() - this.lastFailureTime;
    return elapsed > 60000; // 1 minute
  }
}
```

---

## Conclusion

The agent-based architecture provides:
- **Modularity**: Each agent is independent and replaceable
- **Scalability**: Agents can run on separate workers/servers
- **Maintainability**: Clear responsibilities and boundaries
- **Reliability**: Sophisticated error handling and recovery
- **Observability**: All actions logged and traceable

---

**Document Version**: 1.0  
**Last Updated**: December 30, 2024  
**Related**: See ARCHITECTURE.md for system-level design
