<template>
  <div class="layout-blocks-grid-view" :class="{ 'compact': options.compactMode }">
    <div class="grid-container">
      <div
        v-for="area in visibleAreas"
        :key="area.id"
        class="grid-area"
        :class="{
          'selected': selectedArea === area.id,
          'empty': !hasBlocks(area.id),
          'locked': area.locked,
          'drag-over': dragOverArea === area.id
        }"
        :style="getAreaStyle(area)"
        @click="selectArea(area.id)"
        @dragover="handleDragOver($event, area)"
        @drop="handleDrop($event, area)"
        @dragleave="handleDragLeave"
      >
        <!-- Area Header -->
        <div class="area-header">
          <div class="area-title">
            <v-icon v-if="area.icon" :name="area.icon" small />
            <span>{{ area.label }}</span>
          </div>
          <div class="area-actions">
            <v-chip v-if="getAreaBlocks(area.id).length > 0" small>
              {{ getAreaBlocks(area.id).length }}
            </v-chip>
            <AddBlockDropdown
              v-if="!area.locked && permissions.create"
              :area="area.id"
              :allowed-collections="allowedCollections"
              size="x-small"
              variant="secondary"
              @create-block="$emit('create-quick', $event)"
              @open-selector="$emit('open-selector', $event)"
            />
          </div>
        </div>

        <!-- Area Content -->
        <div class="area-content">
          <transition-group
            v-if="getAreaBlocks(area.id).length > 0"
            name="block-list"
            tag="div"
            class="blocks-container"
          >
            <block-item-component
              v-for="(block, index) in getAreaBlocks(area.id)"
              :key="block.id"
              :block="block"
              :index="index"
              :area="area"
              :compact="options.compactMode"
              :permissions="permissions"
              :draggable="options.enableDragDrop && (!area.locked || area.id === 'orphaned')"
              @edit="$emit('update-block', { blockId: block.id })"
              @remove="$emit('remove-block', block.id)"
              @unlink="$emit('unlink-block', block.id)"
              @delete="$emit('delete-block', block.id, $event)"
              @duplicate="$emit('duplicate-block', block.id)"
              @update-status="handleBlockStatusUpdate(block, $event)"
              @dragstart="handleDragStart($event, block, area)"
              @dragend="handleDragEnd"
            />
          </transition-group>

          <!-- Empty State -->
          <div v-else class="area-empty">
            <v-icon name="inbox" large />
            <p>{{ area.locked ? 'Area is locked' : 'No blocks in this area' }}</p>
            <AddBlockDropdown
              v-if="!area.locked && permissions.create"
              :area="area.id"
              :allowed-collections="allowedCollections"
              size="small"
              variant="secondary"
              @create-block="$emit('create-quick', $event)"
              @open-selector="$emit('open-selector', $event)"
            />
          </div>
        </div>

        <!-- Area Footer -->
        <div v-if="area.maxItems" class="area-footer">
          <v-progress-linear
            :model-value="getAreaProgress(area)"
            :color="getAreaProgress(area) >= 100 ? 'danger' : 'primary'"
            rounded
          />
          <span class="area-limit">
            {{ getAreaBlocks(area.id).length }} / {{ area.maxItems }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { logger } from '../utils/logger';
import { ref, computed } from 'vue';
import AddBlockDropdown from './AddBlockDropdown.vue';
import type {
  BlockItem,
  BlockId,
  AreaConfig,
  LayoutBlocksOptions,
  UserPermissions
} from '../types';
import BlockItemComponent from './BlockItem.vue';

// Props
interface Props {
  blocks: BlockItem[];
  areas: AreaConfig[];
  selectedArea: string | null;
  options: LayoutBlocksOptions;
  permissions: UserPermissions;
  loading?: boolean;
  allowedCollections?: string[] | null;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:selectedArea': [area: string | null];
  'move-block': [data: {
    blockId: BlockId;
    fromArea: string;
    toArea: string;
    toIndex: number;
  }];
  'remove-block': [blockId: BlockId];
  'unlink-block': [blockId: BlockId];
  'delete-block': [blockId: BlockId, deleteContent: boolean];
  'update-block': [data: { blockId: BlockId }];
  'duplicate-block': [blockId: BlockId];
  'add-block': [area?: string];
  'create-quick': [data: { area: string; collection: string }];
  'open-selector': [data: { area: string; collection: string }];
}>();

// Local State
const draggedBlock = ref<BlockItem | null>(null);
const draggedFromArea = ref<AreaConfig | null>(null);
const dragOverArea = ref<string | null>(null);

// Computed
const visibleAreas = computed(() => {
  if (props.options.showEmptyAreas) {
    return props.areas;
  }
  
  return props.areas.filter(area => 
    hasBlocks(area.id) || area.id === props.selectedArea
  );
});

// Methods
function getAreaBlocks(areaId: string): BlockItem[] {
  return props.blocks
    .filter(b => b.area === areaId)
    .sort((a, b) => a.sort - b.sort);
}

function hasBlocks(areaId: string): boolean {
  return props.blocks.some(b => b.area === areaId);
}

function getAreaProgress(area: AreaConfig): number {
  if (!area.maxItems) return 0;
  return (getAreaBlocks(area.id).length / area.maxItems) * 100;
}

function getAreaStyle(area: AreaConfig): any {
  const style: any = {};
  
  if (area.color) {
    style['--area-color'] = area.color;
  }
  
  // Apply width if specified
  if (area.width && area.width > 0 && area.width <= 100) {
    if (area.width === 100) {
      // Full width areas
      style.width = '100%';
      style.flexBasis = '100%';
    } else if (area.width === 50) {
      // Half width - account for gap
      style.width = 'calc(50% - 8px)';
      style.flexBasis = 'calc(50% - 8px)';
    } else if (area.width === 33 || area.width === 33.33) {
      // Third width
      style.width = 'calc(33.333% - 11px)';
      style.flexBasis = 'calc(33.333% - 11px)';
    } else if (area.width === 25) {
      // Quarter width
      style.width = 'calc(25% - 12px)';
      style.flexBasis = 'calc(25% - 12px)';
    } else {
      // Custom width
      const gapAdjustment = (100 - area.width) / 100 * 16;
      style.width = `calc(${area.width}% - ${gapAdjustment}px)`;
      style.flexBasis = `calc(${area.width}% - ${gapAdjustment}px)`;
    }
  } else {
    // Default full width
    style.width = '100%';
    style.flexBasis = '100%';
  }
  
  return style;
}

function selectArea(areaId: string) {
  emit('update:selectedArea', 
    props.selectedArea === areaId ? null : areaId
  );
}

function handleBlockStatusUpdate(block: BlockItem, newStatus: string) {
  logger.log('🟢 GridView: Updating block status', block.id, 'to', newStatus);
  
  emit('update-block', { 
    blockId: block.id, 
    updates: { 
      status: newStatus 
    } 
  });
}


// Drag & Drop
function handleDragStart(event: DragEvent, block: BlockItem, area: AreaConfig) {
  // Allow dragging from orphaned area even if it's locked
  if (!props.options.enableDragDrop || (area.locked && area.id !== 'orphaned')) {
    event.preventDefault();
    return;
  }

  draggedBlock.value = block;
  draggedFromArea.value = area;
  
  // Set drag data
  event.dataTransfer!.effectAllowed = 'move';
  event.dataTransfer!.setData('block-id', block.id.toString());
  
  // Add dragging class to the block element
  const blockElement = (event.target as HTMLElement).closest('.block-item');
  if (blockElement) {
    blockElement.classList.add('dragging');
  }
  
  // Add dragging class to body for global styles
  document.body.classList.add('dragging-block');
  
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
    background: var(--theme--background);
    border: 2px solid var(--theme--primary);
    border-radius: var(--theme--border-radius);
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    font-family: var(--theme--fonts--sans--font-family);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 200px;
    z-index: 9999;
    pointer-events: none;
  `;
  
  // Add header with icon
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
    color: var(--theme--foreground);
  `;
  
  const icon = document.createElement('span');
  icon.innerHTML = '📦';
  header.appendChild(icon);
  
  const title = document.createElement('span');
  title.textContent = getBlockTitle(block);
  header.appendChild(title);
  
  dragImage.appendChild(header);
  
  // Add collection type
  const meta = document.createElement('div');
  meta.style.cssText = `
    font-size: 12px;
    color: var(--theme--foreground-subdued);
  `;
  meta.textContent = getCollectionLabel(block);
  dragImage.appendChild(meta);
  
  document.body.appendChild(dragImage);
  return dragImage;
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

function getCollectionLabel(block: BlockItem): string {
  return block.collection
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^Content /, '');
}

function handleDragEnd(event: DragEvent) {
  // Remove dragging class from the block element
  const blockElement = (event.target as HTMLElement).closest('.block-item');
  if (blockElement) {
    blockElement.classList.remove('dragging');
  }
  
  // Remove dragging class from body
  document.body.classList.remove('dragging-block');
  
  // Reset drag state
  draggedBlock.value = null;
  draggedFromArea.value = null;
  dragOverArea.value = null;
}

function handleDragOver(event: DragEvent, area: AreaConfig) {
  const areaElement = event.currentTarget as HTMLElement;
  
  // Don't allow dropping into orphaned area
  if (!draggedBlock.value || area.id === 'orphaned') {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'none';
    areaElement.classList.add('drag-not-allowed');
    areaElement.classList.remove('drag-over');
    dragOverArea.value = null;
    return;
  }
  
  // Allow dropping into other locked areas if they aren't orphaned
  if (area.locked && area.id !== 'orphaned') {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'none';
    areaElement.classList.add('drag-not-allowed');
    areaElement.classList.remove('drag-over');
    dragOverArea.value = null;
    return;
  }

  // Check if can drop in this area
  if (!canDropInArea(draggedBlock.value, area)) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'none';
    areaElement.classList.add('drag-not-allowed');
    areaElement.classList.remove('drag-over');
    dragOverArea.value = null;
    return;
  }

  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  areaElement.classList.remove('drag-not-allowed');
  areaElement.classList.add('drag-over');
  dragOverArea.value = area.id;
}

