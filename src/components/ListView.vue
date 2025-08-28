<template>
  <div class="layout-blocks-list-view">
    <!-- Area Tabs -->
    <div class="area-tabs">
      <!-- All Blocks Tab -->
      <button
        class="area-tab"
        :class="{ 
          active: selectedArea === null,
          'has-blocks': true
        }"
        @click="selectArea(null)"
      >
        <v-icon name="view_list" small />
        <span>All Blocks</span>
        <v-chip x-small>
          {{ blocks.length }}
        </v-chip>
      </button>
      
      <!-- Defined Area Tabs -->
      <button
        v-for="area in visibleAreas"
        :key="area.id"
        class="area-tab"
        :class="{ 
          active: selectedArea === area.id,
          'has-blocks': hasBlocks(area.id),
          'orphaned': area.id === 'orphaned'
        }"
        :data-area-id="area.id"
        @click="selectArea(area.id)"
        @dragover.prevent="handleAreaDragOver"
        @drop="handleAreaDrop($event, area.id)"
        @dragleave="handleAreaDragLeave"
      >
        <v-icon v-if="area.icon" :name="area.icon" small />
        <span>{{ area.label }}</span>
        <v-chip v-if="getAreaBlocks(area.id).length > 0" x-small :class="{ 'warning': area.id === 'orphaned' }">
          {{ getAreaBlocks(area.id).length }}
        </v-chip>
      </button>
      
      <!-- Orphaned Area Tab is now included in visibleAreas from parent component -->
      <!-- No need to manually add it here anymore -->
      
      <v-button
        v-if="permissions.create"
        v-tooltip="'Add new block'"
        icon
        small
        rounded
        class="add-button"
        @click="$emit('add-block', selectedArea)"
      >
        <v-icon name="add" />
      </v-button>
    </div>

    <!-- Selected Area Content -->
    <div v-if="selectedArea !== undefined" class="area-content">
      <!-- Blocks List -->
      <div v-if="selectedAreaBlocks.length > 0" class="blocks-list">
        <table class="blocks-table">
          <thead>
            <tr>
              <th v-if="options.enableDragDrop && (!selectedAreaConfig?.locked || selectedArea === 'orphaned')" style="width: 40px"></th>
              <th style="width: 40px"></th>
              <th>
                <div class="header-with-icon">
                  <v-icon name="title" small />
                  <span>Title</span>
                </div>
              </th>
              <th style="width: 20%">
                <div class="header-with-icon">
                  <v-icon name="category" small />
                  <span>Type</span>
                </div>
              </th>
              <th style="width: 15%">
                <div class="header-with-icon">
                  <v-icon name="check_circle" small />
                  <span>Status</span>
                </div>
              </th>
              <th v-if="selectedArea === null || selectedArea === 'orphaned'" style="width: 15%">
                <div class="header-with-icon">
                  <v-icon name="dashboard" small />
                  <span>Area</span>
                </div>
              </th>
              <th style="width: 120px; text-align: right">
                <div class="header-with-icon" style="justify-content: flex-end">
                  <v-icon name="settings" small />
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="block in selectedAreaBlocks" :key="block.id" class="block-row">
              <td v-if="options.enableDragDrop && (!selectedAreaConfig?.locked || selectedArea === 'orphaned')" class="drag-cell">
                <div
                  class="drag-handle"
                  :draggable="true"
                  @dragstart="handleDragStart($event, block)"
                  @dragend="handleDragEnd"
                >
                  <v-icon name="drag_handle" />
                </div>
              </td>
              
              <td class="icon-cell">
                <v-icon :name="getBlockIcon(block)" />
              </td>
              
              <td class="title-cell">
                <div class="block-title-cell">
                  <strong>{{ getBlockTitle(block) }}</strong>
                  <div v-if="getBlockSubtitle(block)" class="subtitle">
                    {{ getBlockSubtitle(block) }}
                  </div>
                </div>
              </td>
              
              <td class="type-cell">
                <v-chip small>{{ getCollectionLabel(block) }}</v-chip>
              </td>
              
              <td class="status-cell">
                <v-menu
                  v-if="block.item"
                  show-arrow
                  placement="bottom"
                  :close-on-content-click="true"
                >
                  <template #activator="{ toggle }">
                    <div 
                      class="status-display"
                      :class="{ clickable: permissions.update }"
                      @click="permissions.update && toggle()"
                    >
                      <span class="status-dot" :class="`status-${block.item.status || 'draft'}`" />
                      <span class="status-text">{{ getStatusLabel(block.item.status) }}</span>
                    </div>
                  </template>
                  
                  <v-list>
                    <v-list-item
                      v-for="status in statusOptions"
                      :key="status.value"
                      clickable
                      :active="(block.item.status || 'draft') === status.value"
                      @click="updateBlockStatus(block, status.value)"
                    >
                      <v-list-item-icon>
                        <span class="status-dot" :class="`status-${status.value}`" />
                      </v-list-item-icon>
                      <v-list-item-content>{{ status.text }}</v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
              
              <td v-if="selectedArea === null || selectedArea === 'orphaned'" class="area-cell">
                <v-chip 
                  v-if="getAreaForBlock(block)"
                  small
                  :style="getAreaChipStyle(block)"
                >
                  <v-icon v-if="getAreaForBlock(block)?.icon" :name="getAreaForBlock(block).icon" x-small left />
                  {{ getAreaForBlock(block)?.label || block.area }}
                </v-chip>
                <v-chip v-else small class="orphaned-chip">
                  <v-icon name="warning" x-small left />
                  {{ block.area || 'None' }}
                </v-chip>
              </td>
              
              <td class="actions-cell">
                <div class="actions-wrapper">
                  <v-button
                    v-if="permissions.update"
                    v-tooltip="'Edit'"
                    icon
                    x-small
                    @click="$emit('update-block', { blockId: block.id })"
                  >
                    <v-icon name="edit" />
                  </v-button>
                  
                  <v-button
                    v-if="permissions.create"
                    v-tooltip="'Duplicate'"
                    icon
                    x-small
                    @click="$emit('duplicate-block', block.id)"
                  >
                    <v-icon name="content_copy" />
                  </v-button>
                  
                  <v-button
                    v-if="permissions.delete"
                    v-tooltip="'Remove'"
                    icon
                    x-small
                    class="danger"
                    @click="confirmRemove(block.id)"
                  >
                    <v-icon name="delete" />
                  </v-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <v-icon name="inbox" large />
        <p>No blocks in {{ selectedAreaConfig?.label }}</p>
        <v-button
          v-if="permissions.create && !selectedAreaConfig?.locked"
          @click="$emit('add-block', selectedArea)"
        >
          Add First Block
        </v-button>
      </div>

      <!-- Area Footer with Limit -->
      <div v-if="selectedAreaConfig?.maxItems" class="area-footer">
        <v-progress-linear
          :model-value="getAreaProgress(selectedAreaConfig)"
          :color="getAreaProgress(selectedAreaConfig) >= 100 ? 'danger' : 'primary'"
        />
        <span>{{ selectedAreaBlocks.length }} / {{ selectedAreaConfig.maxItems }} blocks</span>
      </div>
    </div>

    <!-- No Area Selected -->
    <div v-else class="no-area-selected">
      <p>Select an area to view blocks</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '../utils/logger';
