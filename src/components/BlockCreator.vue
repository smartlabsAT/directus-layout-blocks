<template>
  <div class="block-creator">
    <div class="creator-header">
      <h3>{{ headerTitle }}</h3>
      <p>{{ headerDescription }}</p>
    </div>

    <div class="creator-content">
      <!-- Step 1: Select Area -->
      <div v-if="currentStep === 1" class="creator-step">
        <label>Select Area</label>
        <v-select
          :model-value="localArea"
          @update:model-value="handleAreaSelection"
          :items="availableAreas"
          item-text="label"
          item-value="id"
          placeholder="Choose an area..."
        >
          <template #prepend-inner>
            <v-icon name="dashboard_customize" />
          </template>
          <template #item="{ item }">
            <div class="area-option">
              <v-icon v-if="item.icon" :name="item.icon" small />
              <span>{{ item.label }}</span>
              <v-chip v-if="item.maxItems" x-small>
                {{ getAreaBlockCount(item.id) }} / {{ item.maxItems }}
              </v-chip>
            </div>
          </template>
        </v-select>
      </div>

      <!-- Step 2: Select Collection -->
      <div v-if="currentStep === 2" class="creator-step">
        <label>Choose Block Type</label>
        <div class="block-type-grid">
          <div
            v-for="collection in availableCollections"
            :key="collection.value"
            class="block-type-tile"
            :class="{ 'selected': selectedCollection === collection.value }"
            @click="selectCollection(collection.value)"
          >
            <div class="tile-icon">
              <v-icon :name="getCollectionIcon(collection.value)" large />
            </div>
            <div class="tile-content">
              <div class="tile-title">{{ collection.text }}</div>
              <div v-if="collection.description" class="tile-description">
                {{ collection.description }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Choose Action -->
      <div v-if="currentStep === 3" class="creator-step">
        <label>Choose Action</label>
        <div class="action-list">
          <div class="action-item" @click="selectAction('create')">
            <div class="action-icon">
              <v-icon name="add" />
            </div>
            <div class="action-content">
              <div class="action-title">Create New Item</div>
              <div class="action-description">Start with a blank item</div>
            </div>
            <v-icon name="chevron_right" />
          </div>
          
          <div class="action-item" @click="selectAction('link')">
            <div class="action-icon">
              <v-icon name="link" />
            </div>
            <div class="action-content">
              <div class="action-title">Link Existing Item</div>
              <div class="action-description">Reference an existing content item</div>
            </div>
            <v-icon name="chevron_right" />
          </div>
          
          <div class="action-item" @click="selectAction('duplicate')">
            <div class="action-icon">
              <v-icon name="content_copy" />
            </div>
            <div class="action-content">
              <div class="action-title">Duplicate Existing Item</div>
              <div class="action-description">Create a copy of an existing item</div>
            </div>
            <v-icon name="chevron_right" />
          </div>
        </div>
      </div>
    </div>

    <div class="creator-footer">
      <v-button v-if="currentStep > 1" secondary @click="goBack">
        Back
      </v-button>
      <v-button secondary @click="$emit('cancel')">
        Cancel
      </v-button>
    </div>

    <!-- ItemSelector Drawer (Teleported to body) -->
    <Teleport to="body">
      <ItemSelectorDrawer
        v-if="showItemSelector"
        :open="showItemSelector"
        :collection="selectedCollection"
        :collection-name="getCollectionLabel(selectedCollection)"
        :collection-icon="getCollectionIcon(selectedCollection)"
        :items="itemSelectorItems"
        :loading="itemSelectorLoading"
        :loading-details="itemSelectorLoadingDetails"
        :current-page="itemSelectorCurrentPage"
        :items-per-page="itemSelectorItemsPerPage"
        :total-items="itemSelectorTotalItems"
        :available-fields="itemSelectorAvailableFields"
        :item-relations="itemSelectorRelations"
        :api-error="itemSelectorError"
        :translation-info="itemSelectorTranslationInfo"
        :selected-language="itemSelectorSelectedLanguage"
        :available-languages="itemSelectorAvailableLanguages"
        :get-translated-field-value="getTranslatedFieldValue"
        :is-field-translatable="isFieldTranslatable"
        :allow-link="selectedAction === 'link'"
        :allow-duplicate="selectedAction === 'duplicate'"
        :sort-field="itemSelectorSortField"
        :sort-direction="itemSelectorSortDirection"
        :logger-prefix="'[LayoutBlocks]'"
        @close="closeItemSelector"
        @confirm="handleItemsLinked"
        @confirm-copy="handleItemsDuplicated"
        @search="handleItemSelectorSearch"
        @update:current-page="handleItemSelectorPageChange"
        @update:selected-language="handleItemSelectorLanguageChange"
        @update:sort="handleItemSelectorSortChange"
        @update:items-per-page="handleItemSelectorItemsPerPageChange"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { logger } from '../utils/logger';
import { ref, computed, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useItemSelector, ItemSelectorDrawer } from 'directus-extension-expandable-blocks/shared';
import type { AreaConfig, JunctionInfo } from '../types';

// Props
interface Props {
  areas: AreaConfig[];
  selectedArea?: string | null;
  allowedCollections?: string[] | null;
  junctionInfo: JunctionInfo | null;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  create: [data: {
    area: string;
    collection: string;
    item: any;
  }];
  link: [data: {
    area: string;
    collection: string;
    items: any[];
  }];
  duplicate: [data: {
    area: string;
    collection: string;
    items: any[];
  }];
  cancel: [];
}>(); 

// State
const api = useApi();
const creating = ref(false);
const localArea = ref(props.selectedArea || '');
const selectedCollection = ref('');
const selectedAction = ref<'create' | 'link' | 'duplicate' | null>(null);
// Start at step 2 if area is already selected, otherwise step 1
const currentStep = ref(props.selectedArea ? 2 : 1);
const showItemSelector = ref(false);
const itemData = ref<Record<string, any>>({});
const collectionFields = ref<any[]>([]);

// ItemSelector state
const itemSelector = useItemSelector(api, [selectedCollection.value], {
  loggerPrefix: '[LayoutBlocks]',
  allowLink: true,
  allowDuplicate: true,
  defaultItemsPerPage: 50
});

// ItemSelector computed properties (proxies to composable)
const itemSelectorItems = computed(() => itemSelector.availableItems.value);
const itemSelectorLoading = computed(() => itemSelector.loading.value);
const itemSelectorLoadingDetails = computed(() => itemSelector.loadingDetails.value);
const itemSelectorCurrentPage = computed(() => itemSelector.currentPage.value);
const itemSelectorItemsPerPage = computed(() => itemSelector.itemsPerPage.value);
const itemSelectorTotalItems = computed(() => itemSelector.totalItems.value);
const itemSelectorAvailableFields = computed(() => itemSelector.availableFields.value);
const itemSelectorRelations = computed(() => itemSelector.itemRelations.value);
const itemSelectorError = computed(() => itemSelector.apiError.value);
const itemSelectorTranslationInfo = computed(() => itemSelector.translationInfo.value);
const itemSelectorSelectedLanguage = computed(() => itemSelector.selectedLanguage.value);
const itemSelectorAvailableLanguages = computed(() => itemSelector.availableLanguages.value);
const itemSelectorSortField = computed(() => itemSelector.sortField.value);
const itemSelectorSortDirection = computed(() => itemSelector.sortDirection.value);

// Collection metadata
const collectionInfo: Record<string, any> = {
  content_headline: {
    icon: 'title',
    label: 'Headline',
    description: 'Title or heading text',
    quickFields: ['headline', 'subheadline']
  },
  content_text: {
    icon: 'text_fields',
    label: 'Text Block',
    description: 'Rich text content',
    quickFields: ['title', 'content']
  },
  content_image: {
    icon: 'image',
    label: 'Image',
    description: 'Image with caption',
    quickFields: ['title', 'alt_text']
  },
  content_video: {
    icon: 'videocam',
    label: 'Video',
    description: 'Embedded video',
    quickFields: ['title', 'video_url']
  },
  content_cta: {
    icon: 'ads_click',
    label: 'Call to Action',
    description: 'Button or action link',
    quickFields: ['title', 'button_text', 'button_link']
  },
  content_button: {
    icon: 'smart_button',
    label: 'Button',
    description: 'Simple button element',
    quickFields: ['button_text', 'button_link']
  },
  content_wysiwig: {
    icon: 'edit_note',
    label: 'WYSIWYG Editor',
    description: 'Visual content editor',
    quickFields: ['content']
  },
  content_block: {
    icon: 'widgets',
    label: 'Custom Block',
    description: 'Generic content block',
    quickFields: ['title', 'content']
  }
};

// Computed
const headerTitle = computed(() => {
  if (currentStep.value === 1) return 'Add New Block';
  if (currentStep.value === 2) return 'Choose Block Type';
  if (currentStep.value === 3) return 'Choose Action';
  return 'Add New Block';
});

const headerDescription = computed(() => {
  if (currentStep.value === 1) return 'Select an area for your new block';
  if (currentStep.value === 2) {
    // Show which area was selected when we skip step 1
    if (props.selectedArea) {
      const area = props.areas.find(a => a.id === props.selectedArea);
      return `Adding to "${area?.label || props.selectedArea}" - Choose a block type`;
    }
    return 'Choose a block type to add';
  }
  if (currentStep.value === 3) return 'How would you like to add this block?';
  return 'Choose a block type to add';
});

const availableAreas = computed(() => {
  return props.areas.filter(area => {
    if (area.locked) return false;
    if (area.maxItems) {
      const count = getAreaBlockCount(area.id);
      if (count >= area.maxItems) return false;
    }
    return true;
  });
});

const availableCollections = computed(() => {
  logger.log('🟤 BlockCreator: Computing available collections...');
  logger.log('🟤 BlockCreator: Allowed collections prop:', props.allowedCollections);
  logger.log('🟤 BlockCreator: Junction info:', props.junctionInfo);
  logger.log('🟤 BlockCreator: Current area:', localArea.value);
  
  let collections: string[] = [];
  
  // If allowedCollections is null, it means use ALL collections
  if (props.allowedCollections === null) {
    logger.log('🟤 BlockCreator: Using all collections from junction info');
    // Get all collections from the M2A field configuration
    // For now, use a hardcoded list of common content collections
    collections = [
      'content_button',
      'content_headline', 
      'content_image',
      'content_wysiwig',
      'content_text',
      'content_video',
      'content_cta',
      'content_block'
    ];
  } else if (Array.isArray(props.allowedCollections) && props.allowedCollections.length > 0) {
    logger.log('🟤 BlockCreator: Using specified allowed collections:', props.allowedCollections);
    collections = props.allowedCollections;
  } else if (props.junctionInfo?.allowedCollections?.length) {
    logger.log('🟤 BlockCreator: Using junction allowed collections:', props.junctionInfo.allowedCollections);
    collections = props.junctionInfo.allowedCollections;
  } else {
    logger.log('🟤 BlockCreator: Using default collections from collectionInfo');
    // Use defaults from collectionInfo
    collections = Object.keys(collectionInfo);
  }
  
  logger.log('🟤 BlockCreator: Collections before area filter:', collections);
  
  // Filter by area allowed types
  const area = props.areas.find(a => a.id === localArea.value);
  if (area?.allowedTypes?.length) {
    logger.log('🟤 BlockCreator: Area has allowed types:', area.allowedTypes);
    collections = collections.filter(c => area.allowedTypes!.includes(c));
  }

  const result = collections.map(collection => ({
    value: collection,
    text: getCollectionLabel(collection),
    description: collectionInfo[collection]?.description
  }));
  
  logger.log('🟤 BlockCreator: Final available collections:', result);
  return result;
});


// Methods
function getAreaBlockCount(areaId: string): number {
  // This would need to be passed from parent or calculated
  return 0;
}

function getCollectionIcon(collection: string): string {
  return collectionInfo[collection]?.icon || 'widgets';
}

function getCollectionLabel(collection: string): string {
  return collectionInfo[collection]?.label || 
    collection.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function handleAreaSelection(areaId: string) {
  logger.log('🟣 BlockCreator: Area selected:', areaId);
  localArea.value = areaId;
  if (areaId) {
    currentStep.value = 2;
  }
}

function selectCollection(collection: string) {
  logger.log('🟣 BlockCreator: Collection selected:', collection);
  selectedCollection.value = collection;
  currentStep.value = 3;
}

function selectAction(action: 'create' | 'link' | 'duplicate') {
  logger.log('🟣 BlockCreator: Action selected:', action);
  selectedAction.value = action;
  
  if (action === 'create') {
    createNewItem();
  } else {
    // Open ItemSelector for link or duplicate
    showItemSelector.value = true;
    itemSelector.open(selectedCollection.value);
  }
}

function goBack() {
  if (currentStep.value === 3) {
    currentStep.value = 2;
    selectedCollection.value = '';
    selectedAction.value = null;
  } else if (currentStep.value === 2) {
    // If area was pre-selected, don't go back to step 1
    if (props.selectedArea) {
      // Just close the dialog
      emit('cancel');
    } else {
      currentStep.value = 1;
      localArea.value = '';
    }
  }
}

function closeItemSelector() {
  showItemSelector.value = false;
  itemSelector.close();
}

function handleItemsLinked(items: any[]) {
  logger.log('🟣 BlockCreator: Linking items:', items);
  
  if (items.length > 0) {
    emit('link', {
      area: localArea.value,
      collection: selectedCollection.value,
      items: items
    });
    
    // Close both ItemSelector and BlockCreator
    closeItemSelector();
    emit('cancel');
  } else {
    closeItemSelector();
  }
}

function handleItemsDuplicated(items: any[]) {
  logger.log('🟣 BlockCreator: Duplicating items:', items);
  
  if (items.length > 0) {
    emit('duplicate', {
      area: localArea.value,
      collection: selectedCollection.value,
      items: items
    });
    
    // Close both ItemSelector and BlockCreator
    closeItemSelector();
    emit('cancel');
  } else {
    closeItemSelector();
  }
}

// ItemSelector event handlers
function handleItemSelectorSearch(query: string) {
  itemSelector.handleSearch(query);
}

function handleItemSelectorPageChange(page: number) {
  itemSelector.handlePageChange(page);
}

function handleItemSelectorLanguageChange(language: string) {
  itemSelector.selectedLanguage.value = language;
}

function handleItemSelectorSortChange(field: string, direction: 'asc' | 'desc') {
  itemSelector.updateSort(field, direction);
}

function handleItemSelectorItemsPerPageChange(count: number) {
  itemSelector.updateItemsPerPage(count);
}

function getTranslatedFieldValue(item: any, field: string): any {
  return itemSelector.getTranslatedFieldValue(item, field);
}

function isFieldTranslatable(field: string): boolean {
  return itemSelector.isFieldTranslatable(field);
}

async function createNewItem() {
  logger.log('🟣 BlockCreator: Creating new item');
  
  if (!localArea.value || !selectedCollection.value) {
    logger.error('🔴 BlockCreator: Missing area or collection');
    return;
  }

  creating.value = true;

  try {
    // Create empty item with just status
    const newItem = {
      status: 'draft'
    };
    
    // Add default values based on collection type
    const info = collectionInfo[selectedCollection.value];
    if (info?.quickFields) {
      // Add empty default values for required fields
      if (info.quickFields.includes('title')) {
        newItem.title = 'New ' + info.label;
      }
      if (info.quickFields.includes('headline')) {
        newItem.headline = 'New ' + info.label;
      }
      if (info.quickFields.includes('content')) {
        newItem.content = '';
      }
    }

    logger.log('🟣 BlockCreator: Creating block with data:', {
      area: localArea.value,
      collection: selectedCollection.value,
      item: newItem
    });

    emit('create', {
      area: localArea.value,
      collection: selectedCollection.value,
      item: newItem
    });

  } catch (error) {
    logger.error('🔴 BlockCreator: Failed to create block:', error);
    creating.value = false;
  }
}

// Watch for area changes
watch(() => props.selectedArea, (newArea) => {
  if (newArea) {
    localArea.value = newArea;
    // Don't change step if already past step 2
    if (currentStep.value === 1) {
      currentStep.value = 2;
    }
  }
});

// Watch for area selection to advance step
watch(localArea, (newArea) => {
  if (newArea && currentStep.value === 1) {
    currentStep.value = 2;
  }
});

// Reset form when collection changes
watch(selectedCollection, () => {
  itemData.value = {};
});
</script>

<style lang="scss" scoped>
.block-creator {
  width: 700px;
  max-width: 90vw;
  background: white;
  border-radius: var(--border-radius);
  overflow: hidden;
}

.creator-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 24px 24px 0;

  h3 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--foreground-subdued);
  }
}