function handleDragLeave(event: DragEvent) {
  const areaElement = event.currentTarget as HTMLElement;
  areaElement.classList.remove('drag-not-allowed');
  areaElement.classList.remove('drag-over');
  dragOverArea.value = null;
}

function handleDrop(event: DragEvent, targetArea: AreaConfig) {
  event.preventDefault();
  
  // Don't allow dropping into orphaned area
  if (!draggedBlock.value || !draggedFromArea.value || targetArea.id === 'orphaned') {
    return;
  }
  
  // Allow dropping into other areas if they aren't orphaned
  if (targetArea.locked && targetArea.id !== 'orphaned') {
    return;
  }

  // Calculate drop index
  const dropTarget = event.target as HTMLElement;
  const blockElement = dropTarget.closest('.block-item');
  let dropIndex = getAreaBlocks(targetArea.id).length;
  
  if (blockElement) {
    // Compare as strings: temporary (unsaved) blocks carry string ids, so
    // parseInt would yield NaN and break drop-targeting (see fix #40/#42).
    const targetBlockId = blockElement.getAttribute('data-block-id') || '';
    const targetBlock = props.blocks.find(b => String(b.id) === targetBlockId);
    if (targetBlock) {
      dropIndex = getAreaBlocks(targetArea.id).indexOf(targetBlock);
    }
  }

  // Emit move event
  emit('move-block', {
    blockId: draggedBlock.value.id,
    fromArea: draggedFromArea.value.id,
    toArea: targetArea.id,
    toIndex: dropIndex
  });

  // Reset drag state
  dragOverArea.value = null;
}

