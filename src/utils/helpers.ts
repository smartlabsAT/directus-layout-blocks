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

/**
 * Ensure every layout area has a stable, unique `id`.
 *
 * The interface filters blocks per area by `area.id`. An area configured without
 * an `id` (e.g. only a width) renders with `id: undefined`, so stored blocks —
 * which always carry an area key (defaulting to `defaultAreaId` on read) — never
 * match and silently disappear from the UI. This derives a fallback id from the
 * label, the configured default area, or the index, and guarantees uniqueness.
 * Areas that already have an `id` are returned unchanged (backward compatible).
 */
export function normalizeAreaIds<T extends { id?: string; label?: string }>(
  areas: T[],
  defaultAreaId = 'main'
): T[] {
  const usedIds = new Set<string>();

  return areas.map((area, index) => {
    let id = (area.id ?? '').trim();

    if (!id) {
      const fromLabel = (area.label ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      id = fromLabel || (index === 0 ? defaultAreaId : `area-${index + 1}`);
    }

    // Guarantee uniqueness when labels collide or ids repeat.
    let uniqueId = id;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}-${suffix++}`;
    }
    usedIds.add(uniqueId);

    return area.id === uniqueId ? area : { ...area, id: uniqueId };
  });
}