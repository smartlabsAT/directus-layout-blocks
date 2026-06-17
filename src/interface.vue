<template>
  <div class="layout-blocks-interface">
    <!-- Loading State -->
    <div v-if="loading" class="layout-blocks-loading">
      <v-progress-circular indeterminate />
      <p>Loading layout blocks...</p>
    </div>

    <!-- Setup State -->
    <div v-else-if="!isSetupComplete && options.autoSetup" class="layout-blocks-setup">
      <v-notice type="info">
        <div class="notice-content">
          <v-icon name="settings" />
          <div>
            <strong>Setting up layout blocks…</strong>
            <p>Preparing the M2A relationship fields. This only happens once.</p>
          </div>
        </div>
      </v-notice>
    </div>

    <!-- Error State -->
    <div v-else-if="setupError" class="layout-blocks-error">
      <v-notice type="danger">
        <div class="error-content">
          <strong>Configuration Error</strong>
          <p>{{ setupError.message }}</p>
          <div v-if="setupError.message.includes('not a M2A relation')" class="error-help">
            <p><strong>How to use Layout Blocks:</strong></p>
            <ol>
              <li>Create a Many-to-Any (M2A) field first</li>
              <li>Select "Layout Blocks" as the interface for that M2A field</li>
              <li>Layout Blocks cannot be used as a standalone field</li>
            </ol>
          </div>
          <v-button small @click="retrySetup">Retry Setup</v-button>
        </div>
      </v-notice>
    </div>

    <!-- New Item Notice -->
    <div v-else-if="isNewItem" class="layout-blocks-new-item">
      <v-notice type="info">
        <div class="notice-content">
          <v-icon name="info" />
          <div>
            <strong>Save the item first</strong>
            <p>You need to save this item before you can add layout blocks.</p>
          </div>
        </div>
      </v-notice>
    </div>

    <!-- Main Interface -->
    <div v-else class="layout-blocks-container" data-testid="layout-blocks-container">
      <!-- Sentinel above the toolbar: flips `toolbarStuck` once the toolbar
           pins, so we can show its shadow like Directus' own header-bar. -->
      <div ref="toolbarSentinel" class="toolbar-sentinel" aria-hidden="true"></div>

      <!-- Toolbar -->
      <div ref="toolbarEl" class="layout-blocks-toolbar" :class="{ 'is-stuck': toolbarStuck }">
        <div class="toolbar-left">
          <v-button
            v-if="options.enableAreaManagement"
            v-tooltip="'Manage areas'"
            v-btn-aria="{ 'aria-label': 'Manage areas' }"
            icon
            secondary
            @click="showAreaManager = true"
          >
            <v-icon name="dashboard_customize" />
          </v-button>
        </div>

        <div class="toolbar-center">
          <!-- Area selector: switches the active area, driving the view's
               v-model:selected-area (ListView tabs / GridView card highlight). -->
          <v-menu v-if="computedAreas.length" show-arrow placement="bottom">
            <template #activator="{ toggle, active }">
              <v-button
                secondary
                small
                class="area-select"
                v-btn-aria="{ 'aria-haspopup': 'menu', 'aria-expanded': active }"
                @click="toggle"
              >
                <v-icon
                  v-if="selectedArea && selectedAreaConfig?.icon"
                  :name="selectedAreaConfig.icon"
                  small
                  left
                />
                <span class="area-select__label">
                  {{ selectedArea ? (selectedAreaConfig?.label || selectedArea) : 'All areas' }}
                </span>
                <v-chip v-if="selectedArea" x-small class="area-select__count">
                  {{ getBlocksForArea(selectedArea).length }}
                </v-chip>
                <v-icon name="expand_more" small right />
              </v-button>
            </template>

            <v-list>
              <v-list-item
                clickable
                :active="!selectedArea"
                @click="selectedArea = null"
              >
                <v-list-item-icon><v-icon name="dashboard" /></v-list-item-icon>
                <v-list-item-content>All areas</v-list-item-content>
              </v-list-item>
              <v-list-item
                v-for="area in computedAreas"
                :key="area.id"
                clickable
                :active="selectedArea === area.id"
                @click="selectedArea = area.id"
              >
                <v-list-item-icon>
                  <v-icon :name="area.icon || 'crop_square'" />
                </v-list-item-icon>
                <v-list-item-content>{{ area.label || area.id }}</v-list-item-content>
                <v-chip x-small>{{ getBlocksForArea(area.id).length }}</v-chip>
                <v-icon v-if="area.locked" name="lock" x-small />
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

        <div class="toolbar-right">
          <!-- Guided "add a block" entry point (opens the BlockCreator wizard).
               Always reachable, unlike the per-area quick-add which only the
               area headers / empty states expose; preselects the current area. -->
          <v-button
            v-if="permissions.create"
            small
            secondary
            @click="openBlockCreator(selectedArea ?? undefined)"
          >
            <v-icon name="add" left />
            Add block
          </v-button>
          <div class="lb-view-toggle" role="radiogroup" aria-label="View mode">
            <v-button
              v-tooltip="'Grid view'"
              v-btn-aria="{ role: 'radio', 'aria-label': 'Grid view', 'aria-checked': viewMode === 'grid', tabindex: viewMode === 'grid' ? 0 : -1, 'data-view': 'grid' }"
              :active="viewMode === 'grid'"
              secondary
              icon
              small
              @click="viewMode = 'grid'"
              @keydown="handleViewKeydown"
            >
              <v-icon name="grid_view" />
            </v-button>
            <v-button
              v-tooltip="'List view'"
              v-btn-aria="{ role: 'radio', 'aria-label': 'List view', 'aria-checked': viewMode === 'list', tabindex: viewMode === 'list' ? 0 : -1, 'data-view': 'list' }"
              :active="viewMode === 'list'"
              secondary
              icon
              small
              @click="viewMode = 'list'"
              @keydown="handleViewKeydown"
            >
              <v-icon name="view_list" />
            </v-button>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="layout-blocks-content">
        <component
          :is="viewComponent"
          v-model:blocks="blocks"
          v-model:selected-area="selectedArea"
          :areas="computedAreas"
          :options="options"
          :junction-info="junctionInfo"
          :permissions="permissions"
          :loading="blocksLoading"
          :allowed-collections="filteredCollections"
          @move-block="handleMoveBlock"
          @remove-block="handleRemoveBlock"
          @unlink-block="handleUnlinkBlock"
          @delete-block="handleDeleteBlock"
          @update-block="handleUpdateBlock"
          @duplicate-block="handleDuplicateBlock"
          @add-block="openBlockCreator"
          @create-quick="handleQuickCreate"
          @open-selector="handleOpenSelector"
        />
      </div>

      <!-- Block Creator Modal -->
      <v-dialog
        v-model="showBlockCreator"
        :title="null"
        persistent
        aria-labelledby="lb-block-creator-title"
        @esc="showBlockCreator = false"
      >
        <template #default>
          <block-creator
            v-if="showBlockCreator"
            :areas="computedAreas"
            :selected-area="selectedArea"
            :allowed-collections="filteredCollections"
            :junction-info="junctionInfo"
            @create="handleCreateBlock"
            @link="handleLinkBlocks"
            @duplicate="handleDuplicateBlocks"
            @cancel="showBlockCreator = false"
          />
        </template>
      </v-dialog>
      
      <!-- ItemSelector Drawer -->
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
          :allow-link="true"
          :allow-duplicate="true"
          :sort-field="itemSelectorSortField"
          :sort-direction="itemSelectorSortDirection"
          :logger-prefix="'[LayoutBlocks]'"
          @close="closeItemSelector"
          @confirm="handleItemSelectorLinked"
          @confirm-copy="handleItemSelectorDuplicated"
          @search="handleItemSelectorSearch"
          @update:current-page="handleItemSelectorPageChange"
          @update:selected-language="handleItemSelectorLanguageChange"
          @update:sort="handleItemSelectorSortChange"
          @update:items-per-page="handleItemSelectorItemsPerPageChange"
        />
      </Teleport>
      
      <!-- Edit Drawer mit v-form und eigenen Buttons -->
      <v-drawer
        v-model="drawerActive"
        :title="editingCollection ? `Edit ${getCollectionLabel(editingCollection)}` : 'Edit Block'"
        :subtitle="editingCollection ? 'Editing in place' : undefined"
        icon="edit"
        persistent
        @cancel="handleDrawerCancel"
        @esc="handleDrawerCancel"
      >

        
        <div class="drawer-content">
          <!-- Directus native v-form component -->
          <v-form
            v-if="editingCollection && editingId"
            ref="editForm"
            :collection="editingCollection"
            :primary-key="String(editingId)"
            :initial-values="editingValues"
            v-model="editingValues"
          />
        </div>
        
        <template #actions>
          <v-button secondary @click="handleDrawerCancel">
            Cancel
          </v-button>
          <v-button @click="saveBlockDirectly" :loading="editSaving">
            Save
          </v-button>
        </template>
      </v-drawer>
      
      <!-- Area Manager Drawer -->
      <v-drawer
        v-if="options.enableAreaManagement"
        v-model="showAreaManager"
        title="Manage Areas"
        subtitle="Define the regions blocks can be placed in"
        icon="dashboard_customize"
        persistent
        @cancel="showAreaManager = false"
        @esc="showAreaManager = false"
      >
        <area-manager
          v-if="showAreaManager"
          ref="areaManagerRef"
          :areas="allConfiguredAreas"
          :available-collections="formattedAllowedCollections"
          @update:areas="handleAreasUpdate"
          @close="showAreaManager = false"
        />
        
        <template #actions>
          <!-- Directus's v-drawer renders only the LAST child of its actions
               slot (.action-buttons > :not(:last-child) { display: none }), so
               wrap our buttons in one element to show both. The header's X
               (top-left) is the native cancel/discard. -->
          <div class="drawer-actions">
            <v-button v-tooltip="'Add area'" secondary small @click="addAreaInManager">
              <v-icon name="add" left />
              Add area
            </v-button>
            <v-button @click="saveAreas">
              Save Areas
            </v-button>
          </div>
        </template>
      </v-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from './utils/logger';
