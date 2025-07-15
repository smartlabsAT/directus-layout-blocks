<template>
  <div class="area-manager">
    <div class="manager-header">
      <h3>Manage Layout Areas</h3>
      <p>Configure areas for your layout blocks</p>
    </div>

    <div class="manager-content">
      <div class="area-section">
        <div class="section-header">
          <h4>Areas</h4>
          <v-button small @click="addArea">
            <v-icon name="add" small left />
            Add Area
          </v-button>
        </div>

        <div v-if="areas.length > 0" class="areas-table-wrapper">
          <table class="areas-table">
            <thead>
              <tr>
                <th style="width: 40px"></th>
                <th style="width: 60px">Icon</th>
                <th>Label</th>
                <th>ID</th>
                <th style="width: 150px">Width</th>
                <th style="width: 100px">Max Items</th>
                <th>Allowed Collections</th>
                <th style="width: 60px">Actions</th>
              </tr>
            </thead>
            <draggable
              v-model="areas"
              tag="tbody"
              item-key="id"
              handle=".drag-handle"
              @change="validateAreas"
            >
              <template #item="{ element: area, index }">
                <tr :key="area.id">
                  <td class="drag-cell">
                    <div v-if="!area.locked" class="drag-handle">
                      <v-icon name="drag_handle" />
                    </div>
                    <v-icon 
                      v-else
                      name="lock"
                      small
                    />
                  </td>
                  
                  <td class="icon-cell">
                    <v-menu v-if="!area.locked" show-arrow placement="bottom">
                      <template #activator="{ toggle }">
                        <v-button icon x-small @click="toggle">
                          <v-icon :name="area.icon || 'dashboard_customize'" />
                        </v-button>
                      </template>
                      <icon-picker v-model="area.icon" />
                    </v-menu>
                    <v-icon 
                      v-else
                      :name="area.icon || 'dashboard_customize'"
                      small
                    />
                  </td>
                  
                  <!-- Label Field -->
                  <td>
                    <div 
                      v-if="editingField !== `${index}-label`"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      @dblclick="!area.locked && startEdit(`${index}-label`, area.label)"
                    >
                      {{ area.label || 'Click to edit' }}
                    </div>
                    <v-input
                      v-else
                      v-model="editingValue"
                      placeholder="Area Label"
                      :error="getFieldError(index, 'label')"
                      @blur="saveEdit(area, 'label')"
                      @keydown.enter="saveEdit(area, 'label')"
                      @keydown.esc="cancelEdit"
                      autofocus
                    />
                  </td>
                  
                  <!-- ID Field -->
                  <td>
                    <div 
                      v-if="editingField !== `${index}-id`"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      @dblclick="!area.locked && startEdit(`${index}-id`, area.id)"
                    >
                      {{ area.id || 'Click to edit' }}
                    </div>
                    <v-input
                      v-else
                      v-model="editingValue"
                      placeholder="area-id"
                      :error="getFieldError(index, 'id')"
                      @blur="saveEdit(area, 'id', true)"
                      @keydown.enter="saveEdit(area, 'id', true)"
                      @keydown.esc="cancelEdit"
                      autofocus
                    />
                  </td>
                  
                  <!-- Width Field -->
                  <td>
                    <div 
                      v-if="editingField !== `${index}-width`"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      @dblclick="!area.locked && startEditWidth(`${index}-width`, area)"
                    >
                      {{ getWidthLabel(area.width) }}
                    </div>
                    <v-select
                      v-else
                      v-model="editingValue"
                      :items="widthOptions"
                      @update:model-value="saveEditWidth(area)"
                      @blur="cancelEdit"
                      @keydown.esc="cancelEdit"
                    />
                  </td>
                  
                  <!-- Max Items Field -->
                  <td>
                    <div 
                      v-if="editingField !== `${index}-maxItems`"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      @dblclick="!area.locked && startEdit(`${index}-maxItems`, area.maxItems || '')"
                    >
                      {{ area.maxItems || '∞' }}
                    </div>
                    <v-input
                      v-else
                      v-model.number="editingValue"
                      type="number"
                      placeholder="Max"
                      :min="0"
                      @blur="saveEdit(area, 'maxItems')"
                      @keydown.enter="saveEdit(area, 'maxItems')"
                      @keydown.esc="cancelEdit"
                      autofocus
                    />
                  </td>
                  
                  <!-- Allowed Collections -->
                  <td class="collections-cell">
                    <div class="collections-list">
                      <div v-if="area.allowedTypes && area.allowedTypes.length > 0" class="collection-tags">
                        <v-chip
                          v-for="collection in area.allowedTypes"
                          :key="collection"
                          small
                          close
                          :disabled="area.locked"
                          @close="!area.locked && removeCollection(area, collection)"
                        >
                          {{ getCollectionLabel(collection) }}
                        </v-chip>
                      </div>
                      <div v-else class="no-collections">
                        All collections
                      </div>
                      <v-menu 
                        v-if="!area.locked && getAvailableCollectionsForArea(area).length > 0"
                        show-arrow 
                        placement="bottom-start"
                      >
                        <template #activator="{ toggle }">
                          <v-button 
                            x-small 
                            icon
                            @click="toggle"
                          >
                            <v-icon name="add" />
                          </v-button>
                        </template>
                        <v-list>
                          <v-list-item
                            v-for="collection in getAvailableCollectionsForArea(area)"
                            :key="collection.value"
                            clickable
                            @click="addCollection(area, collection.value)"
                          >
                            <v-list-item-content>{{ collection.text }}</v-list-item-content>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </td>
                  
                  <td class="actions-cell">
                    <v-button
                      v-if="!area.locked"
                      icon
                      x-small
                      secondary
                      class="danger"
                      v-tooltip="'Remove area'"
                      @click="removeArea(index)"
                    >
                      <v-icon name="delete" />
                    </v-button>
                    <v-icon 
                      v-else
                      name="lock"
                      v-tooltip="'This area cannot be removed'"
                      small
                    />
                  </td>
                </tr>
              </template>
            </draggable>
          </table>
        </div>

        <div v-else class="empty-state">
          <p>No areas defined</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import draggable from 'vuedraggable';
