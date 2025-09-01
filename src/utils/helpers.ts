/**
 * Helper utilities for layout-blocks extension
 */

// System fields that should be excluded from defaults
export const METADATA_FIELDS = [
  'id',
  'user_created',
  'user_updated',
  'date_created',
  'date_updated',
  'sort',
  'status'
];

/**
 * Check if a value is not null or undefined
 */
export function isNotNullish(value: any): boolean {
  return value !== null && value !== undefined;
}

/**
 * Generate a unique ID for temporary items
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an ID is a temporary ID
 */
export function isTempId(id: any): boolean {
  return typeof id === 'string' && id.startsWith('temp_');
}

/**
 * Format collection name for display
 */
export function formatCollectionName(collection: string): string {
  return collection
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}