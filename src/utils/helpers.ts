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

// Temporary-id prefixes used before the global Save assigns real junction PKs.
// `new`  = a brand-new block (content created inline), `dup` = duplicated item,
// `existing` = a link to an already-existing item, `temp`/`idx` = legacy/fallback.
const TEMP_ID_PREFIXES = ['new', 'dup', 'existing', 'temp', 'idx'] as const;

export type TempIdKind = 'new' | 'dup' | 'existing';

/**
 * Generate a unique temporary id for an unsaved block.
 * The kind prefix lets {@link isExistingLink} distinguish linked items (whose
 * source content must NOT be rewritten) from genuinely new content.
 */
export function generateTempId(kind: TempIdKind = 'new'): string {
  return `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Check if an id is a temporary (unsaved) id.
 */
export function isTempId(id: unknown): boolean {
  return typeof id === 'string' && TEMP_ID_PREFIXES.some(p => id.startsWith(`${p}_`));
}

/**
 * Check if an id refers to a link to an existing item (`existing_` prefix).
 * Such blocks must emit only the bare item PK so the source item is not mutated.
 */
export function isExistingLink(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith('existing_');
}

/**
 * Check if a primary key denotes a new (unsaved) item. Directus uses both `'+'`
 * (current) and the legacy `'new'`; a nullish key is also treated as new.
 */
export function isNewItemPk(pk: unknown): boolean {
  return !pk || pk === '+' || pk === 'new';
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