import type { AreaConfig } from '../types';
import { validateAreaId, validateAreaConfig, sanitizeAreaId } from '../utils/validators';

// Props
interface Props {
  areas: AreaConfig[];
  defaultAreas: AreaConfig[];
  availableCollections?: Array<{ text: string; value: string }>;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:areas': [areas: AreaConfig[]];
  'close': [];
}>();

// Width options
const widthOptions = [
  { text: 'Full (100%)', value: 100 },
  { text: 'Half (50%)', value: 50 },
  { text: 'Third (33%)', value: 33 },
  { text: 'Quarter (25%)', value: 25 },
  { text: 'Two Thirds (66%)', value: 66 },
  { text: 'Three Quarters (75%)', value: 75 }
];

// State
const areas = ref<AreaConfig[]>([]);
const errors = ref<Record<string, string[]>>({});
const editingField = ref<string | null>(null);
const editingValue = ref<any>(null);

// Initialize areas on mount
onMounted(() => {
  areas.value = [...props.areas];
});

// Computed
const hasErrors = computed(() => {
  return Object.keys(errors.value).length > 0;
});

// Methods
function addArea() {
  const newArea: AreaConfig = {
    id: `area-${Date.now()}`,
    label: 'New Area',
    icon: 'dashboard_customize'
  };
  
  areas.value.push(newArea);
  validateAreas();
}

function removeArea(index: number) {
  areas.value.splice(index, 1);
  validateAreas();
}

function validateAreas() {
  const newErrors: Record<string, string[]> = {};
  
  // Check for duplicate IDs
  const ids = new Set<string>();
  
  areas.value.forEach((area, index) => {
    const areaErrors = validateAreaConfig(area);
    
    if (areaErrors.length > 0) {
      newErrors[`area-${index}`] = areaErrors;
    }
    
    // Check for duplicate ID
    if (ids.has(area.id)) {
      if (!newErrors[`area-${index}`]) {
        newErrors[`area-${index}`] = [];
      }
      newErrors[`area-${index}`].push('Duplicate area ID');
    }
    
    ids.add(area.id);
  });
  
  errors.value = newErrors;
}

function getFieldError(index: number, field: string): string | undefined {
  const areaErrors = errors.value[`area-${index}`];
  if (!areaErrors) return undefined;
  
  // Find error related to this field
  if (field === 'id') {
    return areaErrors.find(e => e.includes('ID')) || areaErrors[0];
  }
  if (field === 'label') {
    return areaErrors.find(e => e.includes('label'));
  }
  
  return undefined;
}

// Inline editing functions
function startEdit(fieldKey: string, value: any) {
  editingField.value = fieldKey;
  editingValue.value = value;
}

function startEditWidth(fieldKey: string, area: AreaConfig) {
  editingField.value = fieldKey;
  editingValue.value = area.width || 100;
}

