<template>
  <div ref="rootEl" class="layout-blocks-grid-view" :class="{ 'compact': options.compactMode }">
    <div class="grid-container">
      <div
        v-for="area in visibleAreas"
        :key="area.id"
        :data-area-id="area.id"
        class="grid-area"
        :class="{
          'selected': selectedArea === area.id,
          'empty': !hasBlocks(area.id),
          'locked': area.locked,
          'drag-over': dragOverArea === area.id
        }"
        :style="getAreaStyle(area)"
        role="group"
        :aria-label="area.label"
        tabindex="0"
        @click="selectArea(area.id)"
        @keydown.self.enter.prevent.stop="selectArea(area.id)"
        @keydown.self.space.prevent.stop="selectArea(area.id)"
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
          <!-- Loading Skeleton (mirrors the list view's per-area loading) -->
          <div v-if="loading" class="area-skeleton">
            <v-skeleton-loader
              v-for="n in SKELETON_ROWS"
              :key="n"
              type="block-list-item"
            />
          </div>

          <transition-group
            v-else-if="getAreaBlocks(area.id).length > 0"
            name="block-list"
            tag="div"
            class="blocks-container"
            role="list"
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
              :grabbed="isBlockGrabbed(block.id)"
              @edit="$emit('update-block', { blockId: block.id })"
              @remove="$emit('remove-block', block.id)"
              @unlink="$emit('unlink-block', block.id)"
              @delete="$emit('delete-block', block.id, $event)"
              @duplicate="$emit('duplicate-block', block.id)"
              @update-status="handleBlockStatusUpdate(block, $event)"
              @dragstart="handleDragStart($event, block, area)"
              @dragend="handleDragEnd"
              @keydown="handleBlockKeydown($event, block)"
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
            :value="getAreaProgress(area)"
            :style="{ '--v-progress-linear-color': getAreaProgress(area) >= 100 ? 'var(--theme--danger)' : 'var(--theme--primary)' }"
            rounded
          />
          <span class="area-limit">
            {{ getAreaBlocks(area.id).length }} / {{ area.maxItems }}
          </span>
        </div>
      </div>
    </div>

    <!-- Visually-hidden live region: announces keyboard drag & drop steps. -->
    <div class="lb-sr-only" role="status" aria-live="polite">{{ kbAnnouncement }}</div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '../utils/logger';
import { ref, computed, watch, nextTick } from 'vue';
import AddBlockDropdown from './AddBlockDropdown.vue';
import type {
  BlockItem,
  BlockId,
  AreaConfig,
  LayoutBlocksOptions,
  UserPermissions
} from '../types';
import BlockItemComponent from './BlockItem.vue';
import { createDragImage, getBlockTitle } from '../utils/blockHelpers';
import { useKeyboardDnd } from '../composables/useKeyboardDnd';

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

// Number of skeleton placeholders shown per area while blocks are loading.
const SKELETON_ROWS = 3;

// Root element, used to scope the "jump to area" scroll lookup.
const rootEl = ref<HTMLElement | null>(null);

// Delay before the "jump to area" scroll. The toolbar area selector is a v-menu;
// selecting an item closes it and returns focus to the activator, which makes the
// browser briefly scroll the page back up. Deferring past that focus-return lets
// the jump stick. (The sticky toolbar keeps the selector reachable, but does not
// by itself cancel the focus-return scroll.)
const AREA_JUMP_SCROLL_DELAY_MS = 300;

// "Jump to area": when an area becomes selected, scroll its card up. block:'start'
// + the card's scroll-margin-top land it just below the sticky toolbar.
watch(() => props.selectedArea, (areaId) => {
  if (!areaId) return;
  setTimeout(() => {
    const cards = rootEl.value?.querySelectorAll('[data-area-id]');
    const el = cards && Array.from(cards).find(c => c.getAttribute('data-area-id') === areaId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, AREA_JUMP_SCROLL_DELAY_MS);
});

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

// Keyboard drag & drop (KEYBOARD_AND_A11Y.md §3) — the focused block card itself
// is the grab target (no separate handle in the grid). Reuses the very same
// canDropInArea predicate as the pointer path so the rules stay identical.
function focusBlock(blockId: BlockId): void {
  nextTick(() => {
    const el = rootEl.value?.querySelector(`[data-block-id="${CSS.escape(String(blockId))}"]`);
    (el as HTMLElement | null)?.focus();
  });
}

const {
  announcement: kbAnnouncement,
  isGrabbed: isBlockGrabbed,
  handleBlockKeydown,
} = useKeyboardDnd({
  areas: visibleAreas,
  getAreaBlocks,
  canDrop: canDropInArea,
  emitMove: (payload) => emit('move-block', payload),
  enabled: () => !!props.options.enableDragDrop,
  getTitle: (block) => getBlockTitle(block),
  focusBlock,
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
  
  // Create custom drag image (clone the rendered collection icon so the glyph shows)
  const sourceIcon = document.querySelector(
    `.block-item[data-block-id=${CSS.escape(String(block.id))}] .block-icon .v-icon`
  );
  const dragImage = createDragImage(block, sourceIcon);
  event.dataTransfer!.setDragImage(dragImage, 10, 10);
  
  // Remove the drag image after a short delay
  setTimeout(() => {
    dragImage.remove();
  }, 0);
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
  // dragleave also fires when the pointer moves onto a child element (a block, the
  // header). Only clear the drag state when the pointer is actually outside the area
  // bounds — otherwise .drag-over rapidly toggles and the drop-zone highlight
  // flickers as the cursor moves over the blocks inside the area. (relatedTarget is
  // unreliable during native DnD, so check the pointer position against the rect.)
  const rect = areaElement.getBoundingClientRect();
  if (
    event.clientX >= rect.left && event.clientX <= rect.right &&
    event.clientY >= rect.top && event.clientY <= rect.bottom
  ) {
    return;
  }
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

  // Locked areas are not valid drop targets. ListView already enforced this;
  // GridView's pointer handlers checked it separately, but folding it in here
  // keeps a single source of truth that the keyboard DnD engine reuses too.
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
@use '../styles/theme' as theme;

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
  @include theme.recessed-surface; /* bg-subdued + 1px token border + radius (replaces the old hardcoded black border) */
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
  /* Offset the "jump to area" scroll target below both sticky bars: Directus'
     header-bar (--header-bar-height) + our own toolbar (--lb-toolbar-height, set
     from its measured height in interface.vue) + a small gap. */
  scroll-margin-top: calc(var(--header-bar-height, 61px) + var(--lb-toolbar-height, 78px) + 8px);

  &:hover {
    border-color: var(--theme--border-color-accent);
  }

  /* Keyboard focus ring (a11y §1) — keyboard-only via :focus-visible. */
  &:focus-visible {
    outline: 2px solid var(--theme--form--field--input--focus-ring-color);
    outline-offset: 2px;
  }

  &.selected {
    border-color: var(--theme--primary);
    background: var(--theme--primary-background);
  }

  &.locked {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &.drag-over {
    @include theme.drop-zone-valid;
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
    @include theme.drop-zone-invalid;
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.area-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: var(--theme--border-width) solid var(--theme--border-color);
  background: var(--theme--background-accent);
  border-radius: var(--theme--border-radius) var(--theme--border-radius) 0 0;
  min-height: 48px;

  .area-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--theme--fonts--title--font-family);
    font-weight: 600;
    font-size: 13px;
    color: var(--theme--foreground-accent);

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

.area-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
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

  .v-progress-linear {
    flex: 1;
  }

  .area-limit {
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 12px;
    color: var(--theme--foreground-subdued);
    font-variant-numeric: tabular-nums;
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

/* Visually-hidden live region (a11y §3): off-screen but readable by AT. */
.lb-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Reduced motion (a11y §5): drop entrance/move/drag animations; keep function. */
@media (prefers-reduced-motion: reduce) {
  .grid-area {
    transition: none;
  }

  .block-list-move,
  .block-list-enter-active,
  .block-list-leave-active,
  .slide-enter-active,
  .slide-leave-active {
    transition: none;
  }

  .block-list-enter-from,
  .block-list-leave-to {
    transform: none;
  }
}
</style>
