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
          <v-list-item-content>
            <v-list-item-text>{{ collection.label }}</v-list-item-text>
            <v-list-item-hint v-if="collection.description">
              {{ collection.description }}
            </v-list-item-hint>
          </v-list-item-content>
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
          <v-list-item-content>
            <v-list-item-text>{{ collection.label }}</v-list-item-text>
            <v-list-item-hint v-if="collection.description">
              {{ collection.description }}
            </v-list-item-hint>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { logger } from '../utils/logger';

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

// Collection metadata
const collectionInfo: Record<string, any> = {
  content_headline: {
    icon: 'title',
    label: 'Headline',
    description: 'Title or heading text'
  },
  content_text: {
    icon: 'text_fields',
    label: 'Text Block',
    description: 'Rich text content'
  },
  content_image: {
    icon: 'image',
    label: 'Image',
    description: 'Image with caption'
  },
  content_video: {
    icon: 'videocam',
    label: 'Video',
    description: 'Embedded video'
  },
  content_cta: {
    icon: 'ads_click',
    label: 'Call to Action',
    description: 'Button or action link'
  },
  content_button: {
    icon: 'smart_button',
    label: 'Button',
    description: 'Simple button element'
  },
  content_wysiwig: {
    icon: 'edit_note',
    label: 'Rich Text',
    description: 'WYSIWYG editor content'
  },
  content_block: {
    icon: 'widgets',
    label: 'Generic Block',
    description: 'Flexible content block'
  }
};

const availableCollections = computed(() => {
  let collections: string[] = [];
  
  if (props.allowedCollections === null) {
    // Use all collections
    collections = Object.keys(collectionInfo);
  } else if (Array.isArray(props.allowedCollections) && props.allowedCollections.length > 0) {
    collections = props.allowedCollections;
  } else {
    // Default collections
    collections = Object.keys(collectionInfo);
  }
  
  return collections.map(collection => ({
    value: collection,
    label: collectionInfo[collection]?.label || 
      collection.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: collectionInfo[collection]?.icon || 'widgets',
    description: collectionInfo[collection]?.description
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
  gap: 4px;
}
</style>