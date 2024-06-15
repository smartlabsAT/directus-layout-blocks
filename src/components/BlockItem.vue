<template>
  <div
    class="block-item"
    :class="{
      'compact': compact,
      'draggable': draggable,
      'selected': isSelected
    }"
    :data-block-id="block.id"
    :draggable="draggable"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <!-- Block Icon/Type Indicator -->
    <div class="block-icon">
      <v-icon 
        :name="getBlockIcon(block)" 
        :color="getBlockColor()"
      />
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
        <template #activator="{ toggle }">
          <v-button
            v-tooltip="'Options'"
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
            class="danger"
            @click="confirmRemove"
          >
            <v-list-item-icon>
              <v-icon name="delete" />
            </v-list-item-icon>
            <v-list-item-content>Remove</v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { BlockItem, AreaConfig, UserPermissions } from '../types';
import { getBlockIcon, getBlockTitle, getBlockSubtitle, getCollectionLabel } from '../utils/blockHelpers';
import StatusSelector from './StatusSelector.vue';

// Props
interface Props {
  block: BlockItem;
  index: number;
  area: AreaConfig;
  compact?: boolean;
  permissions: UserPermissions;
  draggable?: boolean;
  selected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  draggable: true,
  selected: false
});

// Emits
const emit = defineEmits<{
  edit: [];
  remove: [];
  duplicate: [];
  click: [];
  'update-status': [status: string];
}>();

// State
const isSelected = ref(props.selected);

// Computed
const hasActions = computed(() => {
  return props.permissions.update || 
         props.permissions.delete || 
         props.permissions.create;
});

// Methods
function getBlockColor(): string {
  // You can implement custom color logic here
  return '--foreground-normal';
}

function handleClick() {
  isSelected.value = !isSelected.value;
  emit('click');
}

function handleDoubleClick() {
  // Emit edit event on double click
  emit('edit');
}

function confirmRemove() {
  if (confirm('Are you sure you want to remove this block?')) {
    emit('remove');
  }
}

function updateStatus(status: string) {
  emit('update-status', status);
}
</script>

<style lang="scss" scoped>
.block-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--background-normal);
  border: 1px solid var(--border-normal);
  border-radius: var(--border-radius);
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;

  &:hover {
    border-color: var(--border-normal-alt);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.selected {
    border-color: var(--primary);
    background: var(--primary-alt);
  }

  &.draggable {
    cursor: move;
  }

  &.compact {
    padding: 8px;

    .block-content {
      .block-title {
        font-size: 13px;
      }
    }
  }
  
  &.dragging {
    opacity: 0.5;
    background-color: var(--primary-25);
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
    transform: scale(0.98);
    cursor: grabbing !important;
  }
}

.block-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-normal-alt);
  border-radius: var(--border-radius);
}

.block-content {
  flex: 1;
  min-width: 0;

  .block-title {
    font-weight: 600;
    color: var(--foreground-normal);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .block-subtitle {
    font-size: 13px;
    color: var(--foreground-subdued);
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
}

:deep(.v-list-item.danger) {
  --v-list-item-color: var(--danger);
  --v-list-item-color-hover: var(--danger);
  --v-list-item-icon-color: var(--danger);
}

:deep(.v-list) {
  .v-list-item-icon {
    margin-right: 12px;
    min-width: 20px;
    display: flex;
    align-items: center;
  }
}
</style>