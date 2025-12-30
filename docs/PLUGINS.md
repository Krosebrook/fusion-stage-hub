# Plugin Development Guide

This guide explains how to create new platform integrations for FlashFusion.

## Overview

Plugins are the bridge between FlashFusion and external e-commerce platforms. Each plugin encapsulates platform-specific logic, API calls, and error handling.

---

## Plugin Architecture

```
┌─────────────────────────────────────────┐
│         FlashFusion Core                │
│    (Platform-agnostic business logic)   │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│         Plugin Interface                │
│    (Standard contract all plugins       │
│     must implement)                     │
└─────────────────────────────────────────┘
                ↓
┌──────────┬──────────┬──────────┬────────┐
│ Shopify  │   Etsy   │ Amazon   │  Your  │
│  Plugin  │  Plugin  │  Plugin  │ Plugin │
└──────────┴──────────┴──────────┴────────┘
```

---

## Plugin Interface

Every plugin must implement this interface:

```typescript
interface Plugin {
  // Metadata
  id: string;
  slug: string;
  name: string;
  version: string;
  description: string;
  
  // Capabilities
  capabilities: CapabilityMatrix;
  constraints?: ConstraintMap;
  
  // Lifecycle
  initialize(config: PluginConfig): Promise<void>;
  connect(credentials: Credentials): Promise<Connection>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  
  // Core Operations
  listProducts(params: ListParams): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(product: CreateProductInput): Promise<Product>;
  updateProduct(id: string, changes: UpdateProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Inventory
  getInventory(productId: string): Promise<Inventory>;
  updateInventory(productId: string, quantity: number): Promise<Inventory>;
  syncInventory(): Promise<SyncResult>;
  
  // Orders
  listOrders(params: ListOrderParams): Promise<Order[]>;
  getOrder(id: string): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  
  // Utility
  validateCredentials(credentials: Credentials): Promise<boolean>;
  getRateLimits(): RateLimit;
  getApiVersion(): string;
}
```

---

## Creating a New Plugin

### Step 1: Set Up Plugin Structure

```typescript
// plugins/my-platform/index.ts

import { Plugin, PluginConfig } from '@/types/plugin';

export class MyPlatformPlugin implements Plugin {
  id = 'my-platform';
  slug = 'my-platform';
  name = 'My Platform';
  version = '1.0.0';
  description = 'Integration with My Platform';
  
  private config?: PluginConfig;
  private client?: MyPlatformClient;
  
  // Implement required methods...
}
```

### Step 2: Define Capabilities

```typescript
capabilities: CapabilityMatrix = {
  list_products: {
    level: 'native',
    description: 'Full pagination and filtering support'
  },
  create_product: {
    level: 'native'
  },
  update_product: {
    level: 'native'
  },
  delete_product: {
    level: 'workaround',
    description: 'Requires archive then delete'
  },
  sync_inventory: {
    level: 'native',
    description: 'Real-time inventory updates'
  },
  process_orders: {
    level: 'native'
  },
  bulk_operations: {
    level: 'unsupported',
    description: 'No bulk API available'
  }
};

constraints = {
  'Rate Limit': '10 requests/second',
  'Max Batch Size': '100 items',
  'API Version': 'v2.0'
};
```

### Step 3: Implement Connection

```typescript
async initialize(config: PluginConfig): Promise<void> {
  this.config = config;
  // Initialize any resources
}

async connect(credentials: Credentials): Promise<Connection> {
  // Validate credentials
  const isValid = await this.validateCredentials(credentials);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  // Create API client
  this.client = new MyPlatformClient({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    storeUrl: credentials.storeUrl
  });
  
  // Test connection
  await this.healthCheck();
  
  return {
    status: 'connected',
    connectedAt: new Date()
  };
}

async disconnect(): Promise<void> {
  this.client = undefined;
  // Clean up resources
}

async healthCheck(): Promise<HealthStatus> {
  try {
    // Make a lightweight API call
    await this.client?.getStatus();
    return {
      healthy: true,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      healthy: false,
      lastCheck: new Date(),
      error: error.message
    };
  }
}
```

