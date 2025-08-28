<template>
  <div class="layout-blocks-interface">
    <!-- Loading State -->
    <div v-if="loading" class="layout-blocks-loading">
      <v-progress-circular indeterminate />
      <p>Loading layout blocks...</p>
    </div>

    <!-- Setup State -->
    <div v-else-if="!isSetupComplete && options.autoSetup" class="layout-blocks-setup">
      <v-progress-circular indeterminate />
      <p>Setting up layout blocks fields...</p>
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
    <div v-else class="layout-blocks-container">
      <!-- Toolbar -->
      <div class="layout-blocks-toolbar">
        <div class="toolbar-left">
          <v-button
            v-if="options.enableAreaManagement"
            v-tooltip="'Manage areas'"
            icon
            rounded
            secondary
            @click="showAreaManager = true"
          >
            <v-icon name="dashboard_customize" />
          </v-button>
        </div>

        <div class="toolbar-center">
          <div v-if="selectedArea" class="selected-area-info">
            <v-icon 
              v-if="selectedAreaConfig?.icon" 
              :name="selectedAreaConfig.icon" 
              small 
            />
            <span>{{ selectedAreaConfig?.label || selectedArea }}</span>
            <v-chip small>{{ getBlocksForArea(selectedArea).length }}</v-chip>
          </div>
        </div>

        <div class="toolbar-right">
          <v-button-group>
            <v-button
              v-tooltip="'Grid view'"
              :secondary="viewMode !== 'grid'"
              icon
              small
              @click="viewMode = 'grid'"
            >
              <v-icon name="grid_view" />
            </v-button>
            <v-button
              v-tooltip="'List view'"
              :secondary="viewMode !== 'list'"
              icon
              small
              @click="viewMode = 'list'"
            >
              <v-icon name="view_list" />
            </v-button>
          </v-button-group>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="layout-blocks-content">
        <component
          :is="viewComponent"
          v-model:blocks="blocks"
          v-model:selectedArea="selectedArea"
          :areas="computedAreas"
          :options="options"
          :junction-info="junctionInfo"
          :permissions="permissions"
          :loading="blocksLoading"
          @move-block="handleMoveBlock"
          @remove-block="handleRemoveBlock"
          @update-block="handleUpdateBlock"
          @duplicate-block="handleDuplicateBlock"
          @add-block="openBlockCreator"
        />
      </div>

      <!-- Block Creator Modal -->
      <v-dialog
        v-model="showBlockCreator"
        :title="null"
        persistent
      >
        <template #default>
          <block-creator
            v-if="showBlockCreator"
            :areas="computedAreas"
            :selected-area="selectedArea"
            :allowed-collections="allowedCollections"
            :junction-info="junctionInfo"
            @create="handleCreateBlock"
            @cancel="showBlockCreator = false"
          />
        </template>
      </v-dialog>
      
      <!-- Edit Drawer mit v-form und eigenen Buttons -->
      <v-drawer
        v-model="drawerActive"
        :title="editingCollection ? `Edit ${getCollectionLabel(editingCollection)}` : 'Edit Block'"
        icon="edit"
        persistent
        @cancel="handleDrawerCancel"
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
        icon="dashboard_customize"
        persistent
        @cancel="showAreaManager = false"
      >
        <area-manager
          v-if="showAreaManager"
          ref="areaManagerRef"
          :areas="allConfiguredAreas"
          :default-areas="options.areas || []"
          :available-collections="formattedAllowedCollections"
          @update:areas="handleAreasUpdate"
          @close="showAreaManager = false"
        />
        
        <template #actions>
          <v-button secondary @click="showAreaManager = false">
            Cancel
          </v-button>
          <v-button @click="saveAreas">
            Save Areas
          </v-button>
        </template>
      </v-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from './utils/logger';
import { ref, computed, watch, onMounted, inject, resolveComponent, nextTick, useAttrs, getCurrentInstance } from 'vue';
import { useApi, useStores, useCollection } from '@directus/extensions-sdk';
import { useJunctionDetection } from './composables/useJunctionDetection';
import { useAutoSetup } from './composables/useAutoSetup';
import { useBlocks } from './composables/useBlocks';
import { usePermissions } from './composables/usePermissions';
import { DEFAULT_OPTIONS, DEFAULT_AREA_CONFIG } from './utils/constants';
import { CUSTOM_AREAS, USE_CUSTOM_AREAS } from './config/areas';
import type { 
  LayoutBlocksOptions, 
  JunctionInfo, 
  BlockItem,
  AreaConfig 
} from './types';

// Import components (we'll create these next)
import GridView from './components/GridView.vue';
import ListView from './components/ListView.vue';
import AreaManager from './components/AreaManager.vue';
import BlockCreator from './components/BlockCreator.vue';

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

