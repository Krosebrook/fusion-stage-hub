# Claude AI Integration for Fusion Stage Hub

**AI-Powered Assistance & Automation with Anthropic Claude**

This document outlines the integration strategy, use cases, and implementation details for Anthropic's Claude AI within Fusion Stage Hub.

---

## Table of Contents
1. [Integration Overview](#integration-overview)
2. [Use Cases](#use-cases)
3. [Implementation Details](#implementation-details)
4. [Prompt Engineering](#prompt-engineering)
5. [API Configuration](#api-configuration)
6. [Cost Optimization](#cost-optimization)

---

## Integration Overview

### Purpose

Claude AI enhances Fusion Stage Hub with:
- **Product Description Generation**: Create SEO-optimized, platform-specific descriptions
- **Content Translation**: Translate listings for international markets
- **Smart Categorization**: Auto-categorize products based on attributes
- **Error Analysis**: Analyze platform API errors and suggest fixes
- **Policy Compliance**: Check listings against platform policies
- **Pricing Suggestions**: Recommend competitive pricing based on market data

### Claude Model Selection

| Model | Use Case | Context | Speed | Cost |
|-------|----------|---------|-------|------|
| **Claude 3.5 Sonnet** | Primary tasks | 200K tokens | Fast | Medium |
| **Claude 3 Opus** | Complex analysis | 200K tokens | Slower | High |
| **Claude 3 Haiku** | Simple tasks | 200K tokens | Very Fast | Low |

**Recommended**: Claude 3.5 Sonnet for most tasks (best balance of intelligence, speed, and cost)

---

## Use Cases

### 1. Product Description Generation

**Scenario**: Generate compelling product descriptions for multiple platforms

**Input**:
```typescript
interface DescriptionRequest {
  product: {
    title: string;
    features: string[];
    materials: string[];
    dimensions?: string;
    category: string;
  };
  platform: 'shopify' | 'etsy' | 'amazon';
  tone: 'professional' | 'casual' | 'luxury';
  targetAudience: string;
  seoKeywords: string[];
}
```

**Claude Prompt**:
```typescript
const prompt = `Generate a product description for ${platform} with the following details:

Product: ${product.title}
Category: ${product.category}
Features: ${product.features.join(', ')}
Materials: ${product.materials.join(', ')}
${product.dimensions ? `Dimensions: ${product.dimensions}` : ''}

Target Audience: ${targetAudience}
Tone: ${tone}
SEO Keywords: ${seoKeywords.join(', ')}

Requirements:
- Optimize for ${platform} search algorithm
- Include all SEO keywords naturally
- ${platform === 'etsy' ? 'Focus on handmade/artisan qualities' : ''}
- ${platform === 'amazon' ? 'Use bullet points for features' : ''}
- ${platform === 'shopify' ? 'Include storytelling elements' : ''}
- Keep within ${platform === 'etsy' ? '5000' : '2000'} characters
- Write in ${tone} tone for ${targetAudience}

Generate the description in the following format:
{
  "title": "Optimized product title",
  "description": "Main product description",
  "bulletPoints": ["Feature 1", "Feature 2", ...],
  "tags": ["tag1", "tag2", ...]
}`;
```

**Output**:
```json
{
  "title": "Handcrafted Leather Wallet - Minimalist Design",
  "description": "Discover timeless elegance...",
  "bulletPoints": [
    "Premium full-grain leather",
    "RFID blocking technology",
    "Compact design fits 8+ cards"
  ],
  "tags": ["leather wallet", "minimalist", "handmade"]
}
```

---

### 2. Content Translation

**Scenario**: Translate product listings for international markets

**Input**:
```typescript
interface TranslationRequest {
  content: {
    title: string;
    description: string;
    tags: string[];
  };
  sourceLang: string;
  targetLang: string;
  preserveFormatting: boolean;
  culturalAdaptation: boolean;
}
```

**Claude Prompt**:
```typescript
const prompt = `Translate the following product listing from ${sourceLang} to ${targetLang}:

Title: ${content.title}
Description: ${content.description}
Tags: ${content.tags.join(', ')}

Requirements:
- ${culturalAdaptation ? 'Adapt culturally for target market' : 'Direct translation'}
- ${preserveFormatting ? 'Preserve all HTML formatting' : 'Plain text output'}
- Maintain SEO effectiveness in target language
- Keep tone and brand voice consistent
- Ensure technical terms are accurate

Provide translation in JSON format:
{
  "title": "translated title",
  "description": "translated description",
  "tags": ["translated", "tags"]
}`;
```

---

### 3. Smart Product Categorization

**Scenario**: Automatically categorize products based on attributes

**Input**:
```typescript
interface CategorizationRequest {
  product: {
    title: string;
    description: string;
    attributes: Record<string, string>;
    images?: string[]; // URLs for vision model
  };
  platformCategories: Category[];
}
```

**Claude Prompt**:
```typescript
const prompt = `Analyze this product and suggest the best category:

Product Title: ${product.title}
Description: ${product.description}
Attributes: ${JSON.stringify(product.attributes)}

Available Categories:
${platformCategories.map(c => `- ${c.path}: ${c.description}`).join('\n')}

Provide your analysis in this format:
{
  "primaryCategory": "category_id",
  "secondaryCategories": ["cat_id_1", "cat_id_2"],
  "confidence": 0.95,
  "reasoning": "explanation of categorization"
}`;
```

---

### 4. Error Analysis & Troubleshooting

**Scenario**: Analyze platform API errors and suggest fixes

**Input**:
```typescript
interface ErrorAnalysisRequest {
  error: {
    code: string;
    message: string;
    platform: string;
    endpoint: string;
    requestPayload: unknown;
    response: unknown;
  };
  context: {
    previousAttempts: number;
    lastSuccessfulOperation?: Date;
  };
}
```

**Claude Prompt**:
```typescript
const prompt = `Analyze this API error from ${error.platform}:

Error Code: ${error.code}
Error Message: ${error.message}
Endpoint: ${error.endpoint}
Request Payload: ${JSON.stringify(error.requestPayload, null, 2)}
Response: ${JSON.stringify(error.response, null, 2)}

Context:
- Previous failed attempts: ${context.previousAttempts}
- Last successful operation: ${context.lastSuccessfulOperation || 'Never'}

Please provide:
1. Root cause analysis
2. Suggested fix
3. Prevention strategy
4. Whether this requires manual intervention

Format:
{
  "rootCause": "explanation",
  "suggestedFix": "step-by-step fix",
  "preventionStrategy": "how to prevent in future",
  "requiresManualIntervention": true/false,
  "estimatedRecoveryTime": "time estimate"
}`;
```

---

### 5. Policy Compliance Checking

**Scenario**: Check if product listings comply with platform policies

**Input**:
```typescript
interface ComplianceCheckRequest {
  listing: {
    title: string;
    description: string;
    images: string[];
    category: string;
    price: number;
  };
  platform: string;
  platformPolicies: string[]; // URLs or text of policies
}
```

**Claude Prompt**:
```typescript
const prompt = `Review this product listing for compliance with ${platform} policies:

Title: ${listing.title}
Description: ${listing.description}
Category: ${listing.category}
Price: $${listing.price}

Platform Policies:
${platformPolicies.join('\n\n')}

Check for:
- Prohibited items
- Misleading claims
- Trademark violations
- Inappropriate language
- Missing required information
- Price compliance

Provide compliance report:
{
  "compliant": true/false,
  "violations": [
    {
      "severity": "high/medium/low",
      "issue": "description",
      "recommendation": "how to fix"
    }
  ],
  "overallRisk": "high/medium/low",
  "requiredChanges": ["change 1", "change 2"]
}`;
```

---

### 6. Competitive Pricing Analysis

**Scenario**: Suggest optimal pricing based on market data

**Input**:
```typescript
interface PricingRequest {
  product: {
    title: string;
    category: string;
    features: string[];
    costBasis: number;
  };
  competitors: Array<{
    title: string;
    price: number;
    sales?: number;
    rating?: number;
  }>;
  strategy: 'premium' | 'competitive' | 'value';
}
```

**Claude Prompt**:
```typescript
const prompt = `Analyze pricing for this product:

Product: ${product.title}
Category: ${product.category}
Cost Basis: $${product.costBasis}
Features: ${product.features.join(', ')}

Competitor Pricing:
${competitors.map(c => `- ${c.title}: $${c.price} (${c.sales || 'N/A'} sales, ${c.rating || 'N/A'} rating)`).join('\n')}

Pricing Strategy: ${strategy}

Recommend:
1. Optimal price point
2. Price range (min-max)
3. Justification
4. Competitive positioning
5. Expected margin

Format:
{
  "recommendedPrice": 49.99,
  "priceRange": { "min": 39.99, "max": 59.99 },
  "justification": "reasoning",
  "margin": { "dollars": 25.00, "percentage": 50 },
  "positioning": "premium/mid-tier/value",
  "confidenceLevel": 0.85
}`;
```

---

## Implementation Details

### API Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';

class ClaudeService {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const {
      model = 'claude-3-5-sonnet-20241022',
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
    } = options;
    
    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ],
    });
    
    return response.content[0].text;
  }
  
  async generateProductDescription(
    request: DescriptionRequest
  ): Promise<ProductDescription> {
    const prompt = this.buildDescriptionPrompt(request);
    const systemPrompt = `You are an expert e-commerce copywriter specializing in ${request.platform}. 
    Create compelling, SEO-optimized product descriptions that drive conversions.`;
    
    const response = await this.generateCompletion(prompt, {
      systemPrompt,
      temperature: 0.8, // More creative
    });
    
    return JSON.parse(response);
  }
  
  async analyzeError(
    request: ErrorAnalysisRequest
  ): Promise<ErrorAnalysis> {
    const prompt = this.buildErrorAnalysisPrompt(request);
    const systemPrompt = `You are an expert API integration engineer. 
    Analyze errors, identify root causes, and provide actionable solutions.`;
    
    const response = await this.generateCompletion(prompt, {
      systemPrompt,
      temperature: 0.3, // More focused/analytical
    });
    
    return JSON.parse(response);
  }
}
```

### Caching Strategy

```typescript
class ClaudeCache {
  private cache = new Map<string, CachedResponse>();
  
  async getCached(
    prompt: string,
    ttl: number = 3600000 // 1 hour
  ): Promise<string | null> {
    const hash = this.hashPrompt(prompt);
    const cached = this.cache.get(hash);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.response;
    }
    
    return null;
  }
  
  async setCached(prompt: string, response: string): Promise<void> {
    const hash = this.hashPrompt(prompt);
    this.cache.set(hash, {
      response,
      timestamp: Date.now(),
    });
  }
  
  private hashPrompt(prompt: string): string {
    // Simple hash for demo - use proper hash in production
    return Buffer.from(prompt).toString('base64').slice(0, 32);
  }
}
```

---

## Prompt Engineering

### Best Practices

1. **Be Specific**: Clearly define the task and desired output format
2. **Provide Context**: Include all relevant information
3. **Use Examples**: Show Claude what good output looks like (few-shot learning)
4. **Structured Output**: Request JSON for easy parsing
5. **Set Constraints**: Define character limits, tone, style
6. **System Prompts**: Use system prompts to set Claude's role/expertise

### Prompt Template

```typescript
const PROMPT_TEMPLATE = `
ROLE: You are {role}

TASK: {task}

CONTEXT:
{context}

INPUT:
{input}

REQUIREMENTS:
{requirements}

OUTPUT FORMAT:
{outputFormat}

EXAMPLE:
{example}
`;
```

---

## API Configuration

### Environment Variables

```env
# Claude API Configuration
VITE_CLAUDE_API_KEY=sk-ant-api03-...
VITE_CLAUDE_MODEL=claude-3-5-sonnet-20241022
VITE_CLAUDE_MAX_TOKENS=4096
VITE_CLAUDE_TEMPERATURE=0.7

# Feature Flags
VITE_CLAUDE_DESCRIPTION_GENERATION=true
VITE_CLAUDE_TRANSLATION=true
VITE_CLAUDE_CATEGORIZATION=true
VITE_CLAUDE_ERROR_ANALYSIS=true
```

### Rate Limiting

```typescript
class ClaudeRateLimiter {
  private tokens = 50; // 50 requests per minute
  private lastRefill = Date.now();
  
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      await this.waitForRefill();
      await this.acquire();
    }
    
    this.tokens--;
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 60000) * 50;
    
    this.tokens = Math.min(this.tokens + tokensToAdd, 50);
    this.lastRefill = now;
  }
}
```

---

## Cost Optimization

### Strategies

1. **Model Selection**:
   - Use Haiku for simple tasks (10x cheaper)
   - Use Sonnet for standard tasks
   - Use Opus only for complex analysis

2. **Caching**:
   - Cache identical prompts for 1 hour
   - Cache product descriptions for 24 hours
   - Cache translations permanently

3. **Batching**:
   - Batch multiple products in single request
   - Process off-peak hours for non-urgent tasks

4. **Token Management**:
   - Minimize prompt size
   - Use system prompts (not counted towards input)
   - Set appropriate max_tokens

### Cost Estimates

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Opus | $15.00 | $75.00 |
| Claude 3 Haiku | $0.25 | $1.25 |

**Example**: Generating 1000 product descriptions with Sonnet
- Input: ~500K tokens ($1.50)
- Output: ~1M tokens ($15.00)
- **Total**: ~$16.50

---

## Integration Points in Fusion Stage Hub

### 1. Product Creation Flow
```
User creates product → Claude generates description → Review & edit → Save
```

### 2. Publishing Workflow
```
Stage product → Claude checks compliance → Pass/Fail → Publish or fix
```

### 3. Error Recovery
```
Job fails → Claude analyzes error → Auto-fix or alert user → Retry
```

### 4. Bulk Operations
```
Bulk import → Claude categorizes → Claude optimizes → Review → Publish
```

---

## Future Enhancements

- **Multi-modal**: Use Claude 3 Vision for image analysis and tagging
- **Fine-tuning**: Custom fine-tuned models for specific product categories
- **A/B Testing**: Test different AI-generated descriptions
- **Feedback Loop**: Learn from approved/rejected suggestions
- **Voice Commands**: Natural language interface for operations

---

**Document Version**: 1.0  
**Last Updated**: December 30, 2024  
**API Reference**: [Anthropic Claude API Docs](https://docs.anthropic.com/)