import { ref, computed, onMounted, watch } from 'vue';
import type {
  BlockItem,
  AreaConfig,
  LayoutBlocksOptions,
  UserPermissions
} from '../types';

// Props
interface Props {
  blocks: BlockItem[];
  areas: AreaConfig[];
  selectedArea: string | null;
  options: LayoutBlocksOptions;
  permissions: UserPermissions;
  loading?: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:selectedArea': [area: string | null];
  'move-block': [data: {
    blockId: number;
    fromArea: string;
    toArea: string;
    toIndex: number;
  }];
  'remove-block': [blockId: number];
  'duplicate-block': [blockId: number];
  'update-block': [data: { blockId: number; updates?: any }];
  'add-block': [area?: string];
}>();

// Local State
const draggedBlock = ref<BlockItem | null>(null);

// Lifecycle
onMounted(() => {
  logger.log('🟣 ListView: Mounted');
  logger.log('  - blocks:', props.blocks);
  logger.log('  - areas:', props.areas);
  logger.log('  - selectedArea:', props.selectedArea);
  
  // Auto-select first area if none selected
  if (!props.selectedArea && visibleAreas.value.length > 0) {
    logger.log('🟣 ListView: Auto-selecting first area:', visibleAreas.value[0].id);
    selectArea(visibleAreas.value[0].id);
  }
});



