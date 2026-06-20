import type { BlockId } from './index';

/**
 * Inline-edit state passed from interface.vue down to GridView/ListView.
 * Shared between both views so the contract cannot drift (the dynamic
 * `<component :is>` host is NOT strictly type-checked by vue-tsc).
 * `editMode` itself is read from the existing `options.editMode`.
 */
export interface InlineEditViewProps {
  editingBlockId?: BlockId | null;
  editingCollection?: string;
  editingPrimaryKey?: string | number | null;
  editDisabled?: boolean;
  /** Per-block staged-changes predicate (drives the dirty indicator dot). */
  isBlockDirty?: (id: BlockId) => boolean;
}

/**
 * Inline-edit events both views emit upward. Each view keeps its OWN
 * view-specific emits (e.g. the divergent `update-block` payload) local and
 * intersects them with this type.
 */
export interface InlineEditViewEmits {
  /** Live content edit from the inline form → stage into the block's item. */
  'update-block-item': [id: BlockId, values: Record<string, any>];
  /** Revert a single block's staged changes (from the block menu). */
  'revert-block': [id: BlockId];
  'grab-start': [blockId: BlockId];
  /** Close the inline editor (ESC) — staged edits are kept. */
  'cancel-inline': [];
}
