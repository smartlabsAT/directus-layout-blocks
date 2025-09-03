import { logger } from '../utils/logger';
import { ref, computed, unref, type Ref, type ComputedRef } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { M2AHelper } from '../utils/m2a-helper';
import type { 
  BlockItem, 
  JunctionInfo, 
  LayoutBlocksOptions,
  M2AFieldInfo
} from '../types';

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
  
  // Initialize M2AHelper
  const m2aHelper = new M2AHelper(api, stores);

  // Get configured field names
  const areaField = computed(() => unref(options).areaField || 'area');
  const sortField = computed(() => unref(options).sortField || 'sort');

  /**
   * Load all blocks for the current item using M2AHelper
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
      blocks.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // Create M2AFieldInfo from junction info
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

      // Load blocks using M2AHelper
      const loadedData = await m2aHelper.loadM2AData(
        pk,
        m2aFieldInfo,
        0,
        3
      );

      // Transform loaded data to BlockItem format
      blocks.value = loadedData.map((record: any) => ({
        id: record.id,
        area: record[areaField.value] || 'main',
        sort: record[sortField.value] || 0,
        collection: record.collection,
        item: record.item,
        _raw: record
      }));

      logger.debug(`Loaded ${blocks.value.length} blocks`);

    } catch (err: any) {
      error.value = err;
      logger.error('Failed to load blocks:', err);
      
      // Check if it's a permission error
      if (err.response?.status === 403) {
        logger.warn('Permission denied when loading blocks. User may not have access to junction collection.');
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get blocks for a specific area
   */
  function getBlocksForArea(area: string): BlockItem[] {
    return blocks.value
      .filter(block => block.area === area)
      .sort((a, b) => a.sort - b.sort);
  }

  /**
   * Add a new block (creates new item and links it)
   */
  async function addBlock(
    area: string,
    targetCollection: string,
    itemData: any
  ): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    const pk = unref(primaryKey);
    if (!pk || pk === '+' || pk === 'new') {
      throw new Error('Cannot add blocks to unsaved item');
    }

    try {
      logger.debug('Creating new block', { area, targetCollection });

      // Create the item in the target collection first
      const itemResponse = await api.post(`/items/${targetCollection}`, itemData);
      const newItemId = itemResponse.data.data.id;
      logger.debug('Created new item', { id: newItemId });

      // Link the item
      await linkExistingItem(area, targetCollection, newItemId);

    } catch (err: any) {
      logger.error('Failed to add block:', err);
      throw err;
    }
  }

  /**
   * Link an existing item to the current record
   */
  async function linkExistingItem(
    area: string,
    targetCollection: string,
    itemId: string | number
  ): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    const pk = unref(primaryKey);
    if (!pk || pk === '+' || pk === 'new') {
      throw new Error('Cannot link items to unsaved record');
    }

    try {
      logger.debug('Linking existing item', {
        area,
        targetCollection,
        itemId
      });

      // Get the next sort value for the area
      const areaBlocks = getBlocksForArea(area);
      const nextSort = areaBlocks.length > 0 
        ? Math.max(...areaBlocks.map(b => b.sort)) + 1 
        : 0;

      // Create the junction record
      const junctionData: any = {
        [junctionInfo.value.foreignKeyField]: pk,
        [junctionInfo.value.itemField]: itemId,
        [junctionInfo.value.collectionField]: targetCollection
      };

      // Add area and sort fields if they exist
      if (junctionInfo.value.hasAreaField) {
        junctionData[areaField.value] = area;
      }
      if (junctionInfo.value.hasSortField) {
        junctionData[sortField.value] = nextSort;
      }

      logger.debug('Creating junction record', junctionData);

      const junctionResponse = await api.post(
        `/items/${junctionInfo.value.collection}`,
        junctionData
      );

      logger.debug('Junction record created', { id: junctionResponse.data.data.id });

      // Load the full item data for display
      const itemResponse = await api.get(`/items/${targetCollection}/${itemId}`);
      
      // Add to local state
      const newBlock: BlockItem = {
        id: junctionResponse.data.data.id,
        area,
        sort: nextSort,
        collection: targetCollection,
        item: itemResponse.data.data
      };

      blocks.value.push(newBlock);
      logger.debug('Block linked successfully');

    } catch (err: any) {
      logger.error('Failed to link item:', err);
      logger.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      throw err;
    }
  }

  /**
   * Duplicate an existing item and link it to the current record
   */
  async function duplicateExistingItem(
    area: string,
    targetCollection: string,
    itemData: any
  ): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    const pk = unref(primaryKey);
    if (!pk || pk === '+' || pk === 'new') {
      throw new Error('Cannot duplicate items to unsaved record');
    }

    try {
      logger.debug('Duplicating existing item', {
        area,
        targetCollection,
        originalItemId: itemData.id
      });

      // Deep clone the item data
      const itemCopy = JSON.parse(JSON.stringify(itemData));
      
      // Remove system metadata fields (based on expandable-blocks pattern)
      const metadataFields = ['id', 'user_created', 'user_updated', 'date_created', 'date_updated'];
      for (const field of metadataFields) {
        delete itemCopy[field];
      }
      
      // Add suffix to title fields (based on expandable-blocks pattern)
      const titleFields = ['title', 'name', 'headline', 'label', 'heading'];
      for (const field of titleFields) {
        if (itemCopy[field] && typeof itemCopy[field] === 'string') {
          itemCopy[field] += ' (Copy)';
          break; // Only add to first found field
        }
      }

      logger.debug('Creating duplicated item', { targetCollection });

      // Create the new item in the target collection
      const itemResponse = await api.post(`/items/${targetCollection}`, itemCopy);
      const newItemId = itemResponse.data.data.id;
      logger.debug('Duplicated item created', { id: newItemId });

      // Link the duplicated item
      await linkExistingItem(area, targetCollection, newItemId);

    } catch (err: any) {
      logger.error('Failed to duplicate item', err);
      logger.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      throw err;
    }
  }

  /**
   * Update a block's area and/or sort position
   */
  async function updateBlock(
    blockId: number,
    updates: { area?: string; sort?: number }
  ): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    try {
      const updateData: any = {};
      
      if (updates.area !== undefined && junctionInfo.value.hasAreaField) {
        updateData[areaField.value] = updates.area;
      }
      if (updates.sort !== undefined && junctionInfo.value.hasSortField) {
        updateData[sortField.value] = updates.sort;
      }

      // Update the junction record
      await api.patch(
        `/items/${junctionInfo.value.collection}/${blockId}`,
        updateData
      );

      // Update local state
      const block = blocks.value.find(b => b.id === blockId);
      if (block) {
        if (updates.area !== undefined) block.area = updates.area;
        if (updates.sort !== undefined) block.sort = updates.sort;
      }

      logger.debug('Block updated successfully');

    } catch (err: any) {
      logger.error('Failed to update block:', err);
      throw err;
    }
  }

  /**
   * Unlink a block (remove junction only, keep content item)
   */
  async function unlinkBlock(blockId: number): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    try {
      const block = blocks.value.find(b => b.id === blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Only delete the junction record (not the content item)
      await api.delete(`/items/${junctionInfo.value.collection}/${blockId}`);

      // Remove from local state
      blocks.value = blocks.value.filter(b => b.id !== blockId);
      
      // Update sort values for remaining blocks in the same area
      const remainingBlocks = blocks.value.filter(b => b.area === block.area);
      remainingBlocks.sort((a, b) => a.sort - b.sort);
      remainingBlocks.forEach((b, index) => {
        b.sort = index;
      });

      logger.debug('Block unlinked successfully');

    } catch (err: any) {
      logger.error('Failed to unlink block:', err);
      throw err;
    }
  }

  /**
   * Delete a block (with option to delete content item)
   */
  async function deleteBlock(blockId: number, deleteItem = false): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    try {
      const block = blocks.value.find(b => b.id === blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Delete the item first if requested
      if (deleteItem && block.item?.id) {
        await api.delete(`/items/${block.collection}/${block.item.id}`);
      }

      // Delete the junction record
      await api.delete(`/items/${junctionInfo.value.collection}/${blockId}`);

      // Remove from local state
      blocks.value = blocks.value.filter(b => b.id !== blockId);
      logger.debug('Block deleted successfully');

    } catch (err: any) {
      logger.error('Failed to delete block:', err);
      throw err;
    }
  }

  /**
   * Reorder blocks within an area
   */
  async function reorderBlocks(
    area: string,
    blockIds: number[]
  ): Promise<void> {
    if (!junctionInfo.value || !junctionInfo.value.hasSortField) {
      logger.warn('Cannot reorder: sort field not available');
      return;
    }

    try {
      // Update sort values
      const updates = blockIds.map((id, index) => ({
        id,
        [sortField.value]: index
      }));

      // Batch update
      for (const update of updates) {
        await api.patch(
          `/items/${junctionInfo.value.collection}/${update.id}`,
          { [sortField.value]: update[sortField.value] }
        );

        // Update local state
        const block = blocks.value.find(b => b.id === update.id);
        if (block) {
          block.sort = update[sortField.value];
        }
      }

      logger.debug('Blocks reordered successfully');

    } catch (err: any) {
      logger.error('Failed to reorder blocks:', err);
      throw err;
    }
  }

  /**
   * Move block to a different area
   */
  async function moveBlock(
    blockId: number,
    targetArea: string,
    targetIndex?: number
  ): Promise<void> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error('Block not found');
    }

    // Get blocks in target area
    const targetBlocks = getBlocksForArea(targetArea);
    
    // Calculate new sort value
    let newSort: number;
    if (targetIndex !== undefined && targetIndex >= 0) {
      if (targetIndex === 0) {
        newSort = targetBlocks[0]?.sort - 1 || 0;
      } else if (targetIndex >= targetBlocks.length) {
        newSort = (targetBlocks[targetBlocks.length - 1]?.sort || 0) + 1;
      } else {
        const prevSort = targetBlocks[targetIndex - 1].sort;
        const nextSort = targetBlocks[targetIndex].sort;
        newSort = (prevSort + nextSort) / 2;
      }
    } else {
      newSort = targetBlocks.length > 0
        ? Math.max(...targetBlocks.map(b => b.sort)) + 1
        : 0;
    }

    // Update the block
    await updateBlock(blockId, {
      area: targetArea,
      sort: newSort
    });
  }

  return {
    blocks: computed(() => blocks.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadBlocks,
    getBlocksForArea,
    addBlock,
    linkExistingItem,
    duplicateExistingItem,
    updateBlock,
    unlinkBlock,
    deleteBlock,
    reorderBlocks,
    moveBlock
  };
}