### Step 4: Implement Product Operations

```typescript
async listProducts(params: ListParams): Promise<Product[]> {
  if (!this.client) {
    throw new Error('Not connected');
  }
  
  try {
    const response = await this.client.products.list({
      limit: params.limit || 30,
      offset: params.offset || 0,
      filters: this.translateFilters(params.filters)
    });
    
    return response.products.map(p => this.transformProduct(p));
  } catch (error) {
    throw this.handleError(error);
  }
}

async createProduct(input: CreateProductInput): Promise<Product> {
  if (!this.client) {
    throw new Error('Not connected');
  }
  
  try {
    const platformProduct = this.transformToplatform(input);
    const response = await this.client.products.create(platformProduct);
    return this.transformProduct(response.product);
  } catch (error) {
    throw this.handleError(error);
  }
}

async updateProduct(id: string, changes: UpdateProductInput): Promise<Product> {
  if (!this.client) {
    throw new Error('Not connected');
  }
  
  try {
    const platformChanges = this.transformToplatform(changes);
    const response = await this.client.products.update(id, platformChanges);
    return this.transformProduct(response.product);
  } catch (error) {
    throw this.handleError(error);
  }
}

async deleteProduct(id: string): Promise<void> {
  if (!this.client) {
    throw new Error('Not connected');
  }
  
  try {
    // Handle workarounds if needed
    if (this.capabilities.delete_product.level === 'workaround') {
      // Example: Archive first, then delete
      await this.client.products.archive(id);
      await this.sleep(1000); // Wait for processing
      await this.client.products.delete(id);
    } else {
      await this.client.products.delete(id);
    }
  } catch (error) {
    throw this.handleError(error);
  }
}
```

### Step 5: Implement Data Transformation

```typescript
private transformProduct(platformProduct: PlatformProduct): Product {
  return {
    id: platformProduct.id,
    sku: platformProduct.sku,
    title: platformProduct.title,
    description: platformProduct.description,
    price: this.transformPrice(platformProduct.price),
    inventory: platformProduct.inventory_quantity,
    images: platformProduct.images.map(img => img.url),
    status: this.transformStatus(platformProduct.status),
    metadata: {
      platformId: platformProduct.id,
      platformUrl: platformProduct.admin_url
    }
  };
}

private transformToplatform(product: Partial<Product>): PlatformProductInput {
  return {
    title: product.title,
    description: product.description,
    price: product.price ? product.price * 100 : undefined, // Convert to cents
    inventory_quantity: product.inventory,
    images: product.images?.map(url => ({ src: url }))
  };
}

private transformPrice(platformPrice: PlatformPrice): number {
  // Convert from platform format to standard format
  return parseFloat(platformPrice.amount) / 100;
}

private transformStatus(platformStatus: string): ProductStatus {
  const statusMap: Record<string, ProductStatus> = {
    'active': 'active',
    'draft': 'draft',
    'archived': 'archived'
  };
  return statusMap[platformStatus] || 'draft';
}
```

### Step 6: Implement Error Handling

```typescript
private handleError(error: any): Error {
  // Platform-specific error handling
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    if (status === 401 || status === 403) {
      return new AuthenticationError('Invalid credentials or expired token');
    }
    
    if (status === 429) {
      return new RateLimitError('Rate limit exceeded');
    }
    
    if (status === 404) {
      return new NotFoundError(`Resource not found: ${message}`);
    }
    
    if (status >= 500) {
      return new PlatformError(`Platform error: ${message}`);
    }
  }
  
  return new Error(`Unexpected error: ${error.message}`);
}
```

### Step 7: Implement Rate Limiting

```typescript
private rateLimiter = new RateLimiter({
  requestsPerSecond: 10,
  burstSize: 20
});

async makeRequest<T>(request: () => Promise<T>): Promise<T> {
  await this.rateLimiter.acquire();
  
  try {
    return await request();
  } finally {
    this.rateLimiter.release();
  }
}

getRateLimits(): RateLimit {
  return {
    requestsPerSecond: 10,
    requestsPerDay: 10000,
    current: this.rateLimiter.getCurrentUsage()
  };
}
```

