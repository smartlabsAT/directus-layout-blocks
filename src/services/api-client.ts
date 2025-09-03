/**
 * Directus API Client Service
 * Simplified version for layout-blocks extension
 */

import { logger } from '../utils/logger';
import type {
  IDirectusApiClient,
  ApiClientConfig,
  SearchOptions,
  SearchResult,
  ApiError,
  DirectusApiInstance
} from './api-client.types';

/**
 * Simplified Directus API Client for layout-blocks
 */
export class DirectusApiClient implements IDirectusApiClient {
  private api: DirectusApiInstance;
  private config: ApiClientConfig;

  constructor(api: DirectusApiInstance, config: ApiClientConfig = {}) {
    this.api = api;
    this.config = {
      retry: true,
      retryOptions: {
        maxRetries: 3,
        retryDelay: 1000,
      },
      ...config
    };
  }

  /**
   * Search items in a collection
   */
  async searchItems<T = any>(
    collection: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<T>> {
    try {
      const params: Record<string, any> = {};
      
      if (options.search) {
        params.search = options.search;
      }
      
      if (options.filter) {
        params.filter = options.filter;
      }
      
      if (options.limit !== undefined) {
        params.limit = options.limit;
      }
      
      if (options.offset !== undefined) {
        params.offset = options.offset;
      } else if (options.page !== undefined && options.limit) {
        params.offset = (options.page - 1) * options.limit;
      }
      
      if (options.sort) {
        params.sort = Array.isArray(options.sort) ? options.sort.join(',') : options.sort;
      }
      
      if (options.fields && options.fields.length > 0) {
        params.fields = options.fields.join(',');
      }
      
      if (options.deep) {
        params.deep = options.deep;
      }
      
      // Add meta for counts
      params.meta = 'filter_count,total_count';
      
      const response = await this.retryRequest(() => 
        this.api.get(`/items/${collection}`, { params })
      );
      
      const result: SearchResult<T> = {
        data: response.data.data || [],
        meta: response.data.meta
      };
      
      return result;
      
    } catch (error) {
      logger.error('Failed to search items', error, { collection, options });
      this.handleError(error as ApiError);
      throw error;
    }
  }

  /**
   * Load multiple items with their relations
   */
  async loadItemsWithRelations<T = any>(
    collection: string,
    ids: (string | number)[],
    fields?: string[]
  ): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    try {
      const params: Record<string, any> = {
        filter: {
          id: {
            _in: ids
          }
        }
      };
      
      if (fields && fields.length > 0) {
        params.fields = fields.join(',');
      } else {
        // Default: Load with one level of relations
        params.fields = '*.*';
      }
      
      const response = await this.retryRequest(() =>
        this.api.get(`/items/${collection}`, { params })
      );
      
      const items = response.data.data || [];
      
      return items;
      
    } catch (error) {
      logger.error('Failed to load items with relations', error, { collection, ids });
      this.handleError(error as ApiError);
      throw error;
    }
  }

  /**
   * Load a single item with its relations
   */
  async loadItemWithRelations<T = any>(
    collection: string,
    id: string | number,
    fields?: string[]
  ): Promise<T> {
    try {
      const params: Record<string, any> = {};
      
      if (fields && fields.length > 0) {
        params.fields = fields.join(',');
      } else {
        // Default: Load with one level of relations
        params.fields = '*.*';
      }
      
      const response = await this.retryRequest(() =>
        this.api.get(`/items/${collection}/${id}`, { params })
      );
      
      const item = response.data.data;
      
      return item;
      
    } catch (error) {
      logger.error('Failed to load item with relations', error, { collection, id });
      this.handleError(error as ApiError);
      throw error;
    }
  }

  /**
   * Create a new item in a collection
   */
  async createItem<T = any>(collection: string, data: Partial<T>): Promise<T> {
    try {
      const response = await this.retryRequest(() =>
        this.api.post(`/items/${collection}`, data)
      );
      
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create item', error, { collection });
      this.handleError(error as ApiError);
      throw error;
    }
  }

  /**
   * Update an existing item in a collection
   */
  async updateItem<T = any>(collection: string, id: string | number, data: Partial<T>): Promise<T> {
    try {
      const response = await this.retryRequest(() =>
        this.api.patch(`/items/${collection}/${id}`, data)
      );
      
      return response.data.data;
    } catch (error) {
      logger.error('Failed to update item', error, { collection, id });
      this.handleError(error as ApiError);
      throw error;
    }
  }

  /**
   * Delete an item from a collection
   */
  async deleteItem(collection: string, id: string | number): Promise<void> {
    try {
      await this.retryRequest(() =>
        this.api.delete(`/items/${collection}/${id}`)
      );
    } catch (error) {
      logger.error('Failed to delete item', error, { collection, id });
      this.handleError(error as ApiError);
      throw error;
    }
  }

  /**
   * Get the raw API instance for direct calls
   */
  getApi(): DirectusApiInstance {
    return this.api;
  }

  /**
   * Private helper methods
   */
  private async retryRequest<T>(
    request: () => Promise<T>,
    retries: number = 0
  ): Promise<T> {
    try {
      return await request();
    } catch (error: any) {
      const maxRetries = this.config.retryOptions?.maxRetries || 3;
      const retryDelay = this.config.retryOptions?.retryDelay || 1000;
      const retryCondition = this.config.retryOptions?.retryCondition || this.defaultRetryCondition;
      
      if (retries < maxRetries && retryCondition(error)) {
        logger.warn(`Request failed, retrying... (${retries + 1}/${maxRetries})`, { error: error.message });
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retries + 1)));
        return this.retryRequest(request, retries + 1);
      }
      
      throw error;
    }
  }

  private defaultRetryCondition(error: any): boolean {
    // Retry on network errors or 5xx errors
    return !error.response || error.response.status >= 500;
  }

  private handleError(error: ApiError): void {
    if (this.config.onError) {
      this.config.onError(error);
    }
    
    // Log structured error
    const errorInfo = {
      message: error.message,
      status: error.response?.status,
      errors: error.response?.data?.errors
    };
    
    logger.error('API request failed', error, errorInfo);
  }
}

/**
 * Factory function to create API client instance
 */
export function createApiClient(
  api: DirectusApiInstance,
  config?: ApiClientConfig
): IDirectusApiClient {
  return new DirectusApiClient(api, config);
}