import { vBtnAria } from './directives/btnAria';
import { ref, computed, watch, onMounted, onUnmounted, inject, resolveComponent, nextTick, useAttrs, getCurrentInstance } from 'vue';
import { useApi, useStores, useCollection } from '@directus/extensions-sdk';
import { M2AHelper } from './utils/m2a-helper';
import { useAutoSetup } from './composables/useAutoSetup';
import { useBlocks } from './composables/useBlocks';
import { usePermissions } from './composables/usePermissions';
import { useBlockPermissions } from './composables/useBlockPermissions';
import { DEFAULT_OPTIONS, DEFAULT_AREA_CONFIG } from './utils/constants';
import { normalizeAreaIds, isTempId, formatCollectionName } from './utils/helpers';
import { cloneDeep } from 'lodash-es';
import { CUSTOM_AREAS, USE_CUSTOM_AREAS } from './config/areas';
import type {
  LayoutBlocksOptions,
  JunctionInfo,
  BlockItem,
  BlockId,
  AreaConfig
} from './types';

// Import components (we'll create these next)
import GridView from './components/GridView.vue';
import ListView from './components/ListView.vue';
import AreaManager from './components/AreaManager.vue';
import BlockCreator from './components/BlockCreator.vue';
import { useItemSelector, ItemSelectorDrawer } from 'directus-extension-expandable-blocks/shared';

// Props - Using plain defineProps to ensure all props are received
const props = defineProps({
  value: {
    type: Array,
    default: () => []
  },
  field: String,
  collection: String,
  primaryKey: [String, Number],
  disabled: {
    type: Boolean,
    default: false
  },
  options: {
    type: Object,
    default: () => ({})  // Changed from null to empty object
  },
  // Additional props that Directus might pass
  width: String,
  type: String,
  readonly: Boolean,
  // Try to capture any additional props
  interfaceOptions: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['input']);

// Get attrs to see all passed properties
const attrs = useAttrs();

// Get current instance for deep inspection
const instance = getCurrentInstance();

// Debug all props
onMounted(() => {
  // Debug logging removed - use logger utility if needed
});

// Merge options with defaults
const options = computed<LayoutBlocksOptions>(() => {
  // Try multiple sources for options
  let interfaceOptions = props.options || {};
  
  // If props.options is empty, try injected field meta options
  if ((!interfaceOptions || Object.keys(interfaceOptions).length === 0) && injectedField?.meta?.options) {
    interfaceOptions = injectedField.meta.options;
  }
  
  // Try to get options from injected values
  if ((!interfaceOptions || Object.keys(interfaceOptions).length === 0) && injectedValues) {
    const fieldName = props.field;
    if (injectedValues._value && injectedValues._value[fieldName + '_options']) {
      interfaceOptions = injectedValues._value[fieldName + '_options'];
    }
    // Also check the field meta in the injected values
    if (injectedValues._value && injectedValues._value._fields && injectedValues._value._fields[fieldName]) {
      const fieldMeta = injectedValues._value._fields[fieldName];
      if (fieldMeta.meta?.options) {
        interfaceOptions = fieldMeta.meta.options;
      }
    }
  }
  
  // Try to get options from fields store as last resort
  if ((!interfaceOptions || Object.keys(interfaceOptions).length === 0) && fieldsStore && props.collection && props.field) {
    try {
      const fields = fieldsStore.getFieldsForCollection(props.collection);
      const fieldConfig = fields.find(f => f.field === props.field);
      if (fieldConfig?.meta?.options) {
        interfaceOptions = fieldConfig.meta.options;
      }
    } catch (error) {
      logger.error('Error getting options from fields store:', error);
    }
  }
  
  // Check attrs for options
  if ((!interfaceOptions || Object.keys(interfaceOptions).length === 0) && attrs.options) {
    interfaceOptions = attrs.options;
  }
  
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...interfaceOptions
  };
  
  return mergedOptions;
});

// System
const api = useApi();
const stores = useStores();
const { usePermissionsStore, useUserStore, useFieldsStore, useNotificationsStore, useCollectionsStore } = stores;
const permissionsStore = usePermissionsStore();
const userStore = useUserStore();
const fieldsStore = useFieldsStore();
const notifications = useNotificationsStore();
const collectionsStore = useCollectionsStore();

// Resolve drawer-item component
const DrawerItem = resolveComponent('drawer-item');

// Try to inject router
const router = inject('router') as any;

