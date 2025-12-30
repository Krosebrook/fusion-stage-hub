# Plugin System Documentation

## Overview

The Fusion Stage Hub plugin system is a **capability-based architecture** that provides a standardized interface for integrating with various e-commerce platforms. Each platform has different capabilities, constraints, and API patterns—the plugin system abstracts these differences while making limitations transparent.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Capability Levels](#capability-levels)
3. [Available Plugins](#available-plugins)
4. [Plugin Contracts](#plugin-contracts)
5. [Rate Limiting](#rate-limiting)
6. [Plugin Development](#plugin-development)
7. [Testing Plugins](#testing-plugins)

---

## Architecture

### Core Concepts

**Plugin**: A platform integration (e.g., Shopify, Etsy, Amazon)
**Capability**: A specific operation (e.g., `list_products`, `create_product`)
**Capability Level**: Implementation status (native, workaround, unsupported)
**Plugin Instance**: Per-store configuration of a plugin

### Database Schema

```sql
plugins
├── id: UUID
├── slug: TEXT (unique) -- "shopify", "etsy"
├── name: TEXT -- "Shopify", "Etsy"
├── version: TEXT -- "2.1.0"
└── is_active: BOOLEAN

plugin_contracts
├── plugin_id: UUID (FK → plugins)
├── capability: TEXT -- "list_products"
├── level: ENUM (native, workaround, unsupported)
├── constraints: JSONB -- {"rate_limit": 1000}
├── workaround_description: TEXT (optional)
└── automation_enabled: BOOLEAN

plugin_instances
├── store_id: UUID (FK → stores)
├── plugin_id: UUID (FK → plugins)
├── config: JSONB -- store-specific settings
└── is_enabled: BOOLEAN
```

### Plugin Lifecycle

```
1. Register Plugin → plugins table
2. Define Capabilities → plugin_contracts table
3. Connect Store → plugin_instances table
4. Execute Capability → Job queue → Plugin code
```

---

## Capability Levels

### Native
✅ **Fully supported** via official API

- Best performance
- Most reliable
- Complete feature set
- Automatic updates

**Example**: Shopify's GraphQL Admin API for product management

---

### Workaround
⚠️ **Achievable** through alternative methods

- May require multiple API calls
- Potentially slower or less reliable
- Limited feature set
- May have edge cases

**Example**: Etsy doesn't support bulk operations natively, but we can loop through items individually

**When to use workarounds:**
- Platform doesn't provide direct API
- API has limitations we can work around
- User needs the feature despite constraints

---

### Unsupported
❌ **Not available** on this platform

- No viable implementation path
- Platform API doesn't expose functionality
- Would violate platform ToS

**Example**: Printify doesn't allow deleting products via API (read-only)

**Handling unsupported capabilities:**
- Disable UI elements (greyed out buttons)
- Show informational tooltip
- Suggest manual workaround in documentation

---

## Available Plugins

### Shopify Plugin

**Slug**: `shopify`  
**Version**: `2.1.0`  
**API**: GraphQL Admin API  
**Auth**: OAuth 2.0

#### Capabilities

| Capability | Level | Notes |
|------------|-------|-------|
| `list_products` | Native | GraphQL query with pagination |
| `create_product` | Native | Full product creation |
| `update_product` | Native | Supports partial updates |
| `delete_product` | Native | Soft delete (archives) |
| `sync_inventory` | Native | Inventory levels API |
| `bulk_operations` | Native | GraphQL bulk operations for large datasets |
| `webhooks` | Native | Real-time order/inventory updates |

#### Constraints

```json
{
  "rate_limit": {
    "type": "cost_based",
    "max_cost": 1000,
    "restore_rate": 50,
    "per_second": true
  },
  "batch_size": 250,
  "max_variants_per_product": 100
}
```

#### Authentication Flow

1. User clicks "Connect Shopify"
2. Redirect to Shopify OAuth consent page
3. User approves scopes: `read_products`, `write_products`, `read_inventory`, `write_inventory`
4. Shopify redirects back with authorization code
5. Exchange code for access token
6. Encrypt and store token in `stores.credentials_encrypted`

---

### Etsy Plugin

**Slug**: `etsy`  
**Version**: `1.8.0`  
**API**: REST API v3  
**Auth**: OAuth 2.0

#### Capabilities

| Capability | Level | Notes |
|------------|-------|-------|
| `list_products` | Native | `/shops/:shop_id/listings` |
| `create_product` | Native | Listings creation |
| `update_product` | Native | Update listing details |
| `delete_product` | Native | Deactivate listing |
| `sync_inventory` | Native | Inventory management |
| `bulk_operations` | Workaround | Loop through items (no native bulk API) |
| `webhooks` | Unsupported | No webhook support (polling required) |

#### Constraints

```json
{
  "rate_limit": {
    "type": "requests_per_second",
    "requests": 10,
    "window": 1
  },
  "batch_size": 1,
  "max_images_per_listing": 10,
  "polling_interval": 300
}
```

#### Workarounds

**Bulk Operations**: Since Etsy doesn't support bulk operations natively, we:
1. Queue individual jobs for each item
2. Execute with rate limiting (10 req/s)
3. Report progress incrementally
4. Aggregate results at the end

---

### Amazon Seller Central Plugin (Planned)

**Slug**: `amazon-sc`  
**Version**: `1.0.0-beta`  
**API**: SP-API (Selling Partner API)  
**Auth**: OAuth 2.0 + IAM Credentials

#### Capabilities

| Capability | Level | Notes |
|------------|-------|-------|
| `list_products` | Native | Product catalog API |
| `create_product` | Workaround | Requires feed submission + polling |
| `update_product` | Workaround | Feed-based updates |
| `delete_product` | Unsupported | Amazon doesn't allow deletion via API |
| `sync_inventory` | Native | FBA/FBM inventory sync |
| `bulk_operations` | Native | Feed API supports bulk |
| `webhooks` | Native | Amazon EventBridge notifications |

#### Constraints

```json
{
  "rate_limit": {
    "type": "dynamic",
    "varies_by_endpoint": true
  },
  "batch_size": 10000,
  "feed_processing_time": "5-30 minutes",
  "requires_amazon_approval": true
}
```

#### Feed-Based Operations

Amazon uses an **asynchronous feed submission model**:

1. Submit XML/JSON feed with product data
2. Poll feed submission status
3. Wait for processing (can take 5-30 minutes)
4. Download processing report
5. Parse report for success/errors

This makes operations "workaround" level because they're not real-time.

---

### Printify Plugin

**Slug**: `printify`  
**Version**: `1.5.0`  
**API**: REST API  
**Auth**: API Key

#### Capabilities

| Capability | Level | Notes |
|------------|-------|-------|
| `list_products` | Native | Product catalog |
| `create_product` | Workaround | Limited templates |
| `update_product` | Workaround | Some fields read-only |
| `delete_product` | Unsupported | No deletion allowed |
| `sync_inventory` | Native | POD inventory always available |
| `webhooks` | Native | Order status webhooks |

#### Constraints

```json
{
  "rate_limit": {
    "type": "requests_per_second",
    "requests": 5,
    "window": 1
  },
  "batch_size": 1,
  "product_creation_limited_to_templates": true
}
```

---

### Gumroad Plugin

**Slug**: `gumroad`  
**Version**: `1.3.0`  
**API**: REST API  
**Auth**: API Key

#### Capabilities

| Capability | Level | Notes |
|------------|-------|-------|
| `list_products` | Native | Digital products only |
| `create_product` | Native | Full product creation |
| `update_product` | Native | Update pricing, description |
| `delete_product` | Native | Archive product |
| `sync_inventory` | Unsupported | Digital products (infinite inventory) |
| `webhooks` | Native | Sale and refund webhooks |

#### Constraints

```json
{
  "rate_limit": {
    "type": "requests_per_minute",
    "requests": 60,
    "window": 60
  },
  "batch_size": 1,
  "product_types": ["digital_only"]
}
```

---

## Plugin Contracts

### Standard Capabilities

All plugins implement a subset of these standard capabilities:

#### Product Management
- `list_products`: Retrieve product catalog
- `get_product`: Fetch single product details
- `create_product`: Create new product
- `update_product`: Update existing product
- `delete_product`: Remove or archive product
- `bulk_update`: Update multiple products

#### Inventory
- `sync_inventory`: Push inventory levels to platform
- `get_inventory`: Fetch current inventory
- `update_variant_inventory`: Update SKU-level inventory

#### Orders
- `list_orders`: Retrieve orders
- `get_order`: Fetch single order
- `update_order_status`: Mark as shipped, cancelled, etc.
- `process_refund`: Issue refund

#### Platform-Specific
- `webhooks`: Real-time event notifications
- `bulk_operations`: Platform-optimized bulk processing

### Capability Interface (TypeScript)

```typescript
interface PluginCapability {
  slug: string; // "list_products"
  level: "native" | "workaround" | "unsupported";
  
  // Execution function
  execute: (params: CapabilityParams) => Promise<CapabilityResult>;
  
  // Validation
  validate?: (params: CapabilityParams) => ValidationResult;
  
  // Constraints
  constraints: {
    rateLimit?: RateLimit;
    batchSize?: number;
    maxRetries?: number;
  };
  
  // Workaround details (if applicable)
  workaround?: {
    description: string;
    steps: string[];
    estimatedTime: number; // milliseconds
  };
}
```

---

## Rate Limiting

### Token Bucket Algorithm

Each plugin instance maintains a token bucket:

```typescript
interface TokenBucket {
  tokens: number;        // Current available tokens
  capacity: number;      // Max tokens
  refillRate: number;    // Tokens per second
  lastRefill: Date;      // Last refill timestamp
}
```

**Before each API call:**
1. Refill tokens based on elapsed time
2. Check if sufficient tokens available
3. If yes: Consume tokens and proceed
4. If no: Queue job with delay

**Example (Shopify cost-based):**
```typescript
// Shopify query costs 50 points
const cost = 50;
const bucket = await getTokenBucket(storeId);

if (bucket.tokens >= cost) {
  bucket.tokens -= cost;
  await updateTokenBucket(storeId, bucket);
  return executeQuery();
} else {
  const delay = calculateRefillTime(bucket, cost);
  await scheduleJob(jobId, delay);
  throw new RateLimitError(`Retry after ${delay}ms`);
}
```

---

## Plugin Development

### Creating a New Plugin

1. **Register Plugin**
```sql
INSERT INTO plugins (slug, name, version, is_active)
VALUES ('woocommerce', 'WooCommerce', '1.0.0', true);
```

2. **Define Capabilities**
```sql
INSERT INTO plugin_contracts (plugin_id, capability, level, constraints)
VALUES
  (:plugin_id, 'list_products', 'native', '{"rate_limit": 100}'),
  (:plugin_id, 'create_product', 'native', '{}'),
  (:plugin_id, 'webhooks', 'unsupported', '{}');
```

3. **Implement Plugin Class** (Edge Function)
```typescript
export class WooCommercePlugin implements Plugin {
  async list_products(config: StoreConfig): Promise<Product[]> {
    const client = new WooCommerceClient(config.credentials);
    const products = await client.get('/products');
    return products.map(transformProduct);
  }
  
  async create_product(config: StoreConfig, product: Product): Promise<string> {
    const client = new WooCommerceClient(config.credentials);
    const result = await client.post('/products', transformProduct(product));
    return result.id;
  }
}
```

4. **Add Rate Limiting**
```typescript
async execute(capability: string, params: unknown) {
  await enforceRateLimit(this.storeId, this.slug);
  return this[capability](params);
}
```

5. **Register in Plugin Registry**
```typescript
// functions/plugins/index.ts
export const plugins = {
  shopify: new ShopifyPlugin(),
  etsy: new EtsyPlugin(),
  woocommerce: new WooCommercePlugin(),
};
```

---

## Testing Plugins

### Unit Tests

```typescript
import { WooCommercePlugin } from "./woocommerce";

describe("WooCommercePlugin", () => {
  const plugin = new WooCommercePlugin();
  const mockConfig = {
    storeId: "test-store",
    credentials: { apiKey: "test-key", apiSecret: "test-secret" },
  };

  it("should list products", async () => {
    const products = await plugin.list_products(mockConfig);
    expect(products).toHaveLength(10);
    expect(products[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
    });
  });

  it("should handle rate limit errors", async () => {
    // Mock rate limit exceeded
    await expect(plugin.create_product(mockConfig, product))
      .rejects.toThrow(RateLimitError);
  });
});
```

### Integration Tests

```typescript
describe("Shopify Integration", () => {
  it("should authenticate and list products", async () => {
    // Real API call to Shopify test store
    const store = await connectShopifyStore(testCredentials);
    const products = await syncProducts(store.id);
    
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].platform).toBe("shopify");
  });
});
```

### Manual Testing

1. Connect test store
2. Trigger sync operation
3. Verify data appears correctly
4. Test edge cases (rate limits, invalid data)
5. Monitor job logs

---

## Best Practices

### Error Handling

- **Retry transient failures** (network timeouts)
- **Log detailed errors** for debugging
- **Categorize errors**: Rate limit, auth, validation, unknown
- **User-friendly messages** in UI

### Security

- **Never log credentials** or API keys
- **Encrypt at rest** (Supabase Vault)
- **Use least privilege** OAuth scopes
- **Rotate keys** on compromise

### Performance

- **Batch operations** where possible
- **Cache platform data** (with TTL)
- **Paginate large results**
- **Compress payloads** for large syncs

### Observability

- **Log all API calls** with timing
- **Track success/failure rates** per capability
- **Alert on high error rates**
- **Monitor rate limit consumption**

---

## FAQ

**Q: Can I use multiple plugins for one store?**  
A: No, each store connects to one platform. But you can connect multiple stores (e.g., Shopify + Etsy).

**Q: What happens if a capability is unsupported?**  
A: UI disables the feature with a tooltip explaining the limitation.

**Q: Can I add custom capabilities?**  
A: Not yet. Plugin capabilities are standardized. Custom logic should go in workflows.

**Q: How do I test rate limiting?**  
A: Use the Supabase function `simulate_rate_limit(store_id)` to temporarily reduce limits.

---

**For more information, see:**
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system design
- [docs/jobs.md](./jobs.md) - Job queue integration
- [docs/stores.md](./stores.md) - Store connection flow
