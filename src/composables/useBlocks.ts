import { logger } from '../utils/logger';
import { ref, computed, unref, type Ref, type ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import type { 
  BlockItem, 
  JunctionInfo, 
  LayoutBlocksOptions 
} from '../types';

export function useBlocks(
  collection: string,
  field: string,
  primaryKey: string | number | ComputedRef<string | number>,
  junctionInfo: Ref<JunctionInfo | null>,
  options: LayoutBlocksOptions | ComputedRef<LayoutBlocksOptions>
) {
  const api = useApi();
  const blocks = ref<BlockItem[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Get configured field names
  const areaField = computed(() => unref(options).areaField || 'area');
  const sortField = computed(() => unref(options).sortField || 'sort');

  /**
   * Load all blocks for the current item
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
      // Build the filter for the foreign key
      const filter: any = {
        [junctionInfo.value.foreignKeyField]: {
          _eq: unref(primaryKey)
        }
      };

      // Fetch junction records with related items
      const response = await api.get(`/items/${junctionInfo.value.collection}`, {
        params: {
          fields: [
            '*',
            `${junctionInfo.value.itemField}.*`
          ].join(','),
          filter,
          sort: `${areaField.value},${sortField.value}`,
          limit: -1
        }
      });

      // Transform junction records to BlockItems
      blocks.value = (response.data.data || []).map((record: any) => 
        transformJunctionToBlock(record)
      );

    } catch (err) {
      logger.error('Failed to load blocks:', err);
      error.value = err as Error;
      blocks.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Transform a junction record to a BlockItem
   */
  function transformJunctionToBlock(junctionRecord: any): BlockItem {
    return {
      id: junctionRecord.id,
      area: junctionRecord[areaField.value] || unref(options).defaultArea || 'main',
      sort: junctionRecord[sortField.value] || 0,
      collection: junctionRecord[junctionInfo.value!.collectionField],
      item: junctionRecord[junctionInfo.value!.itemField] || {},
      _raw: junctionRecord
    };
  }

  /**
   * Create a new block
   */
  async function createBlock(
    area: string,
    targetCollection: string,
    itemData: any
  ): Promise<BlockItem> {
    const pk = unref(primaryKey);
    logger.log('🟡 createBlock called with:');
    logger.log('  - area:', area);
    logger.log('  - targetCollection:', targetCollection);
    logger.log('  - itemData:', itemData);
    logger.log('  - primaryKey:', pk);
    logger.log('  - junctionInfo:', junctionInfo.value);
    
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    // Check if this is a new item
    if (!pk || pk === '+' || pk === 'new') {
      throw new Error('Cannot create blocks for unsaved items. Please save the item first.');
    }

    loading.value = true;

    try {
      // 1. Create the actual content item
      logger.log('🟡 Step 1: Creating content item in collection:', targetCollection);
      const itemResponse = await api.post(`/items/${targetCollection}`, itemData);
      logger.log('🟡 Content item created:', itemResponse.data);
      const newItemId = itemResponse.data.data.id;

      // 2. Calculate sort position
      const areaBlocks = blocks.value.filter(b => b.area === area);
      const maxSort = areaBlocks.length > 0 
        ? Math.max(...areaBlocks.map(b => b.sort)) 
        : -1;
      logger.log('🟡 Step 2: Calculated sort position:', maxSort + 1);
      logger.log('  - Area blocks:', areaBlocks);

      // 3. Create junction record
      const junctionData: any = {
        [junctionInfo.value.foreignKeyField]: pk,
        [junctionInfo.value.collectionField]: targetCollection,
        [junctionInfo.value.itemField]: newItemId,
        [areaField.value]: area,
        [sortField.value]: maxSort + 1
      };
      
      logger.log('🟡 Step 3: Creating junction record:');
      logger.log('  - Junction collection:', junctionInfo.value.collection);
      logger.log('  - Junction data:', junctionData);
      logger.log('  - Field mappings:');
      logger.log('    - foreignKeyField:', junctionInfo.value.foreignKeyField, '=', pk);
      logger.log('    - collectionField:', junctionInfo.value.collectionField, '=', targetCollection);
      logger.log('    - itemField:', junctionInfo.value.itemField, '=', newItemId);
      logger.log('    - areaField:', areaField.value, '=', area);
      logger.log('    - sortField:', sortField.value, '=', maxSort + 1);

      const junctionResponse = await api.post(
        `/items/${junctionInfo.value.collection}`,
        junctionData
      );
      logger.log('🟡 Junction record created:', junctionResponse.data);

      // 4. Create and add the new block
      const newBlock: BlockItem = {
        id: junctionResponse.data.data.id,
        area,
        sort: maxSort + 1,
        collection: targetCollection,
        item: itemResponse.data.data,
        _raw: junctionResponse.data.data
      };
      logger.log('🟡 Step 4: Created block object:', newBlock);

      // 5. Update local state
      blocks.value = [...blocks.value, newBlock];
      logger.log('🟡 Step 5: Updated blocks array, new length:', blocks.value.length);
      logger.log('🟡 All blocks:', blocks.value);

      return newBlock;

    } catch (err) {
      logger.error('🔴 Failed to create block:', err);
      logger.error('🔴 Error details:', {
        message: (err as Error).message,
        response: (err as any).response?.data,
        status: (err as any).response?.status
      });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update a block's content
   */
  async function updateBlock(
    blockId: number,
    updates: any
  ): Promise<void> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    try {
      // Update the actual content item
      await api.patch(
        `/items/${block.collection}/${block.item.id}`,
        updates
      );

      // Update local state
      const blockIndex = blocks.value.findIndex(b => b.id === blockId);
      if (blockIndex !== -1) {
        blocks.value[blockIndex] = {
          ...block,
          item: {
            ...block.item,
            ...updates
          }
        };
      }

    } catch (err) {
      logger.error('Failed to update block:', err);
      throw err;
    }
  }

  /**
   * Move a block to a different area or position
   */
  async function moveBlock(
    blockId: number,
    fromArea: string,
    toArea: string,
    toIndex: number
  ): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    loading.value = true;

    try {
      const updates: Array<{ id: number; data: any }> = [];

      // If moving to a different area
      if (fromArea !== toArea) {
        // Update the moved block
        updates.push({
          id: blockId,
          data: {
            [areaField.value]: toArea,
            [sortField.value]: toIndex
          }
        });

        // Update sort values in target area
        const targetAreaBlocks = blocks.value
          .filter(b => b.area === toArea && b.id !== blockId)
          .sort((a, b) => a.sort - b.sort);

        targetAreaBlocks.forEach((block, index) => {
          const newSort = index >= toIndex ? index + 1 : index;
          if (block.sort !== newSort) {
            updates.push({
              id: block.id,
              data: { [sortField.value]: newSort }
            });
          }
        });

        // Update sort values in source area
        const sourceAreaBlocks = blocks.value
          .filter(b => b.area === fromArea && b.id !== blockId)
          .sort((a, b) => a.sort - b.sort);

        sourceAreaBlocks.forEach((block, index) => {
          if (block.sort !== index) {
            updates.push({
              id: block.id,
              data: { [sortField.value]: index }
            });
          }
        });

      } else {
        // Moving within the same area
        const areaBlocks = blocks.value
          .filter(b => b.area === toArea)
          .sort((a, b) => a.sort - b.sort);

        const currentIndex = areaBlocks.findIndex(b => b.id === blockId);
        
        // Remove from current position
        const [movedBlock] = areaBlocks.splice(currentIndex, 1);
        
        // Insert at new position
        areaBlocks.splice(toIndex, 0, movedBlock);

        // Update sort values
        areaBlocks.forEach((block, index) => {
          if (block.sort !== index) {
            updates.push({
              id: block.id,
              data: { [sortField.value]: index }
            });
          }
        });
      }

      // Execute all updates
      await Promise.all(
        updates.map(({ id, data }) =>
          api.patch(`/items/${junctionInfo.value!.collection}/${id}`, data)
        )
      );

      // Reload blocks to ensure consistency
      await loadBlocks();

    } catch (err) {
      logger.error('Failed to move block:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Remove a block
   */
  async function removeBlock(blockId: number): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    loading.value = true;

    try {
      // Delete junction record
      await api.delete(`/items/${junctionInfo.value.collection}/${blockId}`);

      // Optionally delete the actual item
      if (unref(options).deleteItems && block.item?.id) {
        try {
          await api.delete(`/items/${block.collection}/${block.item.id}`);
        } catch (err) {
          logger.warn('Failed to delete related item:', err);
          // Continue even if item deletion fails
        }
      }

      // Remove from local state
      blocks.value = blocks.value.filter(b => b.id !== blockId);

      // Re-sort remaining blocks in the area
      const areaBlocks = blocks.value
        .filter(b => b.area === block.area)
        .sort((a, b) => a.sort - b.sort);

      const updates: Array<{ id: number; sort: number }> = [];
      
      areaBlocks.forEach((block, index) => {
        if (block.sort !== index) {
          updates.push({ id: block.id, sort: index });
        }
      });

      // Update sort values if needed
      if (updates.length > 0) {
        await Promise.all(
          updates.map(({ id, sort }) =>
            api.patch(`/items/${junctionInfo.value!.collection}/${id}`, {
              [sortField.value]: sort
            })
          )
        );

        // Update local state
        updates.forEach(({ id, sort }) => {
          const block = blocks.value.find(b => b.id === id);
          if (block) {
            block.sort = sort;
          }
        });
      }

    } catch (err) {
      logger.error('Failed to remove block:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Duplicate a block
   */
  async function duplicateBlock(blockId: number): Promise<BlockItem> {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    // Create a copy of the item data
    const itemCopy = { ...block.item };
    delete itemCopy.id;
    delete itemCopy.user_created;
    delete itemCopy.user_updated;
    delete itemCopy.date_created;
    delete itemCopy.date_updated;

    // Add suffix to title/name fields
    if (itemCopy.title) {
      itemCopy.title += ' (Copy)';
    } else if (itemCopy.name) {
      itemCopy.name += ' (Copy)';
    } else if (itemCopy.headline) {
      itemCopy.headline += ' (Copy)';
    }

    // Create new block in same area, right after the original
    const newBlock = await createBlock(block.area, block.collection, itemCopy);

    // Move it right after the original
    const areaBlocks = blocks.value
      .filter(b => b.area === block.area)
      .sort((a, b) => a.sort - b.sort);
    
    const originalIndex = areaBlocks.findIndex(b => b.id === blockId);
    
    if (originalIndex !== -1 && originalIndex < areaBlocks.length - 1) {
      await moveBlock(newBlock.id, block.area, block.area, originalIndex + 1);
    }

    return newBlock;
  }

  /**
   * Reorder all blocks in an area
   */
  async function reorderArea(area: string, blockIds: number[]): Promise<void> {
    if (!junctionInfo.value) {
      throw new Error('Junction info not available');
    }

    loading.value = true;

    try {
      const updates = blockIds.map((id, index) => ({
        id,
        data: { [sortField.value]: index }
      }));

      await Promise.all(
        updates.map(({ id, data }) =>
          api.patch(`/items/${junctionInfo.value!.collection}/${id}`, data)
        )
      );

      // Update local state
      blockIds.forEach((id, index) => {
        const block = blocks.value.find(b => b.id === id);
        if (block) {
          block.sort = index;
        }
      });

    } catch (err) {
      logger.error('Failed to reorder area:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get blocks for a specific area, sorted
   */
  function getBlocksByArea(area: string): BlockItem[] {
    return blocks.value
      .filter(b => b.area === area)
      .sort((a, b) => a.sort - b.sort);
  }

  /**
   * Check if a block can be moved to an area
   */
  function canMoveToArea(blockId: number, targetArea: string): boolean {
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) return false;

    // Check area constraints
    const areaConfig = unref(options).areas?.find(a => a.id === targetArea);
    if (!areaConfig) return true; // No config means no restrictions

    // Check max items
    if (areaConfig.maxItems) {
      const currentCount = blocks.value.filter(b => b.area === targetArea).length;
      if (currentCount >= areaConfig.maxItems) return false;
    }

    // Check allowed types
    if (areaConfig.allowedTypes && areaConfig.allowedTypes.length > 0) {
      if (!areaConfig.allowedTypes.includes(block.collection)) return false;
    }

    return true;
  }

  return {
    blocks,
    loading,
    error,
    loadBlocks,
    createBlock,
    updateBlock,
    moveBlock,
    removeBlock,
    duplicateBlock,
    reorderArea,
    getBlocksByArea,
    canMoveToArea
  };
}