// Try to inject field configuration
const injectedField = inject('field', null) as any;
const injectedValues = inject('values', null) as any;

// Check for delayed field options
onMounted(async () => {
  // Give stores time to load
  await nextTick();
  
  // Additional wait for field store
  setTimeout(() => {
    if (fieldsStore && props.collection && props.field) {
      try {
        const fields = fieldsStore.getFieldsForCollection(props.collection);
        const fieldConfig = fields.find(f => f.field === props.field);
        if (fieldConfig?.meta?.options) {
          // Force recompute if we find options
          if (fieldConfig.meta.options.areas && Array.isArray(fieldConfig.meta.options.areas)) {
            if (options.value.areas?.length === 0 || !options.value.areas) {
              // Reload blocks which should now use the correct areas
              loadBlocks();
            }
          }
        }
      } catch (error) {
        logger.error('Delayed check error:', error);
      }
    }
  }, 1000);
});

// State
const loading = ref(true);
const blocksLoading = ref(false);
const isSetupComplete = ref(false);
const setupError = ref<Error | null>(null);
const junctionInfo = ref<JunctionInfo | null>(null);
const m2aHelper = new M2AHelper(api, stores);
const viewMode = ref(options.value.viewMode);
const selectedArea = ref<string | null>(null);
const showBlockCreator = ref(false);
const showAreaManager = ref(false);
const customAreas = ref<AreaConfig[]>([]);
const showItemSelector = ref(false);
const selectedCollection = ref<string>('');
const drawerActive = ref(false);
const editingId = ref<string | number | null>(null);
const editingBlockId = ref<BlockId | null>(null);
const editingCollection = ref<string>('');
const editingValues = ref<any>({});

// ItemSelector will be initialized after allowedCollections is defined
let itemSelector: any = null;

// ItemSelector computed properties (proxies to composable)
const itemSelectorItems = computed(() => itemSelector?.availableItems.value || []);
const itemSelectorLoading = computed(() => itemSelector?.loading.value || false);
const itemSelectorLoadingDetails = computed(() => itemSelector?.loadingDetails.value || false);
const itemSelectorCurrentPage = computed(() => itemSelector?.currentPage.value || 1);
const itemSelectorItemsPerPage = computed(() => itemSelector?.itemsPerPage.value || 50);
const itemSelectorTotalItems = computed(() => itemSelector?.totalItems.value || 0);
const itemSelectorAvailableFields = computed(() => itemSelector?.availableFields.value || []);
const itemSelectorRelations = computed(() => itemSelector?.itemRelations.value || {});
const itemSelectorError = computed(() => itemSelector?.apiError.value || null);
const itemSelectorTranslationInfo = computed(() => itemSelector?.translationInfo.value || null);
const itemSelectorSelectedLanguage = computed(() => itemSelector?.selectedLanguage.value || '');
const itemSelectorAvailableLanguages = computed(() => itemSelector?.availableLanguages.value || []);
const itemSelectorSortField = computed(() => itemSelector?.sortField.value || '');
const itemSelectorSortDirection = computed(() => itemSelector?.sortDirection.value || 'asc');
const editSaving = ref(false);
const editForm = ref<any>(null);
const fieldOptions = ref<any>(null);
const areaManagerRef = ref<any>(null);

// View toggle is a radiogroup (a11y §2): ←/→ switches modes and moves focus to
// the now-selected button (roving tabindex).
function handleViewKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
  nextTick(() => {
    const btn = toolbarEl.value?.querySelector(`[data-view="${viewMode.value}"]`);
    (btn as HTMLElement | null)?.focus();
  });
}

// Return focus to the trigger when a dialog/drawer closes (a11y §2). Capturing
// document.activeElement at open time covers the common triggers (toolbar /
// action buttons); a detached trigger just no-ops on restore.
const lastOverlayTrigger = ref<HTMLElement | null>(null);
function rememberOverlayTrigger() {
  const el = document.activeElement;
  lastOverlayTrigger.value = el instanceof HTMLElement ? el : null;
}
function restoreOverlayTrigger() {
  const el = lastOverlayTrigger.value;
  lastOverlayTrigger.value = null;
  if (el && document.contains(el)) nextTick(() => el.focus());
}
watch(showAreaManager, (open, was) => { if (open) rememberOverlayTrigger(); else if (was) restoreOverlayTrigger(); });
watch(showBlockCreator, (open, was) => { if (open) rememberOverlayTrigger(); else if (was) restoreOverlayTrigger(); });
watch(drawerActive, (open, was) => { if (open) rememberOverlayTrigger(); else if (was) restoreOverlayTrigger(); });

// Toolbar sticky-shadow: show a subtle shadow under the toolbar only once it is
// stuck to the top (matching Directus' own header-bar). An IntersectionObserver
// on a sentinel just above the toolbar flips `toolbarStuck`.
const toolbarSentinel = ref<HTMLElement | null>(null);
const toolbarEl = ref<HTMLElement | null>(null);
const toolbarStuck = ref(false);
let toolbarObserver: IntersectionObserver | null = null;

watch(toolbarSentinel, (el) => {
  // Re-create the observer whenever the sentinel node changes — the main
  // interface can be re-rendered across loading/setup/error states, so we must
  // not keep an observer bound to a detached node (the shadow would stop working).
  toolbarObserver?.disconnect();
  toolbarObserver = null;
  if (!el) return;
  const headerHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-bar-height'),
    10,
  ) || 61;
  toolbarObserver = new IntersectionObserver(
    ([entry]) => { toolbarStuck.value = !entry.isIntersecting; },
    { rootMargin: `-${headerHeight + 1}px 0px 0px 0px`, threshold: 0 },
  );
  toolbarObserver.observe(el);
});

// Expose the real toolbar height as a CSS variable so the grid's "jump to area"
// scroll-margin lands just below it without a hardcoded magic number.
watch(toolbarEl, (el) => {
  if (el) {
    document.documentElement.style.setProperty('--lb-toolbar-height', `${el.offsetHeight}px`);
  }
});

onUnmounted(() => {
  toolbarObserver?.disconnect();
  toolbarObserver = null;
  document.documentElement.style.removeProperty('--lb-toolbar-height');
});

// Computed property for current collection fields
const editingCollectionFields = computed(() => {
  if (!editingCollection.value) return [];
  
  try {
    // v-form needs all fields, it handles filtering internally
    return fieldsStore.getFieldsForCollection(editingCollection.value);
  } catch (error) {
    logger.error('Error getting fields for collection:', error);
    return [];
  }
});

// Composables
const { ensureRequiredFields, validateSetup } = useAutoSetup();
const { checkPermissions } = usePermissions();
const { permissions: blockPermissions, validation } = useBlockPermissions(options);

// Computed
const isNewItem = computed(() => 
  !props.primaryKey || props.primaryKey === '+' || props.primaryKey === 'new'
);

const viewComponent = computed(() => 
  viewMode.value === 'grid' ? GridView : ListView
);

