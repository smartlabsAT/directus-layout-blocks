<template>
  <div ref="rootEl" class="layout-blocks-list-view">
    <!-- Area Tabs (radiogroup: ←/→ moves between tabs, roving tabindex) -->
    <div class="area-tabs" role="radiogroup" aria-label="Areas">
      <!-- All Blocks Tab -->
      <button
        class="area-tab"
        role="radio"
        data-tab-id="all"
        :aria-checked="selectedArea === null"
        :tabindex="selectedArea === null ? 0 : -1"
        :class="{
          active: selectedArea === null,
          'has-blocks': true
        }"
        @click="selectArea(null)"
        @keydown="handleTabKeydown($event, null)"
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
        role="radio"
        :data-tab-id="area.id"
        :aria-checked="selectedArea === area.id"
        :tabindex="selectedArea === area.id ? 0 : -1"
        :class="{
          active: selectedArea === area.id,
          'has-blocks': hasBlocks(area.id),
          'orphaned': area.id === 'orphaned'
        }"
        :data-area-id="area.id"
        @click="selectArea(area.id)"
        @keydown="handleTabKeydown($event, area.id)"
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
      
      <AddBlockDropdown
        v-if="permissions.create && selectedArea"
        :area="selectedArea"
        :allowed-collections="allowedCollections"
        size="small"
        variant="secondary"
        @create-block="$emit('create-quick', $event)"
        @open-selector="$emit('open-selector', $event)"
      />
    </div>

    <!-- Selected Area Content -->
    <div v-if="selectedArea !== undefined" class="area-content">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="loading-skeleton">
        <v-skeleton-loader
          v-for="n in SKELETON_ROWS"
          :key="n"
          type="block-list-item"
        />
      </div>

      <!-- Blocks List -->
      <div v-else-if="selectedAreaBlocks.length > 0" class="blocks-list">
        <table class="blocks-table" role="grid">
          <thead>
            <tr role="row">
              <th v-if="options.enableDragDrop && (!selectedAreaConfig?.locked || selectedArea === 'orphaned')" role="columnheader" style="width: 40px"></th>
              <th role="columnheader" style="width: 40px"></th>
              <th role="columnheader">
                <div class="header-with-icon">
                  <v-icon name="title" small />
                  <span>Title</span>
                </div>
              </th>
              <th role="columnheader" style="width: 20%">
                <div class="header-with-icon">
                  <v-icon name="category" small />
                  <span>Type</span>
                </div>
              </th>
              <th role="columnheader" style="width: 15%">
                <div class="header-with-icon">
                  <v-icon name="check_circle" small />
                  <span>Status</span>
                </div>
              </th>
              <th v-if="selectedArea === null || selectedArea === 'orphaned'" role="columnheader" style="width: 15%">
                <div class="header-with-icon">
                  <v-icon name="dashboard" small />
                  <span>Area</span>
                </div>
              </th>
              <th role="columnheader" style="width: 120px; text-align: right">
                <div class="header-with-icon" style="justify-content: flex-end">
                  <v-icon name="settings" small />
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="block in selectedAreaBlocks"
              :key="block.id"
              class="block-row"
              :class="{ 'kb-grabbed': kbIsGrabbed(block.id) }"
              role="row"
            >
              <td v-if="options.enableDragDrop && (!selectedAreaConfig?.locked || selectedArea === 'orphaned')" role="gridcell" class="drag-cell">
                <div
                  class="drag-handle"
                  role="button"
                  tabindex="0"
                  aria-roledescription="sortable"
                  :aria-label="`Reorder ${getBlockTitle(block)}`"
                  :data-block-id="block.id"
                  :draggable="true"
                  @dragstart="handleDragStart($event, block)"
                  @dragend="handleDragEnd"
                  @keydown="handleBlockKeydown($event, block)"
                >
                  <v-icon name="drag_handle" />
                </div>
              </td>
              
              <td role="gridcell" class="icon-cell">
                <v-icon :name="getBlockIcon(block)" />
              </td>
              
              <td role="gridcell" class="title-cell">
                <div class="block-title-cell">
                  <strong>{{ getBlockTitle(block) }}</strong>
                  <div v-if="getBlockSubtitle(block)" class="subtitle">
                    {{ getBlockSubtitle(block) }}
                  </div>
                </div>
              </td>
              
              <td role="gridcell" class="type-cell">
                <v-chip small>{{ getCollectionLabel(block) }}</v-chip>
              </td>
              
              <td role="gridcell" class="status-cell">
                <status-selector
                  v-if="block.item"
                  :status="block.item.status"
                  :editable="permissions.update"
                  @update:status="updateBlockStatus(block, $event)"
                />
              </td>
              
              <td v-if="selectedArea === null || selectedArea === 'orphaned'" role="gridcell" class="area-cell">
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
              
              <td role="gridcell" class="actions-cell">
                <div class="actions-wrapper">
                  <v-button
                    v-if="permissions.update"
                    v-tooltip="'Edit'"
                    v-btn-aria="{ 'aria-label': 'Edit block' }"
                    icon
                    x-small
                    secondary
                    @click="$emit('update-block', { blockId: block.id })"
                  >
                    <v-icon name="edit" />
                  </v-button>

                  <v-button
                    v-if="permissions.create"
                    v-tooltip="'Duplicate'"
                    v-btn-aria="{ 'aria-label': 'Duplicate block' }"
                    icon
                    x-small
                    secondary
                    @click="$emit('duplicate-block', block.id)"
                  >
                    <v-icon name="content_copy" />
                  </v-button>

                  <v-button
                    v-if="permissions.delete"
                    v-tooltip="'Remove'"
                    v-btn-aria="{ 'aria-label': 'Remove block' }"
                    icon
                    x-small
                    secondary
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
      <EmptyState
        v-else
        icon="inbox"
        :message="`No blocks in ${selectedAreaConfig?.label ?? 'this area'}`"
        :show-action="permissions.create && !selectedAreaConfig?.locked"
        action-label="Add First Block"
        @action="$emit('add-block', selectedArea ?? undefined)"
      />

      <!-- Area Footer with Limit -->
      <div v-if="selectedAreaConfig?.maxItems" class="area-footer">
        <v-progress-linear
          :value="getAreaProgress(selectedAreaConfig)"
          :style="{ '--v-progress-linear-color': getAreaProgress(selectedAreaConfig) >= 100 ? 'var(--theme--danger)' : 'var(--theme--primary)' }"
        />
        <span>{{ selectedAreaBlocks.length }} / {{ selectedAreaConfig.maxItems }} blocks</span>
      </div>
    </div>

    <!-- No Area Selected -->
    <div v-else class="no-area-selected">
      <p>Select an area to view blocks</p>
    </div>

    <!-- Visually-hidden live region: announces keyboard drag & drop steps. -->
    <div class="lb-sr-only" role="status" aria-live="polite">{{ kbAnnouncement }}</div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '../utils/logger';
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import AddBlockDropdown from './AddBlockDropdown.vue';
import StatusSelector from './StatusSelector.vue';
import EmptyState from './EmptyState.vue';
import { createDragImage } from '../utils/blockHelpers';
import { useKeyboardDnd } from '../composables/useKeyboardDnd';
import { vBtnAria } from '../directives/btnAria';
import type {
  BlockItem,
  BlockId,
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
  'duplicate-block': [blockId: BlockId];
  'update-block': [data: { blockId: BlockId; updates?: any }];
  'add-block': [area?: string];
  'create-quick': [data: { area: string; collection: string }];
  'open-selector': [data: { area: string; collection: string }];
}>();