// Computed
const visibleAreas = computed(() => {
  logger.log('🟣 ListView: Computing visible areas');
  logger.log('  - showEmptyAreas:', props.options.showEmptyAreas);
  logger.log('  - areas:', props.areas);
  logger.log('  - blocks:', props.blocks);
  
  if (props.options.showEmptyAreas) {
    return props.areas;
  }
  const filtered = props.areas.filter(area => hasBlocks(area.id));
  logger.log('  - filtered areas:', filtered);
  return filtered;
});

const selectedAreaConfig = computed(() => {
  const config = props.areas.find(a => a.id === props.selectedArea);
  logger.log('🟣 ListView: Selected area config:', config);
  return config;
});

const selectedAreaBlocks = computed(() => {
  if (props.selectedArea === null) {
    // Show all blocks
    logger.log('🟣 ListView: Showing all blocks');
    return [...props.blocks].sort((a, b) => {
      // Sort by area first, then by sort order
      if (a.area !== b.area) {
        return (a.area || '').localeCompare(b.area || '');
      }
      return a.sort - b.sort;
    });
  } else if (props.selectedArea === 'orphaned') {
    // Show blocks in orphaned area
    logger.log('🟣 ListView: Showing orphaned blocks');
    return getAreaBlocks('orphaned');
  } else {
    // Show blocks for specific area
    const blocks = getAreaBlocks(props.selectedArea || '');
    logger.log('🟣 ListView: Selected area blocks:', blocks);
    return blocks;
  }
});

const orphanedBlocks = computed(() => {
  // In the new system, orphaned blocks have area === 'orphaned'
  return props.blocks.filter(block => block.area === 'orphaned');
});

const hasOrphanedArea = computed(() => {
  // Check if orphaned area exists in areas list
  return props.areas.some(a => a.id === 'orphaned');
});

// Watch for when orphaned blocks become empty
watch(orphanedBlocks, (newOrphaned, oldOrphaned) => {
  // If we're currently viewing orphaned blocks and they become empty
  if (props.selectedArea === 'orphaned' && oldOrphaned.length > 0 && newOrphaned.length === 0) {
    logger.log('🟣 ListView: No more orphaned blocks, switching to first available area');
    // Switch to first visible area
    if (visibleAreas.value.length > 0) {
      selectArea(visibleAreas.value[0].id);
    } else {
      selectArea(null); // Show all blocks
    }
  }
});

// Collection icon mapping
const collectionIcons: Record<string, string> = {
  content_headline: 'title',
  content_text: 'text_fields',
  content_image: 'image',
  content_video: 'videocam',
  content_hero: 'landscape',
  content_cta: 'ads_click'
};

// Status options
const statusOptions = [
  { text: 'Published', value: 'published' },
  { text: 'Draft', value: 'draft' },
  { text: 'Archived', value: 'archived' }
];

// Methods
function getAreaBlocks(areaId: string): BlockItem[] {
  logger.log(`🟣 ListView: Getting blocks for area '${areaId}'`);
  const filtered = props.blocks
    .filter(b => b.area === areaId)
    .sort((a, b) => a.sort - b.sort);
  logger.log(`  - Found ${filtered.length} blocks`);
  return filtered;
}

function hasBlocks(areaId: string): boolean {
  const has = props.blocks.some(b => b.area === areaId);
  logger.log(`🟣 ListView: Area '${areaId}' has blocks: ${has}`);
  return has;
}

function selectArea(areaId: string | null) {
  logger.log(`🟣 ListView: Selecting area '${areaId}'`);
  emit('update:selectedArea', areaId);
}

function getAreaTitle(): string {
  if (props.selectedArea === null) {
    return 'All Blocks';
  } else if (props.selectedArea === '_orphaned') {
    return 'Orphaned Blocks';
  }
  return selectedAreaConfig.value?.label || props.selectedArea || 'Unknown Area';
}