const computedAreas = computed<AreaConfig[]>(() => {
  let areas: AreaConfig[] = [];
  
  // Temporary: Use custom areas if enabled
  if (USE_CUSTOM_AREAS) {
    areas = [...CUSTOM_AREAS];
  }
  // Check if areas are defined in options (this includes saved areas from database)
  else if (options.value.areas && Array.isArray(options.value.areas) && options.value.areas.length > 0) {
    areas = [...options.value.areas];
  }
  // Fallback to default
  else {
    areas = [...DEFAULT_AREA_CONFIG];
  }

  // Harden against areas configured without an `id`. Without this, such areas
  // render with `id: undefined` and their blocks (keyed by area) silently
  // disappear. Default a missing id from the label, the configured defaultArea,
  // or the index. Areas that already have an id are left unchanged.
  areas = normalizeAreaIds(areas, options.value.defaultArea || 'main');

  // Only add orphaned area if there are orphaned blocks
  const hasOrphanedBlocks = blocks.value.some(b => b.area === 'orphaned');
  const hasOrphanedArea = areas.some(a => a.id === 'orphaned');
  
  if (hasOrphanedBlocks && !hasOrphanedArea) {
    areas.push({
      id: 'orphaned',
      label: 'Orphaned Blocks',
      icon: 'help_outline',
      width: 100,
      locked: true // Prevent deletion of this special area
    });
  } else if (!hasOrphanedBlocks && hasOrphanedArea) {
    // Remove orphaned area if no orphaned blocks exist
    areas = areas.filter(a => a.id !== 'orphaned');
  }
  
  return areas;
});

const selectedAreaConfig = computed(() => 
  computedAreas.value.find(a => a.id === selectedArea.value)
);

// All configured areas for the area manager
const allConfiguredAreas = computed(() => {
  // Simply return all computed areas - they already include everything
  return computedAreas.value;
});

const permissions = ref({
  create: true,
  update: true,
  delete: true,
  reorder: true,
  manageAreas: false
});

// Block management
const {
  blocks,
  loading: blocksLoadingState,
  loadBlocks,
  addBlock,
  linkExistingItem,
  duplicateExistingItem,
  updateBlock,
  unlinkBlock,
  deleteBlock,
  reorderBlocks,
  moveBlock,
  markBlockDirty,
  isInternalUpdate,
  prepareItemsForEmit
} = useBlocks(
  props.collection!,
  props.field!,
  computed(() => props.primaryKey!),
  junctionInfo,
  options
);

// Watch blocks loading state
watch(blocksLoadingState, (newVal) => {
  blocksLoading.value = newVal;
});

// Get blocks for a specific area
function getBlocksForArea(areaId: string): BlockItem[] {
  return blocks.value.filter(b => b.area === areaId);
}

// Get allowed collections for M2A
const allowedCollections = computed(() => {
  // First check if user has selected specific collections in interface options
  if (options.value.allowedCollections?.length) {
    return options.value.allowedCollections;
  }
  
  // Otherwise use all collections allowed by the M2A relation
  if (junctionInfo.value?.allowedCollections?.length) {
    return junctionInfo.value.allowedCollections;
  }
  
  // If no collections configured, return null to signal that ALL collections should be available
  return null;
});

// Build a { text, value } option for the AreaManager collection picker, reusing
// the Directus collection display name (falls back to a prettified key).
function formatCollectionOption(collectionName: string): { text: string; value: string } {
  return {
    text: collectionsStore.getCollection(collectionName)?.name || formatCollectionName(collectionName),
    value: collectionName
  };
}

// Format allowed collections for the AreaManager.
const formattedAllowedCollections = computed(() => {
  const allowed = allowedCollections.value;

  // Restricted: the field/interface limits the M2A to an explicit subset — offer
  // exactly that subset (unchanged behavior).
  if (allowed && allowed.length > 0) {
    return allowed.map(formatCollectionOption);
  }

  // Unrestricted (allowedCollections === null): the M2A field accepts any
  // collection, so list every eligible content collection instead of an empty
  // array (issue #64). Excludes system collections, schema-less folder/group
  // pseudo-collections, hidden collections, and the M2A junction itself.
  const junctionCollection = junctionInfo.value?.collection;
  return collectionsStore.collections
    .filter((collection: any) =>
      !collection.collection.startsWith('directus_') &&
      collection.schema != null &&
      collection.meta?.hidden !== true &&
      collection.collection !== junctionCollection
    )
    .map((collection: any) => formatCollectionOption(collection.collection));
});

// Initialize ItemSelector after allowedCollections is defined
itemSelector = useItemSelector(api, allowedCollections.value || [], {
  loggerPrefix: '[LayoutBlocks]',
  allowLink: true,
  allowDuplicate: true,
  defaultItemsPerPage: 50
});

// Lifecycle
onMounted(async () => {
  await initialize();
  
  // Also check options after a delay to ensure stores are loaded
  setTimeout(() => {
    logger.log('🔍 Delayed options check:');
    if (fieldsStore && props.collection && props.field) {
      try {
        const fields = fieldsStore.getFieldsForCollection(props.collection);
        const fieldConfig = fields.find(f => f.field === props.field);
        logger.log('🔍 Field config from store:', fieldConfig);
        if (fieldConfig?.meta?.options) {
          logger.log('🔍 Field options from store:', fieldConfig.meta.options);
          
          // Force recompute if we find options
          if (fieldConfig.meta.options.areas && Array.isArray(fieldConfig.meta.options.areas)) {
            logger.log('🔍 Found areas in field options!', fieldConfig.meta.options.areas);
            // Since we can't use fieldOptions anymore, we need to force a recompute
            // by triggering a reactive update
            // This is a workaround for the delayed loading issue
            if (options.value.areas?.length === 0 || !options.value.areas) {
              logger.log('🔍 Options were empty, will reload page to apply areas');
              // As a last resort, reload the blocks which should now use the correct areas
              loadBlocks();
            }
          }
        }
      } catch (error) {
        logger.error('🔍 Delayed check error:', error);
      }
    }
  }, 1000);
});