---

## Testing Your Plugin

### Unit Tests

```typescript
describe('MyPlatformPlugin', () => {
  let plugin: MyPlatformPlugin;
  
  beforeEach(() => {
    plugin = new MyPlatformPlugin();
  });
  
  describe('connect', () => {
    it('should connect with valid credentials', async () => {
      const connection = await plugin.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        storeUrl: 'https://test.myplatform.com'
      });
      
      expect(connection.status).toBe('connected');
    });
    
    it('should throw error with invalid credentials', async () => {
      await expect(
        plugin.connect({ apiKey: 'invalid' })
      ).rejects.toThrow('Invalid credentials');
    });
  });
  
  describe('listProducts', () => {
    it('should return products', async () => {
      // Mock API response
      const products = await plugin.listProducts({ limit: 10 });
      
      expect(products).toBeInstanceOf(Array);
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('title');
    });
  });
});
```

### Integration Tests

```typescript
describe('MyPlatformPlugin Integration', () => {
  it('should complete full product workflow', async () => {
    const plugin = new MyPlatformPlugin();
    
    // Connect
    await plugin.connect(testCredentials);
    
    // Create product
    const created = await plugin.createProduct({
      title: 'Test Product',
      price: 29.99,
      inventory: 100
    });
    
    // Update product
    const updated = await plugin.updateProduct(created.id, {
      price: 34.99
    });
    
    expect(updated.price).toBe(34.99);
    
    // Delete product
    await plugin.deleteProduct(created.id);
    
    // Verify deletion
    await expect(
      plugin.getProduct(created.id)
    ).rejects.toThrow(NotFoundError);
  });
});
```

---

## Plugin Registration

Register your plugin with FlashFusion:

```typescript
// plugins/registry.ts

import { MyPlatformPlugin } from './my-platform';

export const pluginRegistry = {
  'my-platform': MyPlatformPlugin,
  'shopify': ShopifyPlugin,
  'etsy': EtsyPlugin,
  // ... other plugins
};

export function getPlugin(slug: string): Plugin {
  const PluginClass = pluginRegistry[slug];
  if (!PluginClass) {
    throw new Error(`Plugin not found: ${slug}`);
  }
  return new PluginClass();
}
```

---

## Best Practices

### 1. Error Handling
- Always wrap API calls in try-catch
- Provide meaningful error messages
- Distinguish between retryable and non-retryable errors

### 2. Rate Limiting
- Respect platform rate limits
- Implement exponential backoff
- Use circuit breakers for failing APIs

### 3. Data Transformation
- Keep transformations simple and testable
- Document any assumptions
- Handle missing/null values gracefully

### 4. Testing
- Write unit tests for all public methods
- Mock external API calls
- Test error scenarios
- Verify data transformations

### 5. Documentation
- Document capability levels clearly
- Explain workarounds in detail
- Provide example usage
- Document rate limits and constraints

### 6. Versioning
- Follow semantic versioning
- Document breaking changes
- Provide migration guides

---

## Plugin Checklist

- [ ] Implement all required interface methods
- [ ] Define capabilities and constraints
- [ ] Add data transformation logic
- [ ] Implement error handling
- [ ] Add rate limiting
- [ ] Write unit tests (>80% coverage)
- [ ] Write integration tests
- [ ] Document capabilities
- [ ] Document workarounds
- [ ] Add to plugin registry
- [ ] Test with real API
- [ ] Create example configuration

---

## Example Plugins

See the following for reference implementations:

- **Shopify Plugin**: Full-featured with GraphQL
- **Etsy Plugin**: REST API with workarounds
- **Printify Plugin**: Batch operations
- **Amazon Plugin**: Feed-based operations

---

## Getting Help

- **Documentation**: Check `/docs`
- **Examples**: See `plugins/examples/`
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

Happy plugin development! 🔌