function canDropInArea(block: BlockItem, area: AreaConfig): boolean {
  // Never allow dropping into orphaned area
  if (area.id === 'orphaned') {
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

// Add handler for add block button
function handleAddBlock(areaId: string) {
  logger.log('🟠 GridView: Add block clicked for area:', areaId);
  logger.log('🟠 Current permissions:', props.permissions);
  logger.log('🟠 Area config:', props.areas.find(a => a.id === areaId));
  logger.log('🟠 Current blocks in area:', getAreaBlocks(areaId));
  emit('add-block', areaId);
}
</script>

<style lang="scss" scoped>
.layout-blocks-grid-view {
  height: 100%;
  display: flex;
  position: relative;

  &.compact {
    .grid-area {
      min-height: 150px;
    }

    .area-header {
      padding: 8px;
    }

    .area-content {
      padding: 8px;
    }
  }
}

.grid-container {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 0;
  overflow-y: auto;
  align-content: flex-start;
  align-items: stretch; /* Make all areas same height in a row */
  justify-content: flex-start;
}

.grid-area {
  background: var(--theme--background-subdued);
  border: 1px solid black; /* Always visible subtle border */
  border-radius: var(--theme--border-radius);
  display: flex;
  flex-direction: column;
  min-height: 200px;
  transition: all 0.2s;
  cursor: pointer;
  flex: 0 0 auto; /* Don't grow or shrink, use width from style */
  min-width: 200px; /* Smaller minimum */
  box-sizing: border-box;
  margin-bottom: 0px; /* For wrapping */
  position: relative;
  outline: 1px solid var(--theme--border-color-subdued); /* Double border effect */
  outline-offset: -2px;

  &:hover {
    border-color: var(--theme--border-color);
    background: var(--theme--background-normal);
    outline-color: var(--theme--border-color);
  }

  &.selected {
    border-color: var(--theme--primary);
    outline-color: var(--theme--primary);
    outline-width: 2px;
    background: var(--theme--primary-background);
  }

  &.locked {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &.drag-over {
    border-color: var(--theme--primary);
    outline-color: var(--theme--primary-subdued);
    outline-width: 2px;
    background: var(--theme--primary-background);
  }

  &.empty:not(.drag-over) {
    .area-content {
      opacity: 0.7;
    }
    
    .empty-state {
      color: var(--theme--foreground-subdued);
    }
  }

  &.drag-not-allowed {
    cursor: not-allowed;
    background: var(--theme--danger-background);
    border-color: var(--theme--danger);
    outline-color: var(--theme--danger);
    opacity: 0.7;
  }
}

.area-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 2px solid var(--theme--border-color);
  background: var(--theme--background-accent);
  border-radius: calc(var(--theme--border-radius) - 2px) calc(var(--theme--border-radius) - 2px) 0 0;
  min-height: 48px;

  .area-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme--foreground);
    
    .v-icon {
      color: var(--theme--foreground-subdued);
    }
  }

  .area-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.area-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  overflow-x: hidden;
}

.blocks-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.area-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  text-align: center;
  color: var(--theme--foreground-subdued);

  p {
    margin: 8px 0 16px;
    font-size: 14px;
  }
}

.area-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--theme--border-color-subdued);
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--theme--background-normal);
  border-radius: 0 0 var(--theme--border-radius) var(--theme--border-radius);

  .area-limit {
    font-size: 12px;
    color: var(--theme--foreground-subdued);
  }
}


/* Transitions */
.block-list-move,
.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.3s ease;
}

.block-list-enter-from,
.block-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.block-list-leave-active {
  position: absolute;
  width: 100%;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Drag styles */
.dragging {
  opacity: 0.5;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
}

:deep(.sortable-drag) {
  opacity: 0;
}
</style>

<style lang="scss">
// Global styles for drag state.
// The drop hint is drawn as an absolutely-positioned overlay rather than a
// border, so it never changes the header box height. A border would reflow the
// content below it, and since drag-over toggles continuously while the pointer
// moves, that made the blocks jump by the border width.
body.dragging-block {
  .grid-area:not(.drag-over) .area-header::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    border-bottom: 2px dashed var(--theme--primary);
    pointer-events: none;
  }
}
</style>