// Initialize the interface
async function initialize() {
  loading.value = true;
  
  logger.log('🚀 Interface: Initializing with:', {
    collection: props.collection,
    field: props.field,
    primaryKey: props.primaryKey,
    options: props.options
  });
  
  try {
    // Skip if no collection/field info
    if (!props.collection || !props.field) {
      throw new Error('Collection and field are required');
    }

    // 1. Detect junction structure using M2AHelper
    logger.log('🚀 Interface: Detecting junction structure with M2AHelper...');
    const m2aFieldInfo = await m2aHelper.analyzeM2AStructure(
      props.collection,
      props.field
    );
    
    // Get existing fields from junction collection to check what exists
    let existingFields: string[] = [];
    let hasAreaField = false;
    let hasSortField = false;
    
    try {
      const junctionFields = stores.useFieldsStore().getFieldsForCollection(m2aFieldInfo.junctionCollection);
      existingFields = junctionFields.map((f: any) => f.field);
      hasAreaField = existingFields.includes('area');
      hasSortField = existingFields.includes('sort');
    } catch (e) {
      logger.debug('Could not get junction fields:', e);
    }
    
    // Convert M2AFieldInfo to JunctionInfo format
    junctionInfo.value = {
      collection: m2aFieldInfo.junctionCollection,
      primaryKeyField: 'id',
      foreignKeyField: m2aFieldInfo.foreignKeyField,
      itemField: 'item',
      collectionField: 'collection',
      existingFields,
      hasAreaField,
      hasSortField,
      hasCustomFields: false,
      allowedCollections: m2aFieldInfo.allowedCollections
    };
    logger.log('🚀 Interface: Junction info detected:', junctionInfo.value);

    // 2. Ensure required fields exist
    // Skip auto-setup if junction collection already exists with proper fields
    if (options.value.autoSetup && junctionInfo.value) {
      // Check if we actually need to create fields
      const needsSetup = !junctionInfo.value.hasAreaField || !junctionInfo.value.hasSortField;
      
      if (needsSetup) {
        logger.log('🔧 Interface: Setting up missing fields...');
        try {
          const setupResult = await ensureRequiredFields(
            junctionInfo.value,
            options.value
          );

          if (!setupResult.success && setupResult.errors.length > 0) {
            // Only throw if it's not a "field already exists" error
            const realErrors = setupResult.errors.filter(err => 
              !err.message?.includes('already exists')
            );
            if (realErrors.length > 0) {
              throw realErrors[0];
            }
          }
        } catch (err: any) {
          // Ignore 400 errors about fields already existing
          if (err.response?.status !== 400) {
            throw err;
          }
          logger.log('ℹ️ Fields already exist, continuing...');
        }
      } else {
        logger.log('✅ Junction collection already has all required fields');
      }
    }

    // 3. Validate setup
    const validation = await validateSetup(junctionInfo.value, options.value);
    if (!validation.isValid) {
      logger.warn('Setup validation issues:', validation.issues);
    }

    // 4. Check permissions
    const perms = await checkPermissions(
      junctionInfo.value.collection,
      props.collection
    );
    Object.assign(permissions.value, perms);

    // 5. Load blocks
    await loadBlocks();

    isSetupComplete.value = true;
  } catch (error) {
    logger.error('Layout Blocks initialization error:', error);
    setupError.value = error as Error;
    
    notifications.add({
      title: 'Initialization Error',
      text: error.message || 'Failed to initialize Layout Blocks',
      type: 'error',
      persist: true
    });
  } finally {
    loading.value = false;
  }
}

// Retry setup
async function retrySetup() {
  setupError.value = null;
  await initialize();
}

// Watch for changes in allowed collections and update ItemSelector.
// `updateCollections` is NOT exposed by the shared useItemSelector composable
// (from the expandable-blocks package), so guard the call — otherwise saving
// areas (which recomputes allowedCollections and fires this watcher) throws
// "updateCollections is not a function". Pre-existing; surfaced via Save Areas.
watch(allowedCollections, (newCollections) => {
  if (newCollections && itemSelector && typeof itemSelector.updateCollections === 'function') {
    itemSelector.updateCollections(newCollections);
  }
}, { immediate: false });

// Filter collections based on user permissions
const filteredCollections = computed(() => {
  const collections = allowedCollections.value || [];
  
  // Filter collections based on permissions using our permission checks
  return collections.filter(collection => {
    // Check if user has any relevant permission for this collection
    return (
      blockPermissions.canCreateItems(collection) ||
      blockPermissions.canLinkItems(collection) ||
      blockPermissions.canDuplicateItems(collection)
    );
  });
});

// Open block creator
function openBlockCreator(area?: string) {
  logger.log('🔵 openBlockCreator called with area:', area);
  logger.log('🔵 Current selectedArea:', selectedArea.value);
  logger.log('🔵 isNewItem:', isNewItem.value);
  logger.log('🔵 primaryKey:', props.primaryKey);
  logger.log('🔵 primaryKey type:', typeof props.primaryKey);
  logger.log('🔵 junctionInfo:', junctionInfo.value);
  
  // Direct check for new item
  const isNew = !props.primaryKey || props.primaryKey === '+' || props.primaryKey === 'new';
  logger.log('🔵 Direct isNew check:', isNew);
  
  if (isNew) {
    logger.error('🔴 Cannot open block creator for new items');
    notifications.add({
      title: 'Save Required',  
      text: 'Please save this item before adding blocks',
      type: 'warning'
    });
    return;
  }
  
  if (area) {
    logger.log('🔵 Setting selectedArea to:', area);
    selectedArea.value = area;
  }
  
  logger.log('🔵 Opening block creator dialog');
  showBlockCreator.value = true;
}

// Event handlers
async function handleCreateBlock(data: {
  area: string;
  collection: string;
  item: any;
}) {
  logger.log('🟢 handleCreateBlock called with:', data);
  logger.log('🟢 Current blocks:', blocks.value);
  logger.log('🟢 Junction info:', junctionInfo.value);
  
  // Validate permissions and rules
  const areaBlocks = getBlocksForArea(data.area);
  const validationResult = validation.validateAddBlock(data.area, data.collection, areaBlocks.length);
  
  if (!validationResult.valid) {
    notifications.add({
      title: 'Cannot Add Block',
      text: validationResult.error || 'Permission denied',
      type: 'error'
    });
    return;
  }
  
  try {
    blocksLoading.value = true;
    logger.log('🟢 Calling addBlock...');
    await addBlock(data.area, data.collection, data.item);
    logger.log('🟢 Block added successfully');
    
    showBlockCreator.value = false;
    
    notifications.add({
      title: 'Block Created',
      text: 'The block has been added successfully',
      type: 'success'
    });
  } catch (error) {
    logger.error('🔴 Error creating block:', error);
    notifications.add({
      title: 'Error Creating Block',
      text: error.message || 'Failed to create block',
      type: 'error'
    });
  } finally {
    blocksLoading.value = false;
  }
}

async function handleLinkBlocks(data: {
  area: string;
  collection: string;
  items: any[];
}) {
  logger.log('🟢 handleLinkBlocks called with:', data);
  
  try {
    blocksLoading.value = true;
    
    // For each selected item, link it using the new linkExistingItem function
    for (const item of data.items) {
      logger.log('🔗 Linking item:', item);
      await linkExistingItem(data.area, data.collection, item.id);
    }
    
    showBlockCreator.value = false;
    
    notifications.add({
      title: 'Items Linked',
      text: `${data.items.length} item(s) have been linked successfully`,
      type: 'success'
    });
  } catch (error) {
    logger.error('Error linking blocks', error);
    notifications.add({
      title: 'Error Linking Items',
      text: error.message || 'Failed to link items',
      type: 'error'
    });
  } finally {
    blocksLoading.value = false;
  }
}

async function handleDuplicateBlocks(data: {
  area: string;
  collection: string;
  items: any[];
}) {
  logger.debug('Duplicating blocks', { count: data.items.length });
  
  try {
    blocksLoading.value = true;
    
    // For each selected item, use the new duplicateExistingItem function
    for (const item of data.items) {
      await duplicateExistingItem(data.area, data.collection, item);
    }
    
    showBlockCreator.value = false;
    
    notifications.add({
      title: 'Items Duplicated',
      text: `${data.items.length} item(s) have been duplicated successfully`,
      type: 'success'
    });
  } catch (error) {
    logger.error('🔴 Error duplicating blocks:', error);
    notifications.add({
      title: 'Error Duplicating Items',
      text: error.message || 'Failed to duplicate items',
      type: 'error'
    });
  } finally {
    blocksLoading.value = false;
  }
}

