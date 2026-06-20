<template>
  <div
    class="block-item"
    :class="{
      'compact': compact,
      'draggable': draggable,
      'dragging': grabbed,
      'expanded': expanded
    }"
    :data-block-id="block.id"
    :draggable="draggable"
    role="listitem"
    tabindex="0"
    :aria-roledescription="draggable ? 'sortable' : undefined"
    :aria-expanded="inlineEdit ? expanded : undefined"
    :aria-controls="inlineEdit && expanded ? `lb-inline-editor-${block.id}` : undefined"
    v-bind="$attrs"
    @click.stop="handleClick"
    @dblclick="handleDoubleClick"
  >
    <!-- Block Icon/Type Indicator -->
    <div class="block-icon">
      <v-icon 
        :name="getBlockIcon(block)" 
        :color="getBlockColor()"
      />
      <block-dirty-dot v-if="isDirty" :is-new="isNewBlock" />
    </div>

    <!-- Block Content -->
    <div class="block-content">
      <div class="block-title">
        {{ getBlockTitle(block) }}
      </div>
      <div v-if="!compact && getBlockSubtitle(block)" class="block-subtitle">
        {{ getBlockSubtitle(block) }}
      </div>
      <div v-if="!compact" class="block-meta">
        <v-chip x-small>{{ getCollectionLabel(block.collection) }}</v-chip>
        <status-selector
          v-if="block.item"
          :status="block.item.status"
          :editable="permissions.update"
          @update:status="updateStatus"
        />
      </div>
    </div>

    <!-- Block Actions -->
    <div class="block-actions">
      <v-menu 
        v-if="hasActions"
        show-arrow
        placement="bottom-end"
      >
        <template #activator="{ toggle, active }">
          <v-button
            v-tooltip="'Options'"
            v-btn-aria="{ 'aria-label': 'Block options', 'aria-haspopup': 'menu', 'aria-expanded': active }"
            icon
            x-small
            secondary
            @click.stop="toggle"
          >
            <v-icon name="more_vert" />
          </v-button>
        </template>

        <v-list>
          <v-list-item
            v-if="permissions.update"
            clickable
            @click="$emit('edit')"
          >
            <v-list-item-icon>
              <v-icon name="edit" />
            </v-list-item-icon>
            <v-list-item-content>Edit</v-list-item-content>
          </v-list-item>

          <v-list-item
            v-if="permissions.update && isDirty && !isNewBlock"
            clickable
            @click="$emit('revert')"
          >
            <v-list-item-icon>
              <v-icon name="undo" />
            </v-list-item-icon>
            <v-list-item-content>Revert changes</v-list-item-content>
          </v-list-item>

          <v-list-item
            v-if="permissions.create"
            clickable
            @click="$emit('duplicate')"
          >
            <v-list-item-icon>
              <v-icon name="content_copy" />
            </v-list-item-icon>
            <v-list-item-content>Duplicate</v-list-item-content>
          </v-list-item>

          <v-divider v-if="permissions.delete" />

          <v-list-item
            v-if="permissions.delete"
            clickable
            @click="showDeleteDialog = true"
          >
            <v-list-item-icon>
              <v-icon name="link_off" />
            </v-list-item-icon>
            <v-list-item-content>
              <div>Unassign from this page</div>
              <div class="list-item-subtitle">The item stays in its collection and on other pages</div>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            v-if="permissions.delete && canDeleteContent"
            clickable
            class="danger"
            @click="showDeleteDialog = true"
          >
            <v-list-item-icon>
              <v-icon name="delete" />
            </v-list-item-icon>
            <v-list-item-content>
              <div>Delete everywhere</div>
              <div class="list-item-subtitle">Permanently delete the item and all references</div>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  <delete-confirmation-dialog
    v-model="showDeleteDialog"
    :block-title="getBlockTitle(block)"
    :can-delete="canDeleteContent"
    :loading="deleteLoading"
    @confirm="handleDeleteConfirm"
    @cancel="showDeleteDialog = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { vBtnAria } from '../directives/btnAria';
import type { BlockItem, AreaConfig, UserPermissions } from '../types';
import { getBlockIcon, getBlockTitle, getBlockSubtitle, getCollectionLabel } from '../utils/blockHelpers';
import { isTempId } from '../utils/helpers';
import StatusSelector from './StatusSelector.vue';
import DeleteConfirmationDialog from './DeleteConfirmationDialog.vue';
import BlockDirtyDot from './BlockDirtyDot.vue';

// This component has multiple root nodes (the block element + the delete dialog),
// so Vue cannot auto-inherit fallthrough listeners. Without this, the parent's
// @dragstart / @dragend listeners were silently dropped and drag-and-drop never
// started. Disable auto-inherit and bind $attrs explicitly on the draggable root.
defineOptions({ inheritAttrs: false });