function saveEdit(area: AreaConfig, field: string, sanitize = false) {
  if (field === 'id' && sanitize) {
    area[field] = sanitizeAreaId(editingValue.value);
  } else {
    area[field] = editingValue.value;
  }
  
  cancelEdit();
  validateAreas();
}

function saveEditWidth(area: AreaConfig) {
  area.width = editingValue.value;
  cancelEdit();
  validateAreas();
}

function cancelEdit() {
  editingField.value = null;
  editingValue.value = null;
}

// Collection management
function getCollectionLabel(collection: string): string {
  const found = props.availableCollections?.find(c => c.value === collection);
  return found?.text || collection;
}

function getAvailableCollectionsForArea(area: AreaConfig): Array<{ text: string; value: string }> {
  if (!props.availableCollections) return [];
  
  const usedCollections = area.allowedTypes || [];
  return props.availableCollections.filter(c => !usedCollections.includes(c.value));
}

function addCollection(area: AreaConfig, collection: string) {
  if (!area.allowedTypes) {
    area.allowedTypes = [];
  }
  area.allowedTypes.push(collection);
  validateAreas();
}

function removeCollection(area: AreaConfig, collection: string) {
  if (!area.allowedTypes) return;
  
  const index = area.allowedTypes.indexOf(collection);
  if (index > -1) {
    area.allowedTypes.splice(index, 1);
  }
  
  // If no collections left, remove the array
  if (area.allowedTypes.length === 0) {
    delete area.allowedTypes;
  }
  
  validateAreas();
}

// Width label helper
function getWidthLabel(width?: number): string {
  if (!width) return 'Full (100%)';
  const option = widthOptions.find(w => w.value === width);
  return option?.text || `${width}%`;
}

// Save function
function save() {
  validateAreas();
  
  if (!hasErrors.value) {
    emit('update:areas', [...areas.value]);
    emit('close');
  }
}

// Icon picker placeholder
const IconPicker = {
  template: `
    <div class="icon-picker">
      <p style="padding: 12px; color: var(--foreground-subdued);">
        Icon picker not implemented
      </p>
    </div>
  `
};

// Expose for parent
defineExpose({
  save,
  hasErrors
});
</script>

<style lang="scss" scoped>
.area-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.manager-header {
  text-align: center;
  margin-bottom: 24px;

  h3 {
    margin: 0 0 8px;
  }

  p {
    margin: 0;
    color: var(--foreground-subdued);
  }
}

.manager-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.area-section {
  h4 {
    margin: 0 0 16px;
    color: var(--foreground-subdued);
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
}

.areas-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border-subdued);
  border-radius: var(--border-radius);
  background: var(--background-page);
}

.areas-table {
  width: 100%;
  border-collapse: collapse;
  
  thead {
    background: var(--background-normal-alt);
    
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: var(--foreground-subdued);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 2px solid var(--border-normal);
    }
  }
  
  tbody {
    tr {
      border-bottom: 1px solid var(--border-subdued);
      background: var(--background-page);
      transition: background-color 0.2s;
      
      &:hover {
        background: var(--background-normal);
      }
      
      &:last-child {
        border-bottom: none;
      }
    }
    
    td {
      padding: 8px 12px;
      vertical-align: middle;
      
      &.drag-cell {
        padding: 8px;
        width: 40px;
      }
      
      &.icon-cell {
        width: 60px;
        text-align: center;
      }
      
      &.actions-cell {
        text-align: center;
        width: 60px;
      }
      
      &.collections-cell {
        padding: 8px;
      }
      
      .v-input {
        margin: 0;
      }
      
      .v-select {
        margin: 0;
      }
    }
  }
}

.drag-handle {
  cursor: grab;
  color: var(--foreground-subdued);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  
  &:active {
    cursor: grabbing;
  }
  
  &:hover {
    color: var(--foreground-normal);
  }
}

.editable-value {
  padding: 6px 10px;
  border-radius: var(--border-radius);
  cursor: pointer;
  user-select: none;
  min-height: 32px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  
  &:not(.locked):hover {
    background: var(--background-normal-alt);
    box-shadow: inset 0 0 0 1px var(--border-normal);
  }
  
  &.locked {
    cursor: default;
    color: var(--foreground-subdued);
  }
}

.collections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  
  .collection-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .no-collections {
    color: var(--foreground-subdued);
    font-style: italic;
    font-size: 13px;
    padding: 4px 0;
  }
  
  .v-button {
    margin-top: 4px;
  }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--foreground-subdued);
}

.danger {
  --v-button-background-color-hover: var(--danger-10);
  --v-button-color-hover: var(--danger);
}
</style>