async function handleQuickCreate(data: {
  area: string;
  collection: string;
}) {
  logger.log('🟢 handleQuickCreate called with:', data);
  
  try {
    blocksLoading.value = true;
    
    // Create a new empty item with default values
    const newItem = {
      status: 'draft',
      title: `New ${data.collection.replace(/_/g, ' ')}`
    };
    
    await addBlock(data.area, data.collection, newItem);
    
    notifications.add({
      title: 'Block Created',
      text: 'New block has been created',
      type: 'success'
    });
  } catch (error) {
    logger.error('🔴 Error creating block:', error);
    notifications.add({
      title: 'Error Creating Block',
      text: error.message || 'Failed to create block',
      type: 'error'
    });
  } finally {
    blocksLoading.value = false;
  }
}

async function handleOpenSelector(data: {
  area: string;
  collection: string;
}) {
  logger.log('🔵 handleOpenSelector called with:', data);
  
  // Store the selected area and collection for later use
  selectedArea.value = data.area;
  selectedCollection.value = data.collection;
  
  // Open the ItemSelector with the selected collection
  if (itemSelector) {
    itemSelector.open(data.collection);
  }
  showItemSelector.value = true;
}

// ItemSelector event handlers
function closeItemSelector() {
  showItemSelector.value = false;
  if (itemSelector) itemSelector.close();
}

function handleItemSelectorSearch(query: string) {
  if (itemSelector) itemSelector.handleSearch(query);
}

function handleItemSelectorPageChange(page: number) {
  if (itemSelector) itemSelector.handlePageChange(page);
}

function handleItemSelectorLanguageChange(language: string) {
  if (itemSelector) itemSelector.selectedLanguage.value = language;
}

function handleItemSelectorSortChange(field: string, direction: 'asc' | 'desc') {
  if (itemSelector) itemSelector.updateSort(field, direction);
}

function handleItemSelectorItemsPerPageChange(count: number) {
  if (itemSelector) itemSelector.updateItemsPerPage(count);
}

function getTranslatedFieldValue(item: any, field: string): any {
  return itemSelector?.getTranslatedFieldValue(item, field);
}

function isFieldTranslatable(field: string): boolean {
  return itemSelector?.isFieldTranslatable(field) || false;
}

function getCollectionIcon(collection: string): string {
  const collectionInfo: Record<string, any> = {
    content_headline: { icon: 'title' },
    content_text: { icon: 'text_fields' },
    content_image: { icon: 'image' },
    content_video: { icon: 'videocam' },
    content_cta: { icon: 'ads_click' },
    content_button: { icon: 'smart_button' },
    content_wysiwig: { icon: 'edit_note' },
    content_block: { icon: 'widgets' }
  };
  return collectionInfo[collection]?.icon || 'widgets';
}

async function handleItemSelectorLinked(items: any[]) {
  logger.log('🟢 handleItemSelectorLinked called with:', items);
  
  if (items.length > 0 && selectedArea.value && selectedCollection.value) {
    // Validate permissions for linking
    const validationResult = validation.validateLinkItem(selectedCollection.value, items[0].id);
    
    if (!validationResult.valid) {
      notifications.add({
        title: 'Cannot Link Items',
        text: validationResult.error || 'Permission denied',
        type: 'error'
      });
      return;
    }
    
    try {
      blocksLoading.value = true;
      
      // For each selected item, create a junction record with just the ID (reference)
      for (const item of items) {
        await linkExistingItem(selectedArea.value, selectedCollection.value, item.id);
      }
      
      // Reload blocks to show the newly linked items
      await loadBlocks();
      
      closeItemSelector();
      
      notifications.add({
        title: 'Items Linked',
        text: `${items.length} item(s) have been linked successfully`,
        type: 'success'
      });
    } catch (error) {
      logger.error('Error linking blocks', error);
      notifications.add({
        title: 'Error Linking Items',
        text: error.message || 'Failed to link items',
        type: 'error'
      });
    } finally {
      blocksLoading.value = false;
    }
  }
}

async function handleItemSelectorDuplicated(items: any[]) {
  logger.debug('Duplicating items from selector', { count: items.length });
  
  if (items.length > 0 && selectedArea.value && selectedCollection.value) {
    // Validate permissions for duplicating
    const validationResult = validation.validateDuplicateItem(selectedCollection.value);
    
    if (!validationResult.valid) {
      notifications.add({
        title: 'Cannot Duplicate Items',
        text: validationResult.error || 'Permission denied',
        type: 'error'
      });
      return;
    }
    
    try {
      blocksLoading.value = true;
      
      // For each selected item, use the duplicateExistingItem function
      for (const item of items) {
        await duplicateExistingItem(selectedArea.value, selectedCollection.value, item);
      }
      
      // Reload blocks to show the newly duplicated items
      await loadBlocks();
      
      closeItemSelector();
      
      notifications.add({
        title: 'Items Duplicated',
        text: `${items.length} item(s) have been duplicated successfully`,
        type: 'success'
      });
    } catch (error) {
      logger.error('🔴 Error duplicating blocks:', error);
      notifications.add({
        title: 'Error Duplicating Items',
        text: error.message || 'Failed to duplicate items',
        type: 'error'
      });
    } finally {
      blocksLoading.value = false;
    }
  }
}

async function handleMoveBlock(data: {
  blockId: BlockId;
  fromArea: string;
  toArea: string;
  toIndex: number;
}) {
  // Compare as strings: drag payloads from the DOM are strings, while persisted
  // blocks carry numeric ids (see fix #40/#42).
  const block = blocks.value.find(b => String(b.id) === String(data.blockId));
  if (!block) {
    logger.error('Block not found for move:', data.blockId);
    return;
  }
  
  // Validate permissions for moving
  const validationResult = validation.validateMoveBlock(data.fromArea, data.toArea, block.collection);
  
  if (!validationResult.valid) {
    notifications.add({
      title: 'Cannot Move Block',
      text: validationResult.error || 'Permission denied',
      type: 'error'
    });
    // Reload to revert UI state
    await loadBlocks();
    return;
  }
  
  try {
    await moveBlock(
      block.id,
      data.toArea,
      data.toIndex
    );
  } catch (error) {
    notifications.add({
      title: 'Error Moving Block',
      text: error.message || 'Failed to move block',
      type: 'error'
    });
    // Reload to revert UI state
    await loadBlocks();
  }
}

async function handleUpdateBlock(data: {
  blockId: number;
  updates?: any;
}) {
  logger.log('🔵 handleUpdateBlock called:', data);
  
  // If updates are provided, do a direct update without opening drawer
  if (data.updates) {
    await handleBlockStatusUpdate(data.blockId, data.updates.status);
    return;
  }
  
  try {
    // Find the block to get its collection and item id
    const block = blocks.value.find(b => b.id === data.blockId);
    if (!block) {
      throw new Error('Block not found');
    }

    editingCollection.value = block.collection;
    editingBlockId.value = block.id;

    if (isTempId(block.id) || !block.item?.id) {
      // Unsaved block: edit its inline content in create mode (no API item yet).
      editingId.value = '+';
      editingValues.value = cloneDeep(block.item || {});
    } else {
      // Persisted block: load current item values read-only for the form.
      editingId.value = block.item.id;
      const response = await api.get(`/items/${block.collection}/${block.item.id}`);
      editingValues.value = response.data.data;
    }

    // Open drawer
    drawerActive.value = true;

  } catch (error) {
    logger.error('🔴 Error opening editor:', error);
    notifications.add({
      title: 'Error Opening Editor',
      text: error.message || 'Failed to open block editor',
      type: 'error'
    });
  }
}