// Local State
const draggedBlock = ref<BlockItem | null>(null);

// Root element, used to scope keyboard-focus lookups (re-focusing a row's grab
// handle after a move re-renders the table).
const rootEl = ref<HTMLElement | null>(null);

// Number of placeholder rows shown while blocks are loading
const SKELETON_ROWS = 5;

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

// Keyboard drag & drop (KEYBOARD_AND_A11Y.md §3): the row's drag handle is the
// grab target. ListView shows one area at a time, so onAreaChange follows the
// block to keep it visible (and focusable) when it crosses to another area.
/* Re-assert focus after the row re-render settles (mirrors GridView). */
const FOCUS_SETTLE_MS = 380;

function focusBlock(blockId: BlockId): void {
  /* When a block crosses areas the table re-renders (ListView follows via
     onAreaChange), so the row's grab handle may not exist on the first tick.
     Focus immediately if present, and re-assert once the re-render settled. */
  const tryFocus = () => {
    const el = rootEl.value?.querySelector(
      `.drag-handle[data-block-id="${CSS.escape(String(blockId))}"]`
    ) as HTMLElement | null;
    el?.focus();
  };
  nextTick(tryFocus);
  setTimeout(tryFocus, FOCUS_SETTLE_MS);
}

const {
  announcement: kbAnnouncement,
  isGrabbed: kbIsGrabbed,
  handleBlockKeydown,
} = useKeyboardDnd({
  areas: visibleAreas,
  getAreaBlocks,
  canDrop: canDropInArea,
  emitMove: (payload) => emit('move-block', payload),
  enabled: () => !!props.options.enableDragDrop,
  getTitle: getBlockTitle,
  focusBlock,
  navOrder: () => selectedAreaBlocks.value.map((b) => b.id),
  onAreaChange: (areaId) => selectArea(areaId),
});