.creator-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 24px 24px;
}

.creator-step {
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--foreground-subdued);
    font-size: 14px;
  }
}

.area-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.block-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.block-type-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  background: var(--background-subdued);
  border: 2px solid var(--border-subdued);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  min-height: 140px;

  &:hover {
    background: var(--background-normal);
    border-color: var(--border-normal);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    background: var(--primary-10);
    border-color: var(--primary);
    
    .tile-icon {
      color: var(--primary);
    }
  }

  .tile-icon {
    margin-bottom: 12px;
    color: var(--foreground-subdued);
    transition: color 0.2s;
  }

  .tile-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tile-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--foreground-normal);
  }

  .tile-description {
    font-size: 12px;
    color: var(--foreground-subdued);
    line-height: 1.4;
  }
}

.quick-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-group {
  label {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 500;
  }
}

.creator-preview {
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--foreground-subdued);
    font-size: 14px;
  }

  .preview-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--background-subdued);
    border: 1px solid var(--border-normal);
    border-radius: var(--border-radius);

    .preview-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      strong {
        color: var(--foreground-normal);
      }

      span {
        font-size: 12px;
        color: var(--foreground-subdued);
      }
    }
  }
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--background-subdued);
  border: 2px solid var(--border-subdued);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--background-normal);
    border-color: var(--border-normal);
    transform: translateX(4px);
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--background-normal);
    border-radius: 50%;
    color: var(--foreground-subdued);
  }

  .action-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .action-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--foreground-normal);
    }

    .action-description {
      font-size: 12px;
      color: var(--foreground-subdued);
    }
  }
}

.creator-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: var(--background-page);
  border-top: 1px solid var(--border-subdued);
}
</style>