async function handleBlockStatusUpdate(blockId: BlockId, newStatus: string) {
  logger.log('🔵 Updating block status:', blockId, 'to', newStatus);

  const block = blocks.value.find(b => b.id === blockId);
  if (!block) {
    logger.error('🔴 Block not found for status update:', blockId);
    return;
  }

  // Stage the status change locally; persisted on global Save.
  if (block.item) {
    block.item.status = newStatus;
  }
  markBlockDirty(blockId, true);

  notifications.add({
    title: 'Status Updated',
    text: `Block status changed to ${newStatus}`,
    type: 'success'
  });
}

// Helper to check if a field exists in the current collection
function hasField(fieldName: string): boolean {
  if (!editingCollection.value) return false;
  
  // Common fields for content blocks
  const commonFields: Record<string, string[]> = {
    content_headline: ['title', 'subtitle', 'status'],
    content_text: ['title', 'content', 'status'],
    content_image: ['title', 'subtitle', 'image', 'status'],
    content_video: ['title', 'subtitle', 'video_url', 'status'],
    content_hero: ['title', 'subtitle', 'content', 'image', 'button_text', 'button_link', 'status'],
    content_cta: ['title', 'subtitle', 'button_text', 'button_link', 'status'],
    content_accordion: ['title', 'content', 'status'],
    // Add more collections and their fields as needed
  };
  
  const fields = commonFields[editingCollection.value] || [];
  return fields.includes(fieldName);
}

// Get collection label helper
function getCollectionLabel(collection: string): string {
  return collection
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^Content /, '');
}

// Helper to determine which component to use for a field
function getFieldComponent(field: any): string {
  const interfaceType = field.meta?.interface;
  
  switch (interfaceType) {
    case 'input':
    case 'input-hash':
    case 'input-rich-text-html':
      return 'v-input';
    case 'input-rich-text-md':
    case 'textarea':
    case 'input-multiline':
      return 'v-textarea';
    case 'select-dropdown':
    case 'select-dropdown-m2o':
      return 'v-select';
    case 'boolean':
    case 'toggle':
      return 'v-checkbox';
    case 'datetime':
    case 'dateTime':
    case 'date':
      return 'v-date-picker';
    case 'input-code':
    case 'code':
      return 'v-textarea'; // Use textarea for code, but we could use a code editor
    case 'wysiwyg':
      return 'v-textarea'; // Simplified for now
    default:
      // Default to input for unknown types
      return 'v-input';
  }
}

// Get field options for select fields
function getFieldOptions(field: any): any[] {
  if (field.meta?.options?.choices) {
    return field.meta.options.choices.map((choice: any) => ({
      text: choice.text || choice.value,
      value: choice.value
    }));
  }
  
  // For status fields, provide default options
  if (field.field === 'status') {
    return [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' }
    ];
  }
  
  return [];
}

// Stage drawer edits into block state (persisted on global Save).
async function saveBlockDirectly() {
  if (!editingCollection.value || editingBlockId.value === null) return;

  editSaving.value = true;

  try {
    const block = blocks.value.find(b => b.id === editingBlockId.value);
    if (block) {
      block.item = { ...block.item, ...editingValues.value };
      markBlockDirty(block.id, true);
    }

    notifications.add({
      title: 'Block Updated',
      text: 'Changes staged — use Save to persist',
      type: 'success'
    });

    // Close drawer + reset editing state
    drawerActive.value = false;
    editingId.value = null;
    editingBlockId.value = null;
    editingCollection.value = '';
    editingValues.value = {};

  } catch (error: any) {
    logger.error('🔴 Error staging block changes:', error);
    notifications.add({
      title: 'Error Saving Block',
      text: error.message || 'Failed to stage block changes',
      type: 'error'
    });
  } finally {
    editSaving.value = false;
  }
}

// Handle drawer cancel
function handleDrawerCancel() {
  drawerActive.value = false;
  editingId.value = null;
  editingBlockId.value = null;
  editingCollection.value = '';
  editingValues.value = {};
}

// Get foreign key field for circular reference prevention
const foreignKeyField = computed(() => {
  if (!junctionInfo.value) return null;
  
  // For M2A, we need to prevent circular references
  // Return the field that points back to the parent collection
  return junctionInfo.value.foreignKeyField;
});


async function handleRemoveBlock(blockId: BlockId) {
  // This is now just for backward compatibility
  // The actual unlink/delete is handled by separate methods
  await handleUnlinkBlock(blockId);
}

async function handleUnlinkBlock(blockId: BlockId) {
  try {
    await unlinkBlock(blockId);
    
    notifications.add({
      title: 'Block Unlinked',
      text: 'The block has been removed from this page',
      type: 'success'
    });
  } catch (error: any) {
    notifications.add({
      title: 'Error Unlinking Block',
      text: error.message || 'Failed to unlink block',
      type: 'error'
    });
  }
}

async function handleDeleteBlock(blockId: BlockId, deleteContent: boolean) {
  try {
    await deleteBlock(blockId, deleteContent);
    
    notifications.add({
      title: deleteContent ? 'Block Deleted' : 'Block Unlinked',
      text: deleteContent 
        ? 'The block and its content have been permanently deleted'
        : 'The block has been removed from this page',
      type: 'success'
    });
  } catch (error: any) {
    notifications.add({
      title: 'Error Deleting Block',
      text: error.message || 'Failed to delete block',
      type: 'error'
    });
  }
}

async function handleDuplicateBlock(blockId: BlockId) {
  try {
    blocksLoading.value = true;
    
    // Find the block to duplicate
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error('Block not found');
    }
    
    // Duplicate the block's item
    await duplicateExistingItem(block.area, block.collection, block.item);
    
    notifications.add({
      title: 'Block Duplicated',
      type: 'success'
    });
  } catch (error: any) {
    notifications.add({
      title: 'Error Duplicating Block',
      text: error.message || 'Failed to duplicate block',
      type: 'error'
    });
  } finally {
    blocksLoading.value = false;
  }
}