// Resolve drawer-item component
const DrawerItem = resolveComponent('drawer-item');

const notifications = stores.useNotificationsStore();
const fieldsStore = stores.useFieldsStore();
const collectionsStore = stores.useCollectionsStore();

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
const viewMode = ref(options.value.viewMode);
const selectedArea = ref<string | null>(null);
const showBlockCreator = ref(false);
const showAreaManager = ref(false);
const customAreas = ref<AreaConfig[]>([]);
const drawerActive = ref(false);
const editingId = ref<string | number | null>(null);
const editingCollection = ref<string>('');
const editingValues = ref<any>({});
const editSaving = ref(false);
const editForm = ref<any>(null);
const fieldOptions = ref<any>(null);
const areaManagerRef = ref<any>(null);

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
const { detectJunctionStructure } = useJunctionDetection();
const { ensureRequiredFields, validateSetup } = useAutoSetup();
const { checkPermissions } = usePermissions();

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
  createBlock,
  updateBlock,
  moveBlock,
  removeBlock,
  duplicateBlock
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

// Format allowed collections for the AreaManager
const formattedAllowedCollections = computed(() => {
  // Get the allowed collections from the computed property
  const allowed = allowedCollections.value;
  
  // If no collections are allowed, return empty array
  if (!allowed || allowed.length === 0) {
    return [];
  }
  
  // Get collection details from collectionsStore if available
  const collections = collectionsStore.collections;
  
  // Format the collections
  const formatted = allowed.map(collectionName => {
    const collection = collections?.[collectionName];
    return {
      text: collection?.name || collectionName
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      value: collectionName
    };
  });
  
  return formatted;
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

    // 1. Detect junction structure
    logger.log('🚀 Interface: Detecting junction structure...');
    junctionInfo.value = await detectJunctionStructure(
      props.collection,
      props.field
    );
    logger.log('🚀 Interface: Junction info detected:', junctionInfo.value);

    // 2. Ensure required fields exist
    if (options.value.autoSetup) {
      const setupResult = await ensureRequiredFields(
        junctionInfo.value,
        options.value
      );

      if (!setupResult.success && setupResult.errors.length > 0) {
        throw setupResult.errors[0];
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
  
  try {
    blocksLoading.value = true;
    logger.log('🟢 Calling createBlock...');
    const newBlock = await createBlock(data.area, data.collection, data.item);
    logger.log('🟢 Block created successfully:', newBlock);
    
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

async function handleMoveBlock(data: {
  blockId: number;
  fromArea: string;
  toArea: string;
  toIndex: number;
}) {
  try {
    await moveBlock(
      data.blockId,
      data.fromArea,
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
    // Find the block to get its collection and item ID
    const block = blocks.value.find(b => b.id === data.blockId);
    if (!block) {
      throw new Error('Block not found');
    }
    
    if (!block.item?.id) {
      throw new Error('Block item ID not found');
    }
    
    logger.log('🔵 Opening Directus drawer for:', {
      collection: block.collection,
      itemId: block.item.id
    });
    
    // Set the editing info
    editingCollection.value = block.collection;
    editingId.value = block.item.id;
    
    // Load the current values for the form
    logger.log('🔵 Loading block data for edit');
    const response = await api.get(`/items/${block.collection}/${block.item.id}`);
    editingValues.value = response.data.data;
    
    logger.log('🔵 Opening drawer with data:', editingValues.value);
    
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

async function handleBlockStatusUpdate(blockId: number, newStatus: string) {
  logger.log('🔵 Updating block status:', blockId, 'to', newStatus);
  
  try {
    // Find the block
    const block = blocks.value.find(b => b.id === blockId);
    if (!block) {
      throw new Error('Block not found');
    }
    
    if (!block.item?.id) {
      throw new Error('Block item ID not found');
    }
    
    // Send PATCH request to update status
    await api.patch(`/items/${block.collection}/${block.item.id}`, {
      status: newStatus
    });
    
    logger.log('✅ Status updated successfully');
    
    notifications.add({
      title: 'Status Updated',
      text: `Block status changed to ${newStatus}`,
      type: 'success'
    });
    
    // Update local block data
    if (block.item) {
      block.item.status = newStatus;
    }
    
    // Reload blocks to ensure consistency
    await loadBlocks();
    
  } catch (error: any) {
    logger.error('🔴 Error updating status:', error);
    notifications.add({
      title: 'Error Updating Status',
      text: error.message || 'Failed to update block status',
      type: 'error'
    });
  }
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

// Save block directly via API
async function saveBlockDirectly() {
  if (!editingId.value || !editingCollection.value || !editingValues.value) return;
  
  editSaving.value = true;
  
  try {
    logger.log('💾 Saving block directly to API:', {
      collection: editingCollection.value,
      id: editingId.value,
      values: editingValues.value
    });
    
    // Send PATCH request to update the item
    await api.patch(`/items/${editingCollection.value}/${editingId.value}`, editingValues.value);
    
    logger.log('✅ Block saved successfully');
    
    notifications.add({
      title: 'Block Updated',
      text: 'Changes have been saved successfully',
      type: 'success'
    });
    
    // Close drawer
    drawerActive.value = false;
    
    // Reset editing state
    editingId.value = null;
    editingCollection.value = '';
    editingValues.value = {};
    
    // Reload blocks to show changes
    await loadBlocks();
    
  } catch (error: any) {
    logger.error('🔴 Error saving block:', error);
    notifications.add({
      title: 'Error Saving Block',
      text: error.message || 'Failed to save block',
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


async function handleRemoveBlock(blockId: number) {
  try {
    await removeBlock(blockId);
    
    notifications.add({
      title: 'Block Removed',
      type: 'success'
    });
  } catch (error) {
    notifications.add({
      title: 'Error Removing Block',
      text: error.message || 'Failed to remove block',
      type: 'error'
    });
  }
}

async function handleDuplicateBlock(blockId: number) {
  try {
    blocksLoading.value = true;
    await duplicateBlock(blockId);
    
    notifications.add({
      title: 'Block Duplicated',
      type: 'success'
    });
  } catch (error) {
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
        logger.log(`Interface: Processing block ${block.id} for orphaning`);
        try {
          // Update the junction record to remove its area assignment
          // We need to update the junction table, not the content item
          if (!junctionInfo.value) {
            logger.error('Interface: No junction info available for orphaning!');
            continue;
          }
          
          const areaField = options.value.areaField || 'area';
          // Instead of setting to null, move to 'orphaned' area
          const updateData = { [areaField]: 'orphaned' };
          
          logger.log(`Interface: Preparing to orphan block ${block.id}`, {
            collection: junctionInfo.value.collection,
            blockId: block.id,
            blockData: block,
            areaField: areaField,
            updateData: updateData
          });
            
            try {
              const response = await api.patch(
                `/items/${junctionInfo.value.collection}/${block.id}`,
                updateData
              );
              
              logger.log(`Interface: Block ${block.id} orphaned successfully`, response);
              
              // Update local state immediately
              const blockIndex = blocks.value.findIndex(b => b.id === block.id);
              if (blockIndex !== -1) {
                blocks.value[blockIndex].area = 'orphaned';
              }
            } catch (patchError: any) {
              logger.error(`Interface: PATCH request failed:`, {
                url: `/items/${junctionInfo.value.collection}/${block.id}`,
                updateData: updateData,
                error: patchError,
                status: patchError.response?.status,
                statusText: patchError.response?.statusText,
                responseData: patchError.response?.data,
                message: patchError.message
              });
              throw patchError;
            }
        } catch (error: any) {
          logger.error(`Interface: Error orphaning block ${block.id}:`);
          logger.error('Full error object:', error);
          logger.error('Error message:', error?.message);
          
          // Most importantly, check the API response
          if (error?.response?.data) {
            logger.error('API Error Response:', error.response.data);
            if (error.response.data.errors) {
              error.response.data.errors.forEach((err: any) => {
                logger.error('API Error Detail:', err);
              });
            }
          }
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
function saveAreas() {
  if (areaManagerRef.value) {
    areaManagerRef.value.save();
  }
  
  // The area manager will emit the update:areas event which updates customAreas
  // and then close itself, which will set showAreaManager to false
}

// Watch for external value changes
watch(() => props.value, (newValue) => {
  if (JSON.stringify(newValue) !== JSON.stringify(blocks.value)) {
    loadBlocks();
  }
}, { deep: true });

// Emit changes
watch(blocks, (newBlocks) => {
  emit('input', newBlocks);
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
.layout-blocks-setup,
.layout-blocks-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--spacing);
  color: var(--foreground-subdued);

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
      background: var(--background-subdued);
      padding: 16px;
      border-radius: var(--border-radius);
      
      ol {
        margin: 8px 0 0 20px;
      }
    }
  }
}

.layout-blocks-new-item {
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
      color: var(--foreground-subdued);
    }
  }
}

.layout-blocks-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.layout-blocks-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-normal);
  flex-shrink: 0;

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

  .selected-area-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    background: var(--background-subdued);
    border-radius: var(--border-radius);
    font-size: 14px;
    color: var(--foreground-subdued);
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

</style>