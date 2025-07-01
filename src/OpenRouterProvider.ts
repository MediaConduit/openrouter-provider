/**
 * OpenRouter Provider with TextToText Support
 * 
 * Provider that integrates with OpenRouter's unified LLM API.
 * Provides access to multiple model providers through a single interface.
 */

import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig, 
  GenerationRequest, 
  GenerationResult 
} from '@mediaconduit/mediaconduit/src/media/types/provider';
import { OpenRouterAPIClient, OpenRouterConfig } from './OpenRouterAPIClient';
import { TextToTextProvider } from '@mediaconduit/mediaconduit/src/media/capabilities';
import { TextToTextModel } from '@mediaconduit/mediaconduit/src/media/models/abstracts/TextToTextModel';
import { OpenRouterTextToTextModel } from './OpenRouterTextToTextModel';

export class OpenRouterProvider implements MediaProvider, TextToTextProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [
    MediaCapability.TEXT_TO_TEXT
  ];

  private config?: ProviderConfig;
  private apiClient?: OpenRouterAPIClient;
  private discoveredModels = new Map<string, ProviderModel>();


  get models(): ProviderModel[] {
    // Return discovered models if available, otherwise return empty array
    // Models will be discovered in background and populated over time
    return Array.from(this.discoveredModels.values());
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    const openRouterConfig: OpenRouterConfig = {
      apiKey: config.apiKey,
      httpReferer: 'https://MediaConduit.ai',
      xTitle: 'MediaConduit AI'
    };

    this.apiClient = new OpenRouterAPIClient(openRouterConfig);

    // Start model discovery in background (non-blocking)
    this.discoverModels().catch(error => {
      console.warn('[OpenRouterProvider] Model discovery failed:', error instanceof Error ? error.message : String(error));
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      return await this.apiClient.testConnection();
    } catch (error) {
      console.warn('OpenRouter availability check failed:', error);
      return false;
    }
  }

  getModelsForCapability(capability: MediaCapability): ProviderModel[] {
    if (capability === MediaCapability.TEXT_TO_TEXT) {
      return this.models;
    }
    return [];
  }

  async getHealth() {
    const isAvailable = await this.isAvailable();
    
    return {
      status: isAvailable ? 'healthy' as const : 'unhealthy' as const,
      uptime: process.uptime(),
      activeJobs: 0, // Models handle their own jobs
      queuedJobs: 0,
      lastError: isAvailable ? undefined : 'API connection failed'
    };
  }

  // TextToTextProvider interface implementation
  async createTextToTextModel(modelId: string): Promise<TextToTextModel> {
    if (!this.apiClient) {
      throw new Error('Provider not configured');
    }

    if (!this.supportsTextToTextModel(modelId)) {
      throw new Error(`Model '${modelId}' is not supported by OpenRouter provider`);
    }

    return new OpenRouterTextToTextModel({
      apiClient: this.apiClient,
      modelId
    });
  }  /**
   * Get a model instance by ID - ready immediately!
   */
  async getModel(modelId: string): Promise<any> {
    if (!this.apiClient) {
      throw new Error('Provider not configured - set OPENROUTER_API_KEY environment variable or call configure()');
    }
    
    // For OpenRouter, all models are text-to-text
    return this.createTextToTextModel(modelId);
  }

  getSupportedTextToTextModels(): string[] {
    return this.models.map(model => model.id);
  }
  supportsTextToTextModel(modelId: string): boolean {
    // OpenRouter supports any model ID - optimistic approach
    return true;
  }

  // Service management (no-ops for remote API providers)
  async startService(): Promise<boolean> {
    return true; // Remote APIs are always "started"
  }

  async stopService(): Promise<boolean> {
    return true; // No service to stop for remote APIs
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    const isAvailable = await this.isAvailable();
    return {
      running: true, // Remote APIs are always "running"
      healthy: isAvailable,
      error: isAvailable ? undefined : 'API connection failed'
    };
  }

  // MediaProvider interface methods (required but delegated to models)
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('OpenRouterProvider should use Model instances for generation, not direct generation');
  }

  /**
   * Get free models available on OpenRouter
   */
  getFreeModels(): ProviderModel[] {
    return this.models.filter(model => 
      model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0
    );
  }

  /**
   * Check if a specific model is free
   */
  isModelFree(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    return model ? (model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0) : false;
  }

  // Helper methods
  private async discoverModels(): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      const availableModels = await this.apiClient.getAvailableModels();
        for (const model of availableModels) {
        console.log(`[OpenRouterProvider] Discovered model: ${model.id}`);
        
        // Parse pricing information if available
        let pricing: { inputCost?: number; outputCost?: number; currency: string } | undefined;
        if (model.pricing) {
          try {
            // OpenRouter pricing is in string format like "$0.0001" per token
            const inputCost = model.pricing.prompt ? parseFloat(model.pricing.prompt.replace('$', '')) : 0;
            const outputCost = model.pricing.completion ? parseFloat(model.pricing.completion.replace('$', '')) : 0;
            pricing = {
              inputCost,
              outputCost,
              currency: 'USD'
            };
          } catch (error) {
            console.warn(`[OpenRouterProvider] Failed to parse pricing for ${model.id}:`, error);
          }
        }
        
        const providerModel: ProviderModel = {
          id: model.id,
          name: model.name,
          description: model.description || `OpenRouter model: ${model.id}`,
          capabilities: [MediaCapability.TEXT_TO_TEXT, MediaCapability.TEXT_TO_TEXT],
          parameters: {
            temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
            max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
            top_p: { type: 'number', min: 0, max: 1, default: 1 }
          },
          ...(pricing && { pricing })
        };

        this.discoveredModels.set(model.id, providerModel);
      }

      console.log(`[OpenRouterProvider] Discovered ${this.discoveredModels.size} models`);
    } catch (error) {
      console.warn('[OpenRouterProvider] Model discovery failed, using popular models fallback:', error instanceof Error ? error.message : String(error));
    }
  }

  private getModelDisplayName(modelId: string): string {
    const parts = modelId.split('/');
    if (parts.length === 2) {
      const [provider, model] = parts;
      return `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${model}`;
    }
    return modelId;
  }  /**
   * Constructor automatically configures from environment variables - sync and ready!
   */
  constructor() {
    // Sync configuration from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (apiKey) {
      const openRouterConfig: OpenRouterConfig = {
        apiKey,
        httpReferer: 'https://MediaConduit.ai',
        xTitle: 'MediaConduit AI'
      };

      this.apiClient = new OpenRouterAPIClient(openRouterConfig);
      this.config = { apiKey };
      
      // Start model discovery in background (non-blocking)
      this.discoverModels().catch(error => {
        console.warn('[OpenRouterProvider] Background model discovery failed:', error instanceof Error ? error.message : String(error));
      });
    }
    // If no API key, provider will be available but not functional until configured
  }
}
