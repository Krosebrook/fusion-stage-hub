# Google Gemini Integration for Fusion Stage Hub

**AI-Powered Visual Intelligence & Multi-Modal Processing with Google Gemini**

This document outlines the integration strategy, use cases, and implementation details for Google's Gemini AI within Fusion Stage Hub.

---

## Table of Contents
1. [Integration Overview](#integration-overview)
2. [Use Cases](#use-cases)
3. [Implementation Details](#implementation-details)
4. [Multi-Modal Capabilities](#multi-modal-capabilities)
5. [API Configuration](#api-configuration)
6. [Cost Optimization](#cost-optimization)

---

## Integration Overview

### Purpose

Gemini AI enhances Fusion Stage Hub with:
- **Visual Product Analysis**: Analyze product images for quality, composition, and appeal
- **Automated Image Tagging**: Generate accurate tags from product photos
- **Quality Control**: Detect image defects, poor lighting, or composition issues
- **Multi-Modal Search**: Search products using text + images
- **Video Content Analysis**: Extract insights from product demo videos
- **Competitive Analysis**: Analyze competitor product images and descriptions

### Gemini Model Selection

| Model | Use Case | Context | Modalities | Cost |
|-------|----------|---------|------------|------|
| **Gemini 1.5 Pro** | Complex multi-modal | 1M tokens | Text, Image, Video, Audio | High |
| **Gemini 1.5 Flash** | Fast processing | 1M tokens | Text, Image, Video, Audio | Medium |
| **Gemini 1.0 Pro Vision** | Image analysis | 32K tokens | Text, Image | Medium |

**Recommended**: Gemini 1.5 Flash for most tasks (best balance of capability and cost)

---

## Use Cases

### 1. Product Image Analysis

**Scenario**: Analyze product images for quality and optimization suggestions

**Input**:
```typescript
interface ImageAnalysisRequest {
  images: string[]; // URLs or base64
  productCategory: string;
  platform: string;
  analysisType: 'quality' | 'composition' | 'compliance' | 'comprehensive';
}
```

**Gemini Prompt**:
```typescript
const prompt = `Analyze these product images for ${platform}:

Product Category: ${productCategory}
Analysis Type: ${analysisType}

For each image, provide:
1. Quality Score (0-100)
2. Issues detected (lighting, blur, resolution, etc.)
3. Composition feedback (framing, background, focus)
4. Platform-specific compliance (${platform} requirements)
5. Improvement suggestions

Format as JSON:
{
  "images": [
    {
      "index": 0,
      "qualityScore": 85,
      "issues": ["Background slightly cluttered"],
      "composition": {
        "score": 90,
        "feedback": "Good product placement, consider closer crop"
      },
      "compliance": {
        "meetsRequirements": true,
        "platformSpecific": "Meets ${platform} image guidelines"
      },
      "suggestions": [
        "Remove background clutter",
        "Add white background version for main image"
      ]
    }
  ],
  "overallScore": 87,
  "bestImageIndex": 0,
  "missingAngles": ["back view", "detail shot"]
}`;
```

**Output**:
```json
{
  "images": [
    {
      "index": 0,
      "qualityScore": 85,
      "issues": ["Background slightly cluttered"],
      "composition": {
        "score": 90,
        "feedback": "Good product placement"
      },
      "compliance": {
        "meetsRequirements": true
      },
      "suggestions": ["Remove background clutter"]
    }
  ],
  "overallScore": 87,
  "bestImageIndex": 0,
  "missingAngles": ["back view"]
}
```

---

### 2. Automated Image Tagging

**Scenario**: Generate accurate, relevant tags from product images

**Input**:
```typescript
interface ImageTaggingRequest {
  image: string;
  existingTags?: string[];
  maxTags: number;
  tagTypes: ('color' | 'style' | 'material' | 'feature' | 'use-case')[];
}
```

**Gemini Prompt**:
```typescript
const prompt = `Analyze this product image and generate ${maxTags} relevant tags.

${existingTags ? `Existing tags: ${existingTags.join(', ')}` : ''}

Tag categories to include: ${tagTypes.join(', ')}

Requirements:
- Generate specific, searchable tags
- Include color variations
- Identify materials and textures
- Describe style and aesthetic
- Note key features visible in image
- Suggest use cases

Format:
{
  "tags": {
    "colors": ["navy blue", "white trim"],
    "style": ["minimalist", "modern"],
    "materials": ["leather", "cotton"],
    "features": ["zippered", "compact"],
    "useCases": ["everyday carry", "travel"]
  },
  "primaryColors": ["#1a2f4f", "#ffffff"],
  "confidence": 0.92
}`;
```

---

### 3. Product Similarity & Recommendation

**Scenario**: Find similar products based on visual appearance

**Input**:
```typescript
interface SimilarityRequest {
  referenceImage: string;
  candidateImages: string[];
  criteria: ('visual' | 'color' | 'style' | 'category')[];
}
```

**Gemini Prompt**:
```typescript
const prompt = `Compare these products to the reference image:

Reference Image: [Provided]
Candidate Images: ${candidateImages.length} images

Comparison Criteria: ${criteria.join(', ')}

For each candidate, rate similarity (0-100) based on:
- Visual appearance
- Color palette
- Style/aesthetic
- Category match

Provide:
{
  "matches": [
    {
      "candidateIndex": 0,
      "overallSimilarity": 85,
      "visualSimilarity": 90,
      "colorSimilarity": 80,
      "styleSimilarity": 85,
      "reasoning": "Similar design language, matching color scheme",
      "differences": ["Slightly larger size", "Different material texture"]
    }
  ],
  "topMatches": [0, 3, 7],
  "recommendations": "Best matches for cross-selling"
}`;
```

---

### 4. Video Content Analysis

**Scenario**: Extract insights from product demonstration videos

**Input**:
```typescript
interface VideoAnalysisRequest {
  videoUrl: string;
  analysisGoals: ('features' | 'usage' | 'quality' | 'transcript')[];
  timestamps?: number[]; // Specific timestamps to analyze
}
```

**Gemini Prompt**:
```typescript
const prompt = `Analyze this product demonstration video:

Video URL: ${videoUrl}
Analysis Goals: ${analysisGoals.join(', ')}
${timestamps ? `Focus on timestamps: ${timestamps.join(', ')}` : ''}

Extract:
1. Product features demonstrated
2. Usage instructions shown
3. Key selling points highlighted
4. Quality indicators
5. Potential issues or concerns
6. Transcript of spoken content

Format:
{
  "features": [
    {
      "feature": "Water-resistant coating",
      "timestamp": "0:45",
      "demonstrationQuality": "clear"
    }
  ],
  "usageInstructions": [
    {
      "step": "Open zipper fully before use",
      "timestamp": "1:20"
    }
  ],
  "keyMoments": [
    {
      "timestamp": "2:15",
      "description": "Shows product durability test",
      "importance": "high"
    }
  ],
  "transcript": "Full video transcript...",
  "overallQuality": "professional",
  "suggestedImprovements": ["Add close-up of material texture"]
}`;
```

---

### 5. Competitive Visual Analysis

**Scenario**: Analyze competitor product presentations

**Input**:
```typescript
interface CompetitiveAnalysisRequest {
  ourProduct: {
    images: string[];
    title: string;
    price: number;
  };
  competitors: Array<{
    images: string[];
    title: string;
    price: number;
    platform: string;
  }>;
  analysisAspects: ('photography' | 'styling' | 'presentation' | 'pricing')[];
}
```

**Gemini Prompt**:
```typescript
const prompt = `Compare our product presentation to competitors:

Our Product:
- Title: ${ourProduct.title}
- Price: $${ourProduct.price}
- Images: ${ourProduct.images.length} provided

Competitors: ${competitors.length} products
${competitors.map((c, i) => `
Competitor ${i + 1}:
- Title: ${c.title}
- Price: $${c.price}
- Platform: ${c.platform}
`).join('\n')}

Analysis Aspects: ${analysisAspects.join(', ')}

Evaluate:
1. Photography quality comparison
2. Styling and presentation differences
3. Image count and variety
4. Background and lighting choices
5. Value perception at price point
6. Competitive advantages/disadvantages

Provide strategic recommendations for improvement.

Format:
{
  "ourRanking": "2nd of ${competitors.length + 1}",
  "strengths": ["Better lighting", "More angles"],
  "weaknesses": ["Background less professional"],
  "competitorsBestPractices": [
    {
      "competitor": 0,
      "practice": "Uses lifestyle shots effectively",
      "recommendation": "Add lifestyle context to our images"
    }
  ],
  "actionableInsights": [
    "Invest in white background shots for main image",
    "Add detail shots of material texture",
    "Include size comparison image"
  ],
  "estimatedImpact": "20-30% increase in conversion"
}`;
```

---

### 6. Image Quality Control

**Scenario**: Automated quality control before publishing

**Input**:
```typescript
interface QualityControlRequest {
  images: string[];
  platform: string;
  requirements: {
    minResolution: { width: number; height: number };
    maxFileSize: number;
    allowedFormats: string[];
    backgroundType: 'white' | 'transparent' | 'lifestyle' | 'any';
  };
}
```

**Gemini Prompt**:
```typescript
const prompt = `Perform quality control check on these images for ${platform}:

Platform Requirements:
- Min Resolution: ${requirements.minResolution.width}x${requirements.minResolution.height}
- Max File Size: ${requirements.maxFileSize}MB
- Allowed Formats: ${requirements.allowedFormats.join(', ')}
- Background Type: ${requirements.backgroundType}

Check each image for:
1. Technical requirements compliance
2. Visual quality issues (blur, distortion, artifacts)
3. Composition problems
4. Background appropriateness
5. Text overlays or watermarks (usually prohibited)
6. Product visibility and clarity

Format:
{
  "overallPass": true/false,
  "images": [
    {
      "index": 0,
      "passed": false,
      "technicalIssues": ["Resolution below minimum"],
      "visualIssues": ["Slight blur in corners"],
      "complianceIssues": ["Watermark detected"],
      "severity": "high/medium/low",
      "blockers": true/false
    }
  ],
  "readyToPublish": false,
  "mustFix": ["Remove watermark", "Increase resolution"],
  "recommended": ["Improve lighting", "Crop tighter"]
}`;
```

---

## Implementation Details

### API Integration

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async analyzeImage(
    imageParts: Array<{ inlineData: { data: string; mimeType: string } }>,
    prompt: string,
    modelName: string = 'gemini-1.5-flash'
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent([
      ...imageParts,
      { text: prompt }
    ]);
    
    return result.response.text();
  }
  
  async analyzeProductImages(
    request: ImageAnalysisRequest
  ): Promise<ImageAnalysisResult> {
    // Convert images to Gemini format
    const imageParts = await Promise.all(
      request.images.map(async (imageUrl) => ({
        inlineData: {
          data: await this.fetchImageAsBase64(imageUrl),
          mimeType: 'image/jpeg'
        }
      }))
    );
    
    const prompt = this.buildImageAnalysisPrompt(request);
    const response = await this.analyzeImage(imageParts, prompt);
    
    return JSON.parse(response);
  }
  
  async generateImageTags(
    imageUrl: string,
    request: ImageTaggingRequest
  ): Promise<ImageTags> {
    const imageData = await this.fetchImageAsBase64(imageUrl);
    const imageParts = [{
      inlineData: { data: imageData, mimeType: 'image/jpeg' }
    }];
    
    const prompt = this.buildTaggingPrompt(request);
    const response = await this.analyzeImage(imageParts, prompt);
    
    return JSON.parse(response);
  }
  
  async analyzeVideo(
    videoUrl: string,
    request: VideoAnalysisRequest
  ): Promise<VideoAnalysis> {
    // Gemini 1.5 Pro supports video analysis
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro' 
    });
    
    const videoData = await this.fetchVideoAsBase64(videoUrl);
    const videoPart = {
      inlineData: {
        data: videoData,
        mimeType: 'video/mp4'
      }
    };
    
    const prompt = this.buildVideoAnalysisPrompt(request);
    const result = await model.generateContent([videoPart, { text: prompt }]);
    
    return JSON.parse(result.response.text());
  }
  
  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
```

### Batch Processing

```typescript
class GeminiBatchProcessor {
  async processMultipleProducts(
    products: Array<{ id: string; images: string[] }>,
    batchSize: number = 5
  ): Promise<Map<string, ImageAnalysisResult>> {
    const results = new Map();
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (product) => {
        try {
          const analysis = await this.geminiService.analyzeProductImages({
            images: product.images,
            productCategory: product.category,
            platform: 'shopify',
            analysisType: 'comprehensive'
          });
          
          return { id: product.id, analysis };
        } catch (error) {
          console.error(`Failed to analyze product ${product.id}:`, error);
          return { id: product.id, analysis: null };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ id, analysis }) => {
        if (analysis) results.set(id, analysis);
      });
      
      // Wait between batches to respect rate limits
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
```

---

## Multi-Modal Capabilities

### Text + Image Analysis

```typescript
const multiModalPrompt = `Analyze this product:

Text Description:
${productDescription}

Images: [Provided]

Cross-reference the text and images:
1. Does the description match what's shown?
2. Are there features in images not mentioned in text?
3. Are there features mentioned in text not shown in images?
4. Consistency check (colors, dimensions, materials)
5. Suggestions for alignment

Format:
{
  "consistency": "high/medium/low",
  "discrepancies": [
    {
      "type": "color",
      "text": "navy blue",
      "image": "appears more black",
      "recommendation": "Update description or retake photo"
    }
  ],
  "missingInText": ["zippered pocket visible in image"],
  "missingInImages": ["water-resistant coating mentioned"],
  "suggestions": ["Add detail shot of zipper", "Update color description"]
}`;
```

### Video + Image Comparison

```typescript
const videoImagePrompt = `Compare this product across video and images:

Video: [Product demonstration]
Images: [Product photos]

Analyze:
1. Are all features shown in video also in images?
2. Does video show product in use (lacking in static images)?
3. Quality consistency between formats
4. Which medium better showcases which features?

Recommend:
- Video frames to extract as images
- Additional angles needed in photos
- Features to highlight more in video
- Optimal media mix for listing`;
```

---

## API Configuration

### Environment Variables

```env
# Gemini API Configuration
VITE_GEMINI_API_KEY=AIzaSy...
VITE_GEMINI_MODEL=gemini-1.5-flash
VITE_GEMINI_VISION_MODEL=gemini-1.5-pro

# Feature Flags
VITE_GEMINI_IMAGE_ANALYSIS=true
VITE_GEMINI_VIDEO_ANALYSIS=true
VITE_GEMINI_AUTO_TAGGING=true
VITE_GEMINI_QUALITY_CONTROL=true

# Rate Limiting
VITE_GEMINI_RPM=60
VITE_GEMINI_BATCH_SIZE=5
```

### Safety Settings

```typescript
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  safetySettings 
});
```

---

## Cost Optimization

### Pricing (as of Dec 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Images (per 1K) |
|-------|----------------------|------------------------|-----------------|
| Gemini 1.5 Pro | $3.50 | $10.50 | $0.002 |
| Gemini 1.5 Flash | $0.075 | $0.30 | $0.0002 |
| Gemini 1.0 Pro Vision | $0.25 | $0.50 | $0.0025 |

### Optimization Strategies

1. **Model Selection**:
   - Use Flash for routine image analysis (50x cheaper)
   - Use Pro only for complex multi-modal tasks
   - Use Pro Vision for image-only tasks

2. **Image Optimization**:
   - Resize images to optimal resolution (not larger than needed)
   - Compress before sending (JPEG quality 85)
   - Batch multiple images in single request

3. **Caching**:
   - Cache image analysis results for 7 days
   - Cache tags permanently
   - Invalidate cache only when images change

4. **Smart Processing**:
   - Only analyze new/changed images
   - Skip analysis if product unchanged
   - Process in off-peak hours for non-urgent tasks

### Cost Example

**Analyzing 1000 product images with Flash**:
- Images: 1000 × $0.0002 = $0.20
- Input tokens: ~50K × $0.000075 = $0.004
- Output tokens: ~200K × $0.0003 = $0.06
- **Total**: ~$0.26 (vs $2.00 with Pro)

---

## Integration Points in Fusion Stage Hub

### 1. Image Upload Flow
```
User uploads images → Gemini analyzes quality → Pass/Fail → Save or reject
```

### 2. Auto-Tagging
```
New product images → Gemini generates tags → Review & accept → Save
```

### 3. Listing Optimization
```
Product ready to publish → Gemini checks images → Suggests improvements → Optimize → Publish
```

### 4. Competitive Intelligence
```
Monitor competitors → Gemini analyzes their images → Insights → Strategy adjustments
```

### 5. Content Validation
```
Before publishing → Gemini validates text/image consistency → Report issues → Fix or publish
```

---

## Advanced Features

### Visual Search

```typescript
async visualSearch(
  queryImage: string,
  productCatalog: Product[]
): Promise<Product[]> {
  // Use Gemini to find visually similar products
  const catalogImages = productCatalog.map(p => p.images[0]);
  
  const result = await this.geminiService.analyzeImage(
    [
      { inlineData: { data: queryImage, mimeType: 'image/jpeg' } },
      ...catalogImages.map(img => ({ 
        inlineData: { data: img, mimeType: 'image/jpeg' } 
      }))
    ],
    `Find the most visually similar products to the first image. 
    Rank by similarity and return top 10 matches with similarity scores.`
  );
  
  const matches = JSON.parse(result);
  return this.mapMatchesToProducts(matches, productCatalog);
}
```

### Trend Analysis

```typescript
async analyzeTrends(
  categoryImages: string[],
  timePeriod: string
): Promise<TrendAnalysis> {
  const prompt = `Analyze these ${categoryImages.length} product images from ${timePeriod}.
  
  Identify:
  1. Common visual trends (colors, styles, compositions)
  2. Emerging patterns
  3. Declining trends
  4. Unique outliers
  5. Predictions for next period
  
  Provide actionable insights for product development.`;
  
  const imageParts = categoryImages.map(img => ({
    inlineData: { data: img, mimeType: 'image/jpeg' }
  }));
  
  const result = await this.analyzeImage(imageParts, prompt, 'gemini-1.5-pro');
  return JSON.parse(result);
}
```

---

## Future Enhancements

- **Real-time Video Analysis**: Live product demo feedback
- **AR/3D Model Generation**: Generate 3D models from 2D images
- **Accessibility**: Auto-generate alt text for images
- **Localization**: Detect cultural appropriateness for different markets
- **Style Transfer**: Apply consistent styling across product images

---

**Document Version**: 1.0  
**Last Updated**: December 30, 2024  
**API Reference**: [Google AI Studio](https://ai.google.dev/)
