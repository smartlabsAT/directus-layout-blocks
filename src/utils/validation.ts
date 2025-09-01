/**
 * Validation utilities for layout-blocks extension
 */

/**
 * Check if a value is not null or undefined
 */
export function isNotNullish(value: any): boolean {
  return value !== null && value !== undefined;
}

/**
 * Check if a value is a valid string
 */
export function isValidString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if a value is a valid array
 */
export function isValidArray(value: any): boolean {
  return Array.isArray(value);
}

/**
 * Check if a value is a valid object
 */
export function isValidObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate collection name
 */
export function isValidCollectionName(name: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(name);
}

/**
 * Validate field name
 */
export function isValidFieldName(name: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(name);
}