// Handle areas update from area manager
async function handleAreasUpdate(updatedAreas: AreaConfig[]) {
  logger.log('Interface: Areas updated:', updatedAreas);
  
  try {
    // First, check which blocks need to be orphaned
    const blocksToOrphan: BlockItem[] = [];
    
    logger.log('Interface: Checking blocks for orphaning...');
    logger.log('Interface: Current blocks:', blocks.value);
    logger.log('Interface: Updated areas:', updatedAreas);
    
    blocks.value.forEach(block => {
      logger.log(`Interface: Checking block ${block.id}:`, {
        area: block.area,
        collection: block.collection,
        blockData: block
      });
      
      if (block.area) {
        // Find the updated area configuration
        const updatedArea = updatedAreas.find(a => a.id === block.area);
        logger.log(`Interface: Found area config for ${block.area}:`, updatedArea);
        
        if (!updatedArea) {
          // Area was removed completely
          logger.log(`Interface: Area ${block.area} was removed, orphaning block ${block.id}`);
          blocksToOrphan.push(block);
        } else if (updatedArea.allowedTypes && updatedArea.allowedTypes.length > 0) {
          logger.log(`Interface: Area ${updatedArea.id} has allowed types:`, updatedArea.allowedTypes);
          // Check if this block's collection is still allowed in the area
          if (!updatedArea.allowedTypes.includes(block.collection)) {
            logger.log(`Interface: Block ${block.id} (${block.collection}) is no longer allowed in area ${block.area}`);
            blocksToOrphan.push(block);
          } else {
            logger.log(`Interface: Block ${block.id} (${block.collection}) is still allowed in area ${block.area}`);
          }
        } else {
          logger.log(`Interface: Area ${block.area} has no type restrictions`);
        }
      } else {
        logger.log(`Interface: Block ${block.id} has no area assigned`);
      }
    });
    
    // Orphan blocks that are no longer allowed in their areas
    if (blocksToOrphan.length > 0) {
      logger.log(`Interface: Orphaning ${blocksToOrphan.length} blocks`);
      logger.log('Interface: Blocks to orphan:', blocksToOrphan);
      logger.log('Interface: Junction info:', junctionInfo.value);
      logger.log('Interface: Options:', options.value);
      logger.log('Interface: Will move blocks to "orphaned" area');
      
      for (const block of blocksToOrphan) {
        // Stage the orphaning locally; persisted on global Save (no immediate
        // write — keeps the form in a single consistent, discardable state).
        const blockIndex = blocks.value.findIndex(b => b.id === block.id);
        if (blockIndex !== -1) {
          blocks.value[blockIndex].area = 'orphaned';
          markBlockDirty(block.id, true);
          logger.log(`Interface: Block ${block.id} staged for orphaning`);
        }
      }
      
      notifications.add({
        title: 'Blocks Orphaned',
        text: `${blocksToOrphan.length} block(s) were moved to orphaned because they are no longer allowed in their areas`,
        type: 'info'
      });
    }
    
    // Update the field configuration in the database
    if (props.collection && props.field) {
      // Get current field configuration
      const fields = fieldsStore.getFieldsForCollection(props.collection);
      const fieldConfig = fields.find(f => f.field === props.field);
      
      if (fieldConfig) {
        // Update the field options with new areas
        const updatedOptions = {
          ...fieldConfig.meta.options,
          areas: updatedAreas
        };
        
        logger.log('Interface: Updating field options:', updatedOptions);
        
        // Update field via API
        await api.patch(`/fields/${props.collection}/${props.field}`, {
          meta: {
            ...fieldConfig.meta,
            options: updatedOptions
          }
        });
        
        // Update local state
        customAreas.value = [...updatedAreas];
        
        // Refresh fields store to get updated configuration
        await fieldsStore.hydrate();
        
        notifications.add({
          title: 'Areas Saved',
          text: 'Area configuration has been saved to database',
          type: 'success'
        });
        
        // Reload blocks to reflect area changes
        await loadBlocks();
      } else {
        throw new Error('Field configuration not found');
      }
    }
  } catch (error: any) {
    logger.error('Interface: Error saving areas:', error);
    notifications.add({
      title: 'Error Saving Areas',
      text: error.message || 'Failed to save area configuration',
      type: 'error'
    });
  }
}

// Save areas from area manager
// Triggers a new area row from the area-manager drawer header (the body
// "Add area" button moved into the drawer #actions slot in #55).
function addAreaInManager() {
  areaManagerRef.value?.addArea();
}

function saveAreas() {
  if (areaManagerRef.value) {
    areaManagerRef.value.save();
  }
  
  // The area manager will emit the update:areas event which updates customAreas
  // and then close itself, which will set showAreaManager to false
}

// Emit block changes into the Directus form state so the global Save / Discard
// buttons control persistence. `prepareItemsForEmit` shapes the M2A value
// (bare ids for clean blocks, full objects for dirty/new). Guarded against our
// own programmatic updates (loadBlocks / post-emit) to avoid feedback loops.
watch(blocks, () => {
  if (isInternalUpdate.value) return;
  isInternalUpdate.value = true;
  emit('input', prepareItemsForEmit());
  nextTick(() => {
    isInternalUpdate.value = false;
  });
}, { deep: true });

// React to external value changes. After Save the value returns the persisted
// ids; after Discard it reverts to the last saved value. In both cases the
// database holds the truth (nothing is written mid-session), so we reload
// read-only and reset the dirty baseline. Skipped for our own emits.
watch(() => props.value, () => {
  if (isInternalUpdate.value) return;
  loadBlocks();
}, { deep: true });
</script>

<style lang="scss" scoped>
.layout-blocks-interface {
  position: relative;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.layout-blocks-loading,
.layout-blocks-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--spacing);
  color: var(--theme--foreground-subdued);

  p {
    margin: 0;
  }
}

.layout-blocks-error {
  .error-content {
    text-align: center;
    
    strong {
      display: block;
      margin-bottom: 8px;
    }
    
    p {
      margin-bottom: 16px;
    }
    
    .error-help {
      margin-top: 16px;
      text-align: left;
      background: var(--theme--background-subdued);
      padding: 16px;
      border-radius: var(--theme--border-radius);
      
      ol {
        margin: 8px 0 0 20px;
      }
    }
  }
}

.layout-blocks-new-item,
.layout-blocks-setup {
  padding: 20px;

  .notice-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    
    .v-icon {
      margin-top: 2px;
    }
    
    strong {
      display: block;
      margin-bottom: 4px;
    }
    
    p {
      margin: 0;
      color: var(--theme--foreground-subdued);
    }
  }
}

.layout-blocks-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.toolbar-sentinel {
  height: 0;
}

.layout-blocks-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--theme--form--field--input--padding, 12px) 0;
  flex-shrink: 0;
  /* Sticky so the view toggle and area selector stay reachable while scrolling,
     and to show a subtle shadow once stuck (like Directus' own header-bar).
     Pinned below Directus' own sticky header-bar via its --header-bar-height
     variable. Note: sticking does NOT cancel the v-menu's focus-return scroll,
     so the grid's "jump to area" still defers its scroll (see GridView). */
  position: sticky;
  top: var(--header-bar-height, 61px);
  z-index: 2;
  background: var(--theme--background);
  transition: box-shadow 0.2s;

  /* Separation only once stuck (border + subtle elevation, like Directus' own
     header-bar). At rest the toolbar blends into the page — no bottom line/shadow,
     which otherwise reads as a stray drop-shadow when nothing is scrolled under it. */
  &.is-stuck {
    border-bottom: var(--theme--border-width) solid var(--theme--border-color);
    box-shadow: var(--theme--header--box-shadow);
  }

  /* Reduced motion (a11y §5): no shadow transition. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-center {
    flex: 1;
    justify-content: center;
  }

  /* View-mode toggle (Grid/List): replaces the bare <v-button-group> element,
     which is not a registered Directus component (it rendered as an unstyled
     literal element, so the two icon buttons sat edge-to-edge with no gap). */
  .lb-view-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* Area selector trigger (v-menu activator): a native v-button showing the
     active area label + count. Switches the area context (drives the view's
     v-model:selected-area). */
  .area-select {
    &__label {
      font-weight: 600;
    }

    &__count {
      margin-left: 6px;
    }
  }
}

.layout-blocks-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.drawer-content {
  padding: 20px;
  min-height: 400px;
}

/* Wrapper so multiple drawer header actions survive Directus's
   .action-buttons > :not(:last-child) { display: none } rule. */
.drawer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

</style>