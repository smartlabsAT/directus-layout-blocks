import { logger } from '../utils/logger';
import { ref, computed, unref, nextTick, type Ref, type ComputedRef } from 'vue';
import { cloneDeep, isEqual } from 'lodash-es';
import { useApi, useStores } from '@directus/extensions-sdk';
import { M2AHelper } from '../utils/m2a-helper';
import { generateTempId, isTempId, isExistingLink } from '../utils/helpers';
import type {
  BlockItem,
  BlockId,
  JunctionInfo,
  LayoutBlocksOptions,
  M2AFieldInfo
} from '../types';

/**
 * Metadata fields stripped from an item before it is duplicated as a new block.
 */
const METADATA_FIELDS = ['id', 'user_created', 'user_updated', 'date_created', 'date_updated'];
const TITLE_FIELDS = ['title', 'name', 'headline', 'label', 'heading'];

export function useBlocks(
  collection: string,
  field: string,
  primaryKey: string | number | ComputedRef<string | number>,
  junctionInfo: Ref<JunctionInfo | null>,
  options: LayoutBlocksOptions | ComputedRef<LayoutBlocksOptions>
) {
  const api = useApi();
  const stores = useStores();
  const blocks = ref<BlockItem[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Initialize M2AHelper (used only for READS — global Save handles all writes)
  const m2aHelper = new M2AHelper(api, stores);

  // Get configured field names
  const areaField = computed(() => unref(options).areaField || 'area');
  const sortField = computed(() => unref(options).sortField || 'sort');

  // --- State-based save tracking (global Save integration, issue #29) ---------
  // Existing blocks explicitly marked dirty (content/area/sort changed). New
  // blocks (temporary ids) are always dirty by nature. `isInternalUpdate` guards
  // the interface's value/blocks watchers against feedback loops during our own
  // emit and during loadBlocks().
  const dirtyIds = ref<Set<BlockId>>(new Set());
  const isInternalUpdate = ref(false);

  function markBlockDirty(id: BlockId, dirty = true): void {
    if (dirty) dirtyIds.value.add(id);
    else dirtyIds.value.delete(id);
  }

  /**
   * Snapshot the freshly-loaded state as the clean baseline. Called after every
   * load so the global Save button only activates on subsequent user changes.
   */
  function resetTracking(): void {
    dirtyIds.value.clear();
  }

  /**
   * Next integer sort value for an area (per-area sequential integers — keeps the
   * junction `sort` column integral, see fix #42).
   */
  function nextSortFor(area: string): number {
    const areaBlocks = blocks.value.filter(b => b.area === area);
    return areaBlocks.length > 0 ? Math.max(...areaBlocks.map(b => b.sort)) + 1 : 0;
  }

  /**
   * Load all blocks for the current item using M2AHelper (read-only).
   */
  async function loadBlocks(): Promise<void> {
    if (!junctionInfo.value) {
      logger.warn('Junction info not available, cannot load blocks');
      return;
    }

    // Skip loading if this is a new item
    const pk = unref(primaryKey);
    if (!pk || pk === '+' || pk === 'new') {
      logger.log('New item detected, skipping block load');
      applyLoaded([]);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const m2aFieldInfo: M2AFieldInfo = {
        field,
        collection,
        junctionCollection: junctionInfo.value.collection,
        junctionField: field,
        foreignKeyField: junctionInfo.value.foreignKeyField,
        allowedCollections: junctionInfo.value.allowedCollections || [],
        areaField: junctionInfo.value.hasAreaField ? areaField.value : undefined,
        sortField: junctionInfo.value.hasSortField ? sortField.value : undefined
      };

      logger.debug('Loading blocks with M2AHelper', { parentId: pk });

      const loadedData = await m2aHelper.loadM2AData(pk, m2aFieldInfo, 0, 3);

      applyLoaded(loadedData.map((record: any) => ({
        id: record.id,
        area: record[areaField.value] || 'main',
        sort: record[sortField.value] || 0,
        collection: record.collection,
        item: record.item,
        _raw: record
      })));

      logger.debug(`Loaded ${blocks.value.length} blocks`);

    } catch (err: any) {
      error.value = err;
      logger.error('Failed to load blocks:', err);

      if (err.response?.status === 403) {
        logger.warn('Permission denied when loading blocks. User may not have access to junction collection.');
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * Apply freshly-loaded data to the blocks array as a programmatic (non-user)
   * change. Wrapped in `isInternalUpdate` so the interface's emit/value watchers
   * do not treat the reload as a user edit, and the dirty baseline is reset so
   * the next user change re-activates Save.
   *
   * Reconciles IN PLACE: blocks whose id and content are unchanged keep their
   * object identity, so Vue's keyed list does not re-render them — this prevents
   * the post-save (Save & Stay) "flash" where the whole list blinked. Only
   * genuinely changed blocks (e.g. reverted on Discard) and added/removed ones
   * re-render.
   */
  function applyLoaded(next: BlockItem[]): void {
    isInternalUpdate.value = true;

    const currentById = new Map(blocks.value.map(b => [String(b.id), b]));
    blocks.value = next.map((fresh) => {
      const existing = currentById.get(String(fresh.id));
      if (!existing) return fresh; // new or id-resolved block → fresh object
      // Mutate in place only where something actually changed, preserving the
      // object reference for untouched blocks.
      if (existing.area !== fresh.area) existing.area = fresh.area;
      if (existing.sort !== fresh.sort) existing.sort = fresh.sort;
      if (existing.collection !== fresh.collection) existing.collection = fresh.collection;
      if (!isEqual(existing.item, fresh.item)) existing.item = fresh.item;
      existing._raw = fresh._raw;
      return existing;
    });

    resetTracking();
    nextTick(() => {
      isInternalUpdate.value = false;
    });
  }

  /**
   * Get blocks for a specific area (sorted).
   */
  function getBlocksForArea(area: string): BlockItem[] {
    return blocks.value
      .filter(block => block.area === area)
      .sort((a, b) => a.sort - b.sort);
  }

  /**
   * Add a new block (creates a new inline item, persisted on global Save).
   */
  async function addBlock(
    area: string,
    targetCollection: string,
    itemData: any
  ): Promise<void> {
    const newBlock: BlockItem = {
      id: generateTempId('new'),
      area,
      sort: nextSortFor(area),
      collection: targetCollection,
      item: { ...itemData }
    };
    blocks.value.push(newBlock);
    logger.debug('New block staged (pending save)', { id: newBlock.id, area });
  }

  /**
   * Link an existing item to the current record (persisted on global Save).
   * The item content is fetched read-only for display; only the bare PK is
   * emitted on save so the source item is never mutated.
   */
  async function linkExistingItem(
    area: string,
    targetCollection: string,
    itemId: string | number
  ): Promise<void> {
    try {
      // Read-only fetch of the item content for display.
      const itemResponse = await api.get(`/items/${targetCollection}/${itemId}`);

      const newBlock: BlockItem = {
        id: generateTempId('existing'),
        area,
        sort: nextSortFor(area),
        collection: targetCollection,
        item: itemResponse.data.data
      };
      blocks.value.push(newBlock);
      logger.debug('Existing item linked (pending save)', { itemId, area });
    } catch (err: any) {
      logger.error('Failed to link item:', err);
      throw err;
    }
  }

  /**
   * Duplicate an existing item as a new inline block (persisted on global Save).
   */
  async function duplicateExistingItem(
    area: string,
    targetCollection: string,
    itemData: any
  ): Promise<void> {
    const itemCopy = cloneDeep(itemData) as Record<string, any>;

    for (const f of METADATA_FIELDS) delete itemCopy[f];
    for (const f of TITLE_FIELDS) {
      if (itemCopy[f] && typeof itemCopy[f] === 'string') {
        itemCopy[f] += ' (Copy)';
        break;
      }
    }

    const newBlock: BlockItem = {
      id: generateTempId('dup'),
      area,
      sort: nextSortFor(area),
      collection: targetCollection,
      item: itemCopy
    };
    blocks.value.push(newBlock);
    logger.debug('Item duplicated (pending save)', { area });
  }

  /**
   * Update a block's area and/or sort position (state only).
   */
  async function updateBlock(
    blockId: BlockId,
    updates: { area?: string; sort?: number }
  ): Promise<void> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) return;

    if (updates.area !== undefined) block.area = updates.area;
    if (updates.sort !== undefined) block.sort = updates.sort;
    markBlockDirty(blockId, true);
  }

  /**
   * Unlink a block (remove from the layout; the junction is deleted on save).
   * The content item is preserved.
   */
  async function unlinkBlock(blockId: BlockId): Promise<void> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) throw new Error('Block not found');

    const area = block.area;
    // Removing the block from the emitted array makes Directus delete the
    // junction row on save (structured-deferred deletion).
    blocks.value = blocks.value.filter(b => b.id !== blockId);
    dirtyIds.value.delete(blockId);

    // Renumber the remaining blocks in the area with clean integer sorts.
    const remaining = blocks.value.filter(b => b.area === area).sort((a, b) => a.sort - b.sort);
    remaining.forEach((b, index) => {
      if (b.sort !== index) {
        b.sort = index;
        markBlockDirty(b.id, true);
      }
    });

    logger.debug('Block unlinked (pending save)', { blockId });
  }

  /**
   * Delete a block. The junction removal is deferred to global Save. When
   * `deleteItem` is requested, the underlying content item is deleted
   * immediately (an explicit destructive "delete everywhere" action that the
   * M2A form value cannot express).
   */
  async function deleteBlock(blockId: BlockId, deleteItem = false): Promise<void> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) throw new Error('Block not found');

    if (deleteItem && block.item?.id && !isTempId(blockId)) {
      await api.delete(`/items/${block.collection}/${block.item.id}`);
      logger.debug('Content item deleted', { collection: block.collection, id: block.item.id });
    }

    await unlinkBlock(blockId);
    logger.debug('Block deleted (junction pending save)', { blockId });
  }

  /**
   * Reorder blocks within an area (state only). Assigns sequential integer sort
   * values to keep the junction `sort` column integral (fix #42).
   */
  async function reorderBlocks(area: string, blockIds: BlockId[]): Promise<void> {
    blockIds.forEach((id, index) => {
      const block = blocks.value.find(b => b.id === id);
      if (block && block.sort !== index) {
        block.sort = index;
        markBlockDirty(id, true);
      }
    });
    logger.debug('Blocks reordered (pending save)', { area });
  }

  /**
   * Move a block to a different area at a drop index (state only).
   */
  async function moveBlock(
    blockId: BlockId,
    targetArea: string,
    targetIndex?: number
  ): Promise<void> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) throw new Error('Block not found');

    // Build the target area order without the moved block, insert at the drop
    // index, then renumber with sequential integers (see fix #40/#42).
    const orderedIds = getBlocksForArea(targetArea)
      .filter(b => b.id !== blockId)
      .map(b => b.id);

    const insertAt = targetIndex !== undefined && targetIndex >= 0
      ? Math.min(targetIndex, orderedIds.length)
      : orderedIds.length;
    orderedIds.splice(insertAt, 0, blockId);

    if (block.area !== targetArea) {
      await updateBlock(blockId, { area: targetArea });
    }
    await reorderBlocks(targetArea, orderedIds);
  }

  /**
   * Build the Directus M2A field value for global Save.
   *
   * Per array element:
   * - clean existing block  → bare junction id (number)
   * - dirty existing block  → full junction object with nested item (deep update)
   * - linked existing item  → junction object, item = bare PK (source not mutated)
   * - new block             → junction object, nested item without id (create)
   * - deleted/unlinked      → simply absent from the array (Directus deletes it)
   */
  function prepareItemsForEmit(): any[] {
    const info = junctionInfo.value;
    if (!info) {
      // Without resolved junction info we cannot shape the value safely.
      return blocks.value.map(b => b.id);
    }

    const collectionField = info.collectionField;
    const itemField = info.itemField;
    const hasArea = info.hasAreaField;
    const hasSort = info.hasSortField;

    return blocks.value.map((block) => {
      const temp = isTempId(block.id);
      const dirty = temp || dirtyIds.value.has(block.id);

      // Clean, persisted block → emit the bare id.
      if (!dirty) {
        return block.id;
      }

      const junction: Record<string, any> = {
        [collectionField]: block.collection
      };
      if (!temp) junction.id = block.id;
      if (hasArea) junction[areaField.value] = block.area;
      if (hasSort) junction[sortField.value] = block.sort;

      if (isExistingLink(block.id)) {
        // Link to existing item → bare PK only.
        junction[itemField] = block.item?.id ?? block.item;
      } else if (temp) {
        // Truly new content → nested object without an id (create).
        const { id: _omitId, ...itemData } = block.item || {};
        junction[itemField] = itemData;
      } else {
        // Existing block with edited content → nested object with id (deep update).
        junction[itemField] = block.item;
      }

      return junction;
    });
  }

  return {
    blocks: computed(() => blocks.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    isInternalUpdate,
    loadBlocks,
    getBlocksForArea,
    addBlock,
    linkExistingItem,
    duplicateExistingItem,
    updateBlock,
    unlinkBlock,
    deleteBlock,
    reorderBlocks,
    moveBlock,
    markBlockDirty,
    prepareItemsForEmit
  };
}