function getAreaForBlock(block: BlockItem): AreaConfig | undefined {
  return props.areas.find(a => a.id === block.area);
}

function getAreaChipStyle(block: BlockItem) {
  const area = getAreaForBlock(block);
  if (!area?.color) return {};
  
  return {
    backgroundColor: `${area.color}20`,
    borderColor: area.color,
    color: area.color
  };
}

function getAreaProgress(area: AreaConfig): number {
  if (!area.maxItems) return 0;
  return (getAreaBlocks(area.id).length / area.maxItems) * 100;
}

function getBlockIcon(block: BlockItem): string {
  return collectionIcons[block.collection] || 'widgets';
}

function getBlockTitle(block: BlockItem): string {
  const item = block.item;
  if (!item) return `Block #${block.id}`;

  return item.title || 
         item.name || 
         item.headline || 
         item.label ||
         `${getCollectionLabel(block)} #${block.id}`;
}

function getBlockSubtitle(block: BlockItem): string | null {
  const item = block.item;
  if (!item) return null;

  return item.subtitle || 
         item.description || 
         item.excerpt ||
         null;
}

function getCollectionLabel(block: BlockItem): string {
  return block.collection
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^Content /, '');
}

function confirmRemove(blockId: number) {
  if (confirm('Are you sure you want to remove this block?')) {
    emit('remove-block', blockId);
  }
}

function updateBlockStatus(block: BlockItem, newStatus: string) {
  if (!block.item) return;
  
  logger.log('🟣 ListView: Updating block status', block.id, 'to', newStatus);
  
  // Emit update event with status change
  emit('update-block', { 
    blockId: block.id, 
    updates: { 
      status: newStatus 
    } 
  });
}

function getStatusLabel(status?: string): string {
  const s = statusOptions.find(opt => opt.value === (status || 'draft'));
  return s ? s.text : 'Draft';
}

// Drag & Drop
function handleDragStart(event: DragEvent, block: BlockItem) {
  draggedBlock.value = block;
  event.dataTransfer!.effectAllowed = 'move';
  event.dataTransfer!.setData('block-id', block.id.toString());
  event.dataTransfer!.setData('block-area', block.area || '');
  
  // Add dragging class to body and row
  document.body.classList.add('dragging-block');
  const row = (event.target as HTMLElement).closest('.block-row');
  if (row) {
    row.classList.add('dragging');
  }
  
  // Create custom drag image
  const dragImage = createDragImage(block);
  event.dataTransfer!.setDragImage(dragImage, 10, 10);
  
  // Remove the drag image after a short delay
  setTimeout(() => {
    dragImage.remove();
  }, 0);
}