// Area tabs form a radiogroup (a11y §2): the ordered tab ids, left → right
// ("All Blocks" is represented by null).
const tabOrder = computed<(string | null)[]>(() => [null, ...visibleAreas.value.map((a) => a.id)]);

function handleTabKeydown(event: KeyboardEvent, currentId: string | null): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const order = tabOrder.value;
  const i = order.findIndex((id) => id === currentId);
  if (i === -1) return;
  const dir = event.key === 'ArrowLeft' ? -1 : 1;
  const next = order[(i + dir + order.length) % order.length];
  selectArea(next);
  nextTick(() => {
    const sel = next === null ? 'all' : CSS.escape(String(next));
    const el = rootEl.value?.querySelector(`.area-tab[data-tab-id="${sel}"]`);
    (el as HTMLElement | null)?.focus();
  });
}

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
         item.heading ||
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
  
  // Create custom drag image (clone the dragged row's rendered icon so the glyph shows)
  const sourceIcon = row?.querySelector('.icon-cell .v-icon') ?? null;
  const dragImage = createDragImage(block, sourceIcon);
  event.dataTransfer!.setDragImage(dragImage, 10, 10);
  
  // Remove the drag image after a short delay
  setTimeout(() => {
    dragImage.remove();
  }, 0);
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
  
  // Keep the id as a string: temporary (unsaved) blocks have string ids and
  // parseInt would yield NaN, breaking the move (see fix #40/#42).
  const blockId = event.dataTransfer!.getData('block-id');
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
  border-bottom: 1px solid var(--theme--border-color);
  overflow-x: auto;
  align-items: center;

  .area-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--theme--foreground-subdued);
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.2s, border-color 0.2s;

    &:hover {
      color: var(--theme--foreground);
    }

    /* Keyboard focus ring (a11y §1). */
    &:focus-visible {
      outline: 2px solid var(--theme--primary);
      outline-offset: -2px;
    }

    /* Segmented look: active tab = primary text + a 2px underline indicator
       (no filled background, so the legacy --foreground-inverted token is gone). */
    &.active {
      color: var(--theme--primary);
      border-bottom-color: var(--theme--primary);
    }

    &.has-blocks:not(.active) {
      font-weight: 600;
    }

    &.orphaned {
      .v-chip.warning {
        background: var(--theme--warning-background);
        color: var(--theme--warning);
      }
    }

    &.drag-hover {
      color: var(--theme--primary);
      border-bottom-color: var(--theme--primary);
      background: var(--theme--primary-background);
    }

    &.drag-not-allowed {
      cursor: not-allowed;
      color: var(--theme--danger);
      border-bottom-color: var(--theme--danger);
      background: var(--theme--danger-background);
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

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}


.blocks-list {
  flex: 1;
  overflow: auto;
  padding: 0;
  
  .blocks-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--theme--border-color-subdued);
    border-radius: var(--theme--border-radius);
    overflow: hidden;
    
    thead {
      position: sticky;
      top: 0;
      background: var(--theme--background-subdued);
      z-index: 1;

      tr {
        border-bottom: 1px solid var(--theme--border-color-subdued);
      }
      
      th {
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        font-size: 12px;
        color: var(--theme--foreground-subdued);
        border-right: 1px solid var(--theme--border-color-subdued);
        
        &:last-child {
          border-right: none;
        }
        
        .header-with-icon {
          display: flex;
          align-items: center;
          gap: 6px;
          
          .v-icon {
            color: var(--theme--foreground-subdued);
          }
        }
      }
    }
    
    tbody {
      tr.block-row {
        border-bottom: 1px solid var(--theme--border-color-subdued);
        transition: background-color 0.2s;
        
        &:last-child {
          border-bottom: none;
        }
        
        &:hover {
          td {
            background-color: var(--theme--background-normal);
          }
        }
        
        td {
          padding: 12px 16px;
          vertical-align: middle;
          border-right: 1px solid var(--theme--border-color-subdued);
          background: var(--theme--background);
          
          &:last-child {
            border-right: none;
          }
          
          &.drag-cell {
            padding: 8px;
            background: var(--theme--background-normal);
          }
          
          &.icon-cell {
            color: var(--theme--foreground-subdued);
            padding: 8px;
            background: var(--theme--background-normal);
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
                background: var(--theme--warning-background);
                color: var(--theme--warning);
                border-color: var(--theme--warning);
              }
            }
          }
        }
      }
    }
  }
  
  .drag-handle {
    cursor: grab;
    color: var(--theme--foreground-subdued);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: var(--theme--border-radius);

    &:hover {
      color: var(--theme--foreground);
    }

    /* Keyboard focus ring (a11y §1) — the handle is the keyboard grab target. */
    &:focus-visible {
      outline: 2px solid var(--theme--primary);
      outline-offset: 2px;
      color: var(--theme--foreground);
    }

    &:active {
      cursor: grabbing;
    }
  }

  .block-title-cell {
    .subtitle {
      font-size: 12px;
      color: var(--theme--foreground-subdued);
      margin-top: 4px;
    }
  }

  .actions-wrapper {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
    
    .danger {
      --v-button-background-color-hover: var(--theme--danger-background);
      --v-button-color-hover: var(--theme--danger);
    }
  }
}

.area-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--theme--border-color-subdued);
  display: flex;
  align-items: center;
  gap: 16px;

  .v-progress-linear {
    flex: 1;
  }

  span {
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 12px;
    color: var(--theme--foreground-subdued);
    font-variant-numeric: tabular-nums;
  }
}

.no-area-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme--foreground-subdued);
}

/* Keyboard-grabbed row highlight (a11y §3) — mirrors the pointer .dragging look.
   Full path so it out-specifies the base `td` background. */
.blocks-list .blocks-table tbody tr.block-row.kb-grabbed td {
  background-color: var(--theme--primary-background);
}

/* Visually-hidden live region (a11y §3). */
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

/* Reduced motion (a11y §5). */
@media (prefers-reduced-motion: reduce) {
  .area-tab,
  .block-row td {
    transition: none;
  }
}
</style>

<style lang="scss">
// Global styles for drag state
body.dragging-block {
  .area-tab {
    transition: all 0.2s ease;

    // Use an outline (does not affect layout) instead of changing the border
    // style. A border change revealed a hidden border width and grew the tab,
    // reflowing the content and making the blocks jump while dragging.
    &:not(.active) {
      outline: 2px dashed var(--theme--primary);
      outline-offset: -2px;
    }
  }
  
  // Highlight the dragged block
  .block-row {
    &.dragging {
      opacity: 0.5;
      background-color: var(--theme--primary-background) !important;
      border-color: var(--theme--primary) !important;
    }
  }
}
</style>