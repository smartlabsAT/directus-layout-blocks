/**
 * API Client Types
 * Simplified version for layout-blocks extension
 */

export interface DirectusApiInstance {
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
  patch: (url: string, data?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
}

export interface SearchOptions {
  search?: string;
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
  page?: number;
  sort?: string | string[];
  fields?: string[];
  deep?: Record<string, any>;
}

export interface SearchResult<T = any> {
  data: T[];
  meta?: {
    filter_count?: number;
    total_count?: number;
  };
}

export interface ApiClientConfig {
  retry?: boolean;
  retryOptions?: {
    maxRetries?: number;
    retryDelay?: number;
    retryCondition?: (error: any) => boolean;
  };
  checkApiAvailability?: boolean;
  onError?: (error: ApiError) => void;
}

export interface ApiError {
  message: string;
  response?: {
    status: number;
    data?: {
      errors?: any[];
    };
  };
}

export interface IDirectusApiClient {
  searchItems<T = any>(collection: string, options?: SearchOptions): Promise<SearchResult<T>>;
  loadItemsWithRelations<T = any>(collection: string, ids: (string | number)[], fields?: string[]): Promise<T[]>;
  loadItemWithRelations<T = any>(collection: string, id: string | number, fields?: string[]): Promise<T>;
  createItem<T = any>(collection: string, data: Partial<T>): Promise<T>;
  updateItem<T = any>(collection: string, id: string | number, data: Partial<T>): Promise<T>;
  deleteItem(collection: string, id: string | number): Promise<void>;
  getApi(): DirectusApiInstance;
}