function createDragImage(block: BlockItem): HTMLElement {
  const dragImage = document.createElement('div');
  dragImage.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    background: var(--background-page);
    border: 2px solid var(--primary);
    border-radius: var(--border-radius);
    padding: 12px 16px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    font-family: var(--font-family);
    font-size: 14px;
    font-weight: 600;
    color: var(--foreground-normal);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
    pointer-events: none;
  `;
  
  // Add icon
  const icon = document.createElement('span');
  icon.innerHTML = '📦';
  dragImage.appendChild(icon);
  
  // Add title
  const title = document.createElement('span');
  title.textContent = getBlockTitle(block);
  dragImage.appendChild(title);
  
  document.body.appendChild(dragImage);
  return dragImage;
}

function handleDragEnd(event: DragEvent) {
  draggedBlock.value = null;
  
  // Remove dragging class from body
  document.body.classList.remove('dragging-block');
  
  // Remove dragging class from row
  const row = (event.target as HTMLElement).closest('.block-row');
  if (row) {
    row.classList.remove('dragging');
  }
}

function handleAreaDragOver(event: DragEvent) {
  if (!draggedBlock.value) return;
  
  const targetElement = event.currentTarget as HTMLElement;
  const targetAreaId = targetElement.getAttribute('data-area-id') || '';
  
  // Get the area config
  const targetArea = props.areas.find(a => a.id === targetAreaId);
  if (!targetArea) return;
  
  // Check if we can drop in this area
  const canDrop = canDropInArea(draggedBlock.value, targetArea);
  
  if (canDrop) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    targetElement.classList.add('drag-hover');
    targetElement.classList.remove('drag-not-allowed');
  } else {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'none';
    targetElement.classList.add('drag-not-allowed');
    targetElement.classList.remove('drag-hover');
  }
}

function handleAreaDragLeave(event: DragEvent) {
  // Remove hover classes
  const targetElement = event.currentTarget as HTMLElement;
  targetElement.classList.remove('drag-hover');
  targetElement.classList.remove('drag-not-allowed');
}

function handleAreaDrop(event: DragEvent, targetAreaId: string) {
  event.preventDefault();
  
  // Remove hover classes
  const targetElement = event.currentTarget as HTMLElement;
  targetElement.classList.remove('drag-hover');
  targetElement.classList.remove('drag-not-allowed');
  
  if (!draggedBlock.value) return;
  
  // Get the area config
  const targetArea = props.areas.find(a => a.id === targetAreaId);
  if (!targetArea) return;
  
  // Check if we can drop in this area
  if (!canDropInArea(draggedBlock.value, targetArea)) {
    logger.log('🟣 ListView: Cannot drop block in area:', targetAreaId);
    return;
  }
  
  const blockId = parseInt(event.dataTransfer!.getData('block-id'));
  const sourceArea = draggedBlock.value.area;
  
  // Don't do anything if dropping on same area
  if (sourceArea === targetAreaId) return;
  
  logger.log('🟣 ListView: Dropping block', blockId, 'from', sourceArea, 'to', targetAreaId);
  
  // Check if this is the last orphaned block
  const isLastOrphanedBlock = props.selectedArea === 'orphaned' && orphanedBlocks.value.length === 1;
  
  // Emit move event
  emit('move-block', {
    blockId: blockId,
    fromArea: sourceArea,
    toArea: targetAreaId,
    toIndex: 999 // Put at end of target area
  });
  
  // If it was the last orphaned block, switch to the target area
  if (isLastOrphanedBlock) {
    logger.log('🟣 ListView: Last orphaned block moved, switching to area:', targetAreaId);
    selectArea(targetAreaId);
  }
  
  draggedBlock.value = null;
}

function canDropInArea(block: BlockItem, area: AreaConfig): boolean {
  // Never allow dropping into orphaned area
  if (area.id === 'orphaned') {
    return false;
  }
  
  // Check if area is locked
  if (area.locked) {
    return false;
  }
  
  // Check max items
  if (area.maxItems) {
    const currentCount = getAreaBlocks(area.id).length;
    const isSameArea = block.area === area.id;
    
    if (!isSameArea && currentCount >= area.maxItems) {
      return false;
    }
  }

  // Check allowed types
  if (area.allowedTypes && area.allowedTypes.length > 0) {
    if (!area.allowedTypes.includes(block.collection)) {
      return false;
    }
  }

  return true;
}
</script>

<style lang="scss" scoped>
.layout-blocks-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.area-tabs {
  display: flex;
  gap: 2px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-normal);
  overflow-x: auto;
  align-items: center;

  .area-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 10px;
    background: var(--background-normal);
    border: 1px solid var(--border-normal);
    border-radius: var(--border-radius);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;

    &:hover {
      background: var(--background-normal-alt);
    }

    &.active {
      background: var(--primary);
      color: var(--foreground-inverted);
      border-color: var(--primary);

      .v-chip {
        background: var(--primary-alt);
        color: var(--foreground-inverted);
      }
    }

    &.has-blocks:not(.active) {
      font-weight: 600;
    }
    
    &.orphaned {
      .v-chip.warning {
        background: var(--warning-25);
        color: var(--warning);
      }
    }
    
    &.drag-hover {
      background: var(--primary-25);
      border-color: var(--primary);
    }
    
    &.drag-not-allowed {
      cursor: not-allowed;
      background: var(--danger-10);
      border-color: var(--danger);
      opacity: 0.7;
    }
  }

  .add-button {
    margin-left: auto;
  }
}

.area-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 16px;
}


.blocks-list {
  flex: 1;
  overflow: auto;
  padding: 0;
  
  .blocks-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--border-subdued);
    border-radius: var(--border-radius);
    overflow: hidden;
    
    thead {
      position: sticky;
      top: 0;
      background: var(--background-normal-alt);
      z-index: 1;
      
      tr {
        border-bottom: 2px solid var(--border-normal);
      }
      
      th {
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        font-size: 12px;
        color: var(--foreground-subdued);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-right: 1px solid var(--border-subdued);
        
        &:last-child {
          border-right: none;
        }
        
        .header-with-icon {
          display: flex;
          align-items: center;
          gap: 6px;
          
          .v-icon {
            color: var(--foreground-subdued);
          }
        }
      }
    }
    
    tbody {
      tr.block-row {
        border-bottom: 1px solid var(--border-subdued);
        transition: background-color 0.2s;
        
        &:last-child {
          border-bottom: none;
        }
        
        &:hover {
          td {
            background-color: var(--background-normal-alt);
          }
        }
        
        td {
          padding: 12px 16px;
          vertical-align: middle;
          border-right: 1px solid var(--border-subdued);
          background: var(--background-page);
          
          &:last-child {
            border-right: none;
          }
          
          &.drag-cell {
            padding: 8px;
            background: var(--background-normal);
          }
          
          &.icon-cell {
            color: var(--foreground-subdued);
            padding: 8px;
            background: var(--background-normal);
          }
          
          &.title-cell {
            font-size: 14px;
          }
          
          &.type-cell {
            .v-chip {
              font-size: 12px;
            }
          }
          
          &.actions-cell {
            padding: 8px 16px;
          }
          
          &.area-cell {
            .v-chip {
              border: 1px solid transparent;
              font-size: 12px;
              
              &.orphaned-chip {
                background: var(--warning-25);
                color: var(--warning);
                border-color: var(--warning);
              }
            }
          }
        }
      }
    }
  }
  
  .drag-handle {
    cursor: grab;
    color: var(--foreground-subdued);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    
    &:hover {
      color: var(--foreground-normal);
    }
    
    &:active {
      cursor: grabbing;
    }
  }

  .block-title-cell {
    .subtitle {
      font-size: 12px;
      color: var(--foreground-subdued);
      margin-top: 4px;
    }
  }

  .status-cell {
    .status-display {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: var(--border-radius);
      font-size: 13px;
      transition: background-color 0.2s;
      
      &.clickable {
        cursor: pointer;
        
        &:hover {
          background-color: var(--background-normal-alt);
        }
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--foreground-subdued);
        flex-shrink: 0;

        &.status-published {
          background: var(--success);
        }

        &.status-draft {
          background: var(--warning);
        }
        
        &.status-archived {
          background: var(--foreground-subdued);
        }
      }
      
      .status-text {
        color: var(--foreground-normal);
      }
    }
  }

  .actions-wrapper {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
    
    .danger {
      --v-button-background-color-hover: var(--danger-10);
      --v-button-color-hover: var(--danger);
    }
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--foreground-subdued);

  p {
    margin: 0;
  }
}

.area-footer {
  padding: 16px;
  border-top: 1px solid var(--border-subdued);
  display: flex;
  align-items: center;
  gap: 16px;

  span {
    font-size: 14px;
    color: var(--foreground-subdued);
  }
}

.no-area-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--foreground-subdued);
}
</style>

<style lang="scss">
// Status dropdown list styling
.v-list {
  .v-list-item-icon {
    margin-right: 12px;
    min-width: 20px;
    display: flex;
    align-items: center;
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--foreground-subdued);

      &.status-published {
        background: var(--success);
      }

      &.status-draft {
        background: var(--warning);
      }
      
      &.status-archived {
        background: var(--foreground-subdued);
      }
    }
  }
}

// Global styles for drag state
body.dragging-block {
  .area-tab {
    transition: all 0.2s ease;
    
    &:not(.active) {
      border-style: dashed;
    }
  }
  
  // Highlight the dragged block
  .block-row {
    &.dragging {
      opacity: 0.5;
      background-color: var(--primary-25) !important;
      border-color: var(--primary) !important;
      box-shadow: 0 2px 8px var(--primary-25);
    }
  }
}
</style>