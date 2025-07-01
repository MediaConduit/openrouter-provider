# OpenRouter Provider for MediaConduit

A dynamic provider for integrating OpenRouter's unified LLM API with MediaConduit. Provides access to **200+ models** from multiple AI providers through a single, consistent interface.

## Features

- **🤖 200+ Models**: Access models from OpenAI, Anthropic, Google, Meta, Mistral, and more
- **💰 Free Models**: Many models available with generous free tiers
- **⚡ Dynamic Loading**: Loads directly from GitHub repository
- **🔧 Zero Configuration**: Works immediately after loading with API key
- **📊 Unified API**: Single interface for all supported LLM providers
- **🚀 Fast**: Optimized for low-latency text generation

## Supported Model Providers

### Major Providers Available Through OpenRouter
- **OpenAI**: GPT-4, GPT-3.5-turbo, and more
- **Anthropic**: Claude 3 (Opus, Sonnet, Haiku)
- **Google**: Gemini Pro, PaLM 2
- **Meta**: Llama 2, Code Llama
- **Mistral**: Mistral 7B, Mixtral 8x7B
- **Cohere**: Command models
- **And 20+ more providers**

### Popular Free Models
- `meta-llama/llama-3.2-3b-instruct:free`
- `mistralai/mistral-7b-instruct:free`
- `microsoft/phi-3-mini-128k-instruct:free`
- `qwen/qwen-2-7b-instruct:free`

**Models are discovered dynamically** - always up-to-date with OpenRouter's latest offerings!

## Quick Start

### 1. Load the Provider

```typescript
import { getProviderRegistry } from '@mediaconduit/mediaconduit';

// Load provider from GitHub
const registry = getProviderRegistry();
const provider = await registry.getProvider('https://github.com/MediaConduit/openrouter-provider');
```

### 2. Configure with API Key

```typescript
// Configure with OpenRouter API key
await provider.configure({
  apiKey: process.env.OPENROUTER_API_KEY
});
```

### 3. Use Models

```typescript
// Use a fast free model
const model = await provider.getModel('meta-llama/llama-3.2-3b-instruct:free');
const result = await model.transform('Explain quantum computing in simple terms');
console.log(result.content);

// Use a premium model for better quality
const premiumModel = await provider.getModel('anthropic/claude-3-opus');
const analysis = await premiumModel.transform('Analyze this complex business problem...');
console.log(analysis.content);

// Use specialized models
const codeModel = await provider.getModel('meta-llama/codellama-34b-instruct');
const code = await codeModel.transform('Write a Python function to sort a list');
console.log(code.content);
```

## Configuration

### Environment Variables

```bash
# Required: OpenRouter API key
OPENROUTER_API_KEY=your_api_key_here

# Optional: Custom base URL
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional: App name for tracking
OPENROUTER_APP_NAME=my-app
```

### Provider Configuration

```yaml
# MediaConduit.provider.yml
id: openrouter-provider
name: OpenRouter Provider
type: remote
capabilities:
  - text-to-text

# No hardcoded models - they're discovered dynamically!
```

## Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
# Set API key
export OPENROUTER_API_KEY=your_key_here

# Run tests
npm test
```

### Project Structure

```
openrouter-provider/
├── src/
│   ├── OpenRouterProvider.ts          # Main provider class
│   ├── OpenRouterAPIClient.ts         # API client
│   ├── OpenRouterTextToTextModel.ts   # Text generation model
│   └── index.ts                       # Exports
├── MediaConduit.provider.yml          # Provider metadata
├── package.json                       # Dependencies
└── README.md                          # This file
```

## API Reference

### OpenRouterProvider

```typescript
class OpenRouterProvider implements MediaProvider {
  readonly id: string = 'openrouter';
  readonly name: string = 'OpenRouter';
  readonly type: ProviderType = ProviderType.REMOTE;
  readonly capabilities: MediaCapability[];
  
  async configure(config: ProviderConfig): Promise<void>;
  async isAvailable(): Promise<boolean>;
  getModelsForCapability(capability: MediaCapability): ProviderModel[];
  async getModel(modelId: string): Promise<Model>;
}
```

### Model Options

```typescript
interface OpenRouterTextToTextOptions {
  temperature?: number;          // 0.0 to 2.0
  maxTokens?: number;           // Maximum output tokens
  topP?: number;                // 0.0 to 1.0
  topK?: number;                // Top-k sampling
  frequencyPenalty?: number;    // -2.0 to 2.0
  presencePenalty?: number;     // -2.0 to 2.0
  repetitionPenalty?: number;   // Penalize repetition
  systemPrompt?: string;        // System message
  stop?: string[];              // Stop sequences
  seed?: number;                // For reproducible outputs
  responseFormat?: 'text' | 'json';
}
```

## Model Selection Guide

### For Speed (Free)
- `meta-llama/llama-3.2-3b-instruct:free` - Fast, good quality
- `mistralai/mistral-7b-instruct:free` - Balanced performance

### For Quality (Paid)
- `anthropic/claude-3-opus` - Best reasoning and analysis
- `openai/gpt-4-turbo` - Excellent general purpose
- `google/gemini-pro-1.5` - Great for long contexts

### For Code
- `meta-llama/codellama-34b-instruct` - Specialized for programming
- `openai/gpt-4-turbo` - Strong code generation

### For Creative Writing
- `anthropic/claude-3-sonnet` - Excellent for creative tasks
- `mistralai/mixtral-8x7b-instruct` - Good creative balance

## Cost Optimization

OpenRouter provides transparent pricing and many free models:

```typescript
// Use free models for development and testing
const freeModel = await provider.getModel('meta-llama/llama-3.2-3b-instruct:free');

// Upgrade to paid models for production
const prodModel = await provider.getModel('anthropic/claude-3-sonnet');

// Check model pricing dynamically
const models = provider.getModelsForCapability(MediaCapability.TEXT_TO_TEXT);
const freeModels = models.filter(m => m.id.includes(':free'));
console.log(`${freeModels.length} free models available`);
```

## Error Handling

The provider includes comprehensive error handling:

- **API Errors**: Automatic retries for transient failures
- **Rate Limiting**: Respects OpenRouter rate limits
- **Model Availability**: Validates model existence before requests
- **Network Issues**: Graceful degradation with informative error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/MediaConduit/openrouter-provider/issues
- OpenRouter Documentation: https://openrouter.ai/docs
- MediaConduit Documentation: https://mediaconduit.dev/docs/providers/openrouter
