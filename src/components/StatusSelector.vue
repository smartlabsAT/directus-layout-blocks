<template>
  <v-menu
    v-if="editable"
    show-arrow
    placement="bottom"
    :close-on-content-click="true"
  >
    <template #activator="{ toggle, active }">
      <div 
        class="status-display"
        :class="{ clickable: editable }"
        @click="editable && toggle()"
      >
        <span class="status-dot" :class="`status-${status || 'draft'}`" />
        <span class="status-text">{{ getStatusLabel(status) }}</span>
      </div>
    </template>
    
    <v-list>
      <v-list-item
        v-for="option in STATUS_OPTIONS"
        :key="option.value"
        clickable
        :active="(status || 'draft') === option.value"
        @click="$emit('update:status', option.value)"
      >
        <v-list-item-icon>
          <span class="status-dot" :class="`status-${option.value}`" />
        </v-list-item-icon>
        <v-list-item-content>{{ option.text }}</v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
  
  <div v-else class="status-display">
    <span class="status-dot" :class="`status-${status || 'draft'}`" />
    <span class="status-text">{{ getStatusLabel(status) }}</span>
  </div>
</template>

<script setup lang="ts">
import { STATUS_OPTIONS } from '../utils/constants';
import { getStatusLabel } from '../utils/blockHelpers';

interface Props {
  status?: string;
  editable?: boolean;
}

withDefaults(defineProps<Props>(), {
  editable: true
});

defineEmits<{
  'update:status': [status: string];
}>();
</script>

<style lang="scss" scoped>
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
</style>

<style lang="scss">
// Global styles for status dropdown
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
</style>