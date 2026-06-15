<template>
  <v-card class="block-creator" data-testid="block-creator-dialog">
    <v-card-title>Add a block</v-card-title>

    <!-- Step progress (decorative — ARIA/keyboard is handled in the accessibility pass, #56) -->
    <div class="wizard-steps">
      <template v-for="(step, index) in steps" :key="step.n">
        <span v-if="index > 0" class="wizard-step-line" />
        <span
          class="wizard-step"
          :class="{ 'is-active': currentStep === step.n, 'is-done': currentStep > step.n }"
        >
          <span class="wizard-step-num">
            <v-icon v-if="currentStep > step.n" name="check" x-small />
            <template v-else>{{ step.n }}</template>
          </span>
          <span class="wizard-step-label">{{ step.label }}</span>
        </span>
      </template>
    </div>

    <v-card-text>
      <!-- Step 1: Select area -->
      <div v-if="currentStep === 1" class="creator-step">
        <v-list class="select-list">
          <v-list-item
            v-for="area in availableAreas"
            :key="area.id"
            clickable
            :active="localArea === area.id"
            @click="selectAreaOption(area.id)"
          >
            <v-list-item-icon>
              <v-icon :name="area.icon || 'widgets'" />
            </v-list-item-icon>
            <v-list-item-content>
              <div class="item-title">{{ area.label }}</div>
              <div class="item-subtitle">
                {{ area.maxItems ? `Max ${area.maxItems} blocks` : 'No limit' }}
              </div>
            </v-list-item-content>
            <v-list-item-icon v-if="localArea === area.id">
              <v-icon name="check" />
            </v-list-item-icon>
          </v-list-item>
        </v-list>
      </div>

      <!-- Step 2: Select block type -->
      <div v-else-if="currentStep === 2" class="creator-step">
        <div class="block-type-grid">
          <div
            v-for="collection in availableCollections"
            :key="collection.value"
            class="block-type-tile"
            :class="{ selected: selectedCollection === collection.value }"
            @click="selectCollectionOption(collection.value)"
          >
            <div class="tile-icon">
              <v-icon :name="getCollectionIcon(collection.value)" large />
            </div>
            <div class="tile-label">{{ collection.text }}</div>
            <div v-if="collection.description" class="tile-meta">
              {{ collection.description }}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Choose action -->
      <div v-else-if="currentStep === 3" class="creator-step">
        <v-list class="select-list">
          <v-list-item
            v-for="action in actionOptions"
            :key="action.value"
            clickable
            :active="selectedAction === action.value"
            @click="selectActionOption(action.value)"
          >
            <v-list-item-icon>
              <v-icon :name="action.icon" />
            </v-list-item-icon>
            <v-list-item-content>
              <div class="item-title">{{ action.title }}</div>
              <div class="item-subtitle">{{ action.description }}</div>
            </v-list-item-content>
            <v-list-item-icon v-if="selectedAction === action.value">
              <v-icon name="check" />
            </v-list-item-icon>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-button v-if="showBack" secondary @click="goBack">
        Back
      </v-button>
      <div class="spacer" />
      <v-button secondary @click="$emit('cancel')">
        Cancel
      </v-button>
      <v-button
        :disabled="!canContinue || creating"
        :loading="creating"
        @click="handleContinue"
      >
        {{ continueLabel }}
      </v-button>
    </v-card-actions>

    <!-- ItemSelector Drawer (Teleported to body) -->
    <Teleport to="body">
      <ItemSelectorDrawer
        v-if="showItemSelector"
        :open="showItemSelector"
        :collection="selectedCollection"
        :collection-name="selectedCollectionLabel"
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
  </v-card>
</template>

<script setup lang="ts">
import { logger } from '../utils/logger';
import { ref, computed, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useItemSelector, ItemSelectorDrawer } from 'directus-extension-expandable-blocks/shared';
import type { AreaConfig, JunctionInfo } from '../types';
import { COLLECTION_META } from '../utils/constants';
import { getCollectionIcon, getCollectionLabel } from '../utils/blockHelpers';

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

// Static wizard config
const steps = [
  { n: 1, label: 'Area' },
  { n: 2, label: 'Block type' },
  { n: 3, label: 'Action' }
];

const actionOptions = [
  { value: 'create' as const, icon: 'add', title: 'Create new', description: 'Start with a blank item' },
  { value: 'link' as const, icon: 'library_add', title: 'Link existing', description: 'Reference an existing content item' },
  { value: 'duplicate' as const, icon: 'content_copy', title: 'Duplicate existing', description: 'Create a copy of an existing item' }
];

// Computed
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
  let collections: string[] = [];

  if (props.allowedCollections === null) {
    // null means: use all known collections
    collections = Object.keys(COLLECTION_META);
  } else if (Array.isArray(props.allowedCollections) && props.allowedCollections.length > 0) {
    collections = props.allowedCollections;
  } else if (props.junctionInfo?.allowedCollections?.length) {
    collections = props.junctionInfo.allowedCollections;
  } else {
    collections = Object.keys(COLLECTION_META);
  }

  // Filter by the selected area's allowed types
  const area = props.areas.find(a => a.id === localArea.value);
  if (area?.allowedTypes?.length) {
    collections = collections.filter(c => area.allowedTypes!.includes(c));
  }

  return collections.map(collection => ({
    value: collection,
    text: COLLECTION_META[collection]?.label ?? getCollectionLabel(collection),
    description: COLLECTION_META[collection]?.description
  }));
});

const selectedCollectionLabel = computed(() =>
  COLLECTION_META[selectedCollection.value]?.label ?? getCollectionLabel(selectedCollection.value)
);

const canContinue = computed(() => {
  if (currentStep.value === 1) return !!localArea.value;
  if (currentStep.value === 2) return !!selectedCollection.value;
  if (currentStep.value === 3) return !!selectedAction.value;
  return false;
});

const continueLabel = computed(() => {
  if (currentStep.value === 3) return selectedAction.value === 'create' ? 'Create block' : 'Continue';
  return 'Continue';
});

// Hide "Back" on step 2 when the area was pre-selected (step 1 was skipped).
const showBack = computed(() => currentStep.value > 1 && !(currentStep.value === 2 && !!props.selectedArea));

// Methods
function getAreaBlockCount(_areaId: string): number {
  // Block counts are not passed into the wizard; unknown counts are treated as 0.
  return 0;
}

function selectAreaOption(areaId: string) {
  localArea.value = areaId;
}

function selectCollectionOption(collection: string) {
  selectedCollection.value = collection;
}

function selectActionOption(action: 'create' | 'link' | 'duplicate') {
  selectedAction.value = action;
}

// Single advance dispatcher — selection only marks; "Continue" advances / triggers.
function handleContinue() {
  if (creating.value) return;
  if (currentStep.value === 1) {
    currentStep.value = 2;
    return;
  }
  if (currentStep.value === 2) {
    currentStep.value = 3;
    return;
  }
  // Step 3: run the chosen action
  if (selectedAction.value === 'create') {
    createNewItem();
  } else if (selectedAction.value) {
    showItemSelector.value = true;
    itemSelector.open(selectedCollection.value);
  }
}

function goBack() {
  if (currentStep.value === 3) {
    selectedAction.value = null;
    currentStep.value = 2;
  } else if (currentStep.value === 2) {
    selectedCollection.value = '';
    selectedAction.value = null;
    currentStep.value = 1;
    localArea.value = '';
  }
}

function closeItemSelector() {
  showItemSelector.value = false;
  itemSelector.close();
}

function handleItemsLinked(items: any[]) {
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
  if (!localArea.value || !selectedCollection.value) {
    logger.error('BlockCreator: Missing area or collection');
    return;
  }

  creating.value = true;

  try {
    // Create an empty item with just the default status + collection-specific title fields
    const newItem: Record<string, unknown> = { status: 'draft' };
    const meta = COLLECTION_META[selectedCollection.value];
    if (meta?.quickFields) {
      if (meta.quickFields.includes('title')) newItem.title = 'New ' + meta.label;
      if (meta.quickFields.includes('headline')) newItem.headline = 'New ' + meta.label;
      if (meta.quickFields.includes('content')) newItem.content = '';
    }

    emit('create', {
      area: localArea.value,
      collection: selectedCollection.value,
      item: newItem
    });

    // Reaching here means the parent did NOT unmount us — i.e. validation/save failed and the
    // dialog stayed open. Clear the loading state so the wizard doesn't get stuck on the spinner.
    // On success the parent closes the dialog (v-if), unmounting this component before this runs.
    creating.value = false;
  } catch (error) {
    logger.error('BlockCreator: Failed to create block', error);
    creating.value = false;
  }
}

// Keep localArea in sync if the parent changes the pre-selected area while the wizard is open.
// Step advance is driven solely by handleContinue — no currentStep changes here.
watch(() => props.selectedArea, (newArea) => {
  if (newArea) localArea.value = newArea;
});
</script>

<style lang="scss" scoped>
@use '../styles/theme' as theme;

/* Widen the dialog: v-dialog has no width prop and the inner v-card defaults to
   --v-card-min-width: 540px (set on the card itself, so it cannot be inherited from a
   wrapper — the card is teleported out of the dialog element). Override it directly on the
   card root (this component IS the v-card). min() keeps it responsive on narrow viewports. */
.block-creator {
  --v-card-min-width: min(720px, calc(100vw - 40px)) !important;
}

.wizard-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px 16px;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);

  &.is-active {
    color: var(--theme--primary);
  }
}

.wizard-step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--theme--background-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;

  /* #fff on the primary/success fill is the documented --foreground-inverted exception
     (AA verified, TOKENS §7). #57-allow: white-on-primary / white-on-success step marker. */
  .wizard-step.is-active & {
    background: var(--theme--primary);
    color: #fff;
  }

  .wizard-step.is-done & {
    background: var(--theme--success);
    color: #fff;
  }
}

.wizard-step-line {
  width: 18px;
  height: 1px;
  background: var(--theme--border-color-accent);
}

.creator-step {
  .item-title {
    font-weight: 600;
    color: var(--theme--foreground);
  }

  .item-subtitle {
    font-size: 12px;
    color: var(--theme--foreground-subdued);
    margin-top: 2px;
  }
}

.select-list {
  max-height: 320px;
  overflow-y: auto;
}

.block-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.block-type-tile {
  @include theme.card-surface;
  @include theme.interactive-states;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;

  .tile-icon {
    width: 46px;
    height: 46px;
    border-radius: var(--theme--border-radius);
    background: var(--theme--background-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme--foreground);
    transition: background 0.12s, color 0.12s;
  }

  /* interactive-states only themes the container; the icon fill is set here. */
  &.selected .tile-icon {
    /* #57-allow: white-on-primary selected tile icon (foreground-inverted, AA). */
    background: var(--theme--primary);
    color: #fff;
  }

  .tile-label {
    font-weight: 600;
    font-size: 14px;
    color: var(--theme--foreground-accent);
  }

  .tile-meta {
    font-size: 12px;
    color: var(--theme--foreground-subdued);
    line-height: 1.4;
  }
}

.spacer {
  flex: 1;
}
</style>