// Props
interface Props {
  block: BlockItem;
  index: number;
  area: AreaConfig;
  compact?: boolean;
  permissions: UserPermissions;
  draggable?: boolean;
  /** True while this block is held in keyboard drag mode (a11y §3). */
  grabbed?: boolean;
  /** Inline edit mode: a single click toggles the inline editor. */
  inlineEdit?: boolean;
  /** True when this block's inline editor is open (single-open accordion). */
  expanded?: boolean;
  /** Block has staged, unsaved changes pending the global Save. */
  isDirty?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  draggable: true,
  grabbed: false,
  inlineEdit: false,
  expanded: false,
  isDirty: false
});

// New/temp block (green dot) vs edited existing block (primary dot).
const isNewBlock = computed(() => isTempId(props.block.id));

// Emits
const emit = defineEmits<{
  edit: [];
  remove: [];
  unlink: [];
  delete: [deleteContent: boolean];
  duplicate: [];
  click: [];
  'update-status': [status: string];
  revert: [];
}>();

// State
const showDeleteDialog = ref(false);
const deleteLoading = ref(false);

// Computed
const hasActions = computed(() => {
  return props.permissions.update || 
         props.permissions.delete || 
         props.permissions.create;
});

const canDeleteContent = computed(() => {
  // Check if user has permission to delete content items
  return props.permissions.delete && props.block.item !== null;
});

// Methods
function getBlockColor(): string {
  // You can implement custom color logic here
  return 'var(--theme--foreground)';
}

function handleClick() {
  // Inline mode: a single click toggles the inline editor (parent owns the
  // single-open accordion via editingBlockId). Drawer mode keeps select-on-click.
  if (props.inlineEdit) {
    emit('edit');
  } else {
    emit('click');
  }
}

function handleDoubleClick() {
  // Emit edit event on double click
  emit('edit');
}

function handleDeleteConfirm(options: { deleteContent: boolean }) {
  deleteLoading.value = true;
  
  if (options.deleteContent) {
    emit('delete', true);
  } else {
    emit('unlink');
  }
  
  // Reset state
  setTimeout(() => {
    showDeleteDialog.value = false;
    deleteLoading.value = false;
  }, 100);
}

function updateStatus(status: string) {
  emit('update-status', status);
}
</script>

<style lang="scss" scoped>
/* Card-surface + interactive-state values are inlined here (not via the shared
   _theme.scss mixins) on purpose. In this extension's build
   (`directus-extension build`), a rule whose declarations come from an SCSS
   `@include` compiles to an UN-scoped global selector (verified: GridView's
   `@include theme.recessed-surface` emits a global `.grid-area {}` in dist).
   That is harmless for unique class names, but `.block-item` collides with the
   sibling `expandable-blocks` extension's own global `.block-item` rules (legacy
   vars, some `!important`) that would otherwise wipe the card border/background.
   Inlining keeps these declarations scoped (`[data-v]`) so they out-specify the
   sibling. Trade-off: the values duplicate #48's card-surface / interactive-
   states mixins — keep them in sync if those tokens change. */
.block-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.75rem;
  background: var(--theme--background);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;

  &:hover {
    border-color: var(--theme--border-color-accent);
    background: var(--theme--background-normal);
  }

  /* Keyboard focus ring (a11y §1) — keyboard-only via :focus-visible. */
  &:focus-visible {
    outline: 2px solid var(--theme--primary);
    outline-offset: 2px;
  }

  &.draggable {
    cursor: move;
  }

  &.compact {
    padding: 0.5rem;

    .block-content {
      .block-title {
        font-size: 13px;
      }
    }

    .block-icon {
      width: 32px;
      height: 32px;
    }
  }

  &.dragging {
    opacity: 0.5;
    border-style: dashed;
    cursor: grabbing !important;
  }

  /* Active card whose inline editor is open (matches .grid-area.selected). */
  &.expanded {
    border-color: var(--theme--primary);
    background: var(--theme--primary-background);
  }
}

.block-icon {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
}

.block-content {
  flex: 1;
  min-width: 0;

  .block-title {
    font-family: var(--theme--fonts--title--font-family);
    font-weight: 600;
    color: var(--theme--foreground-accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .block-subtitle {
    font-size: 13px;
    color: var(--theme--foreground-subdued);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 4px;
  }

  .block-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
}

.block-actions {
  flex-shrink: 0;
  margin-left: auto;
  position: relative;
}

:deep(.v-list-item.danger) {
  --v-list-item-color: var(--theme--danger);
  --v-list-item-color-hover: var(--theme--danger);
  --v-list-item-icon-color: var(--theme--danger);
}

:deep(.v-list) {
  .v-list-item-icon {
    margin-right: 12px;
    min-width: 20px;
    display: flex;
    align-items: center;
  }
}

.list-item-subtitle {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  margin-top: 2px;
}

/* Reduced motion (a11y §5): no card transitions when the user opts out. */
@media (prefers-reduced-motion: reduce) {
  .block-item {
    transition: none;
  }
}
</style>