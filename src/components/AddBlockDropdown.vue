<template>
  <div class="add-block-dropdown">
    <v-menu placement="bottom-start" show-arrow>
      <template #activator="{ toggle }">
        <v-button
          v-tooltip="'Create new block'"
          icon
          :small="size === 'small'"
          :x-small="size === 'x-small'"
          :secondary="variant === 'secondary'"
          rounded
          @click="toggle"
        >
          <v-icon name="add" :small="size === 'x-small'" />
        </v-button>
      </template>

      <v-list>
        <v-list-item
          v-for="collection in availableCollections"
          :key="collection.value"
          clickable
          @click="handleCreateNew(collection.value)"
        >
          <v-list-item-icon>
            <v-icon :name="collection.icon || 'widgets'" />
          </v-list-item-icon>
          <v-list-item-content>{{ collection.label }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-menu placement="bottom-start" show-arrow>
      <template #activator="{ toggle }">
        <v-button
          v-tooltip="'Link or duplicate existing'"
          icon
          :small="size === 'small'"
          :x-small="size === 'x-small'"
          :secondary="variant === 'secondary'"
          rounded
          @click="toggle"
        >
          <v-icon name="link" :small="size === 'x-small'" />
        </v-button>
      </template>

      <v-list>
        <v-list-item
          v-for="collection in availableCollections"
          :key="collection.value"
          clickable
          @click="handleOpenSelector(collection.value)"
        >
          <v-list-item-icon>
            <v-icon :name="collection.icon || 'widgets'" />
          </v-list-item-icon>
          <v-list-item-content>{{ collection.label }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { logger } from '../utils/logger';
import { COLLECTION_META } from '../utils/constants';
import { getCollectionLabel, getCollectionIcon } from '../utils/blockHelpers';

interface Props {
  area: string;
  allowedCollections?: string[] | null;
  size?: 'small' | 'x-small';
  variant?: 'primary' | 'secondary';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  variant: 'secondary'
});

const emit = defineEmits<{
  'create-block': [data: { area: string; collection: string }];
  'open-selector': [data: { area: string; collection: string }];
}>();

const availableCollections = computed(() => {
  const collections = Array.isArray(props.allowedCollections) && props.allowedCollections.length > 0
    ? props.allowedCollections
    : Object.keys(COLLECTION_META);

  return collections.map(collection => ({
    value: collection,
    label: COLLECTION_META[collection]?.label ?? getCollectionLabel(collection),
    icon: getCollectionIcon(collection),
    description: COLLECTION_META[collection]?.description
  }));
});

function handleCreateNew(collection: string) {
  logger.log('🟢 AddBlockDropdown: Creating new block', { area: props.area, collection });
  emit('create-block', {
    area: props.area,
    collection
  });
}

function handleOpenSelector(collection: string) {
  logger.log('🔵 AddBlockDropdown: Opening item selector', { area: props.area, collection });
  emit('open-selector', {
    area: props.area,
    collection
  });
}
</script>

<style lang="scss" scoped>
.add-block-dropdown {
  display: inline-flex;
  gap: 0.25rem;
}
</style>