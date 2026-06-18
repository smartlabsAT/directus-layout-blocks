<template>
  <div ref="rootEl" class="area-manager">
    <div class="manager-content">
      <div class="area-section">
        <!-- "Add area" lives in the drawer body (CI: the drawer header keeps a
             single native round Save action). -->
        <div class="area-section-toolbar">
          <v-button secondary small @click="addArea">
            <v-icon name="add" left />
            Add area
          </v-button>
        </div>

        <div v-if="localAreas.length > 0" class="areas-table-wrapper">
          <table class="areas-table">
            <thead>
              <tr>
                <th style="width: 40px"></th>
                <th style="width: 60px">Icon</th>
                <th>Label</th>
                <th>ID</th>
                <th style="width: 150px">Width</th>
                <th style="width: 100px">Max Items</th>
                <th>Collections</th>
                <th style="width: 90px">Actions</th>
              </tr>
            </thead>
            <draggable
              v-model="localAreas"
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
                      aria-label="locked"
                    />
                  </td>

                  <td class="icon-cell">
                    <!-- Curated icon picker: a compact v-button trigger opens a
                         v-icon grid (AREA_ICON_CHOICES). Chosen over the native
                         interface-select-icon, whose teleported, full-width,
                         virtual-scrolled menu does not fit this table cell (#64).
                         Uncontrolled v-menu (activator `toggle`) + v-list-item —
                         the same proven pattern as the allowed-collections menu
                         below; the menu closes itself on item click. Locked rows
                         show a static icon (no editing). -->
                    <v-menu
                      v-if="!area.locked"
                      show-arrow
                      placement="bottom-start"
                    >
                      <template #activator="{ toggle, active }">
                        <v-button
                          icon
                          x-small
                          v-btn-aria="{ 'aria-label': 'Choose area icon', 'aria-haspopup': 'menu', 'aria-expanded': active }"
                          @click="toggle"
                        >
                          <v-icon :name="area.icon || 'dashboard_customize'" />
                        </v-button>
                      </template>
                      <v-list class="icon-picker-grid">
                        <v-list-item
                          v-for="choice in AREA_ICON_CHOICES"
                          :key="choice"
                          clickable
                          :active="(area.icon || 'dashboard_customize') === choice"
                          class="icon-choice"
                          v-tooltip="choice"
                          :aria-label="choice"
                          @click="pickAreaIcon(area, choice)"
                        >
                          <v-icon :name="choice" />
                        </v-list-item>
                      </v-list>
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
                      v-if="!isEditing(index, 'label')"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      :tabindex="area.locked ? -1 : 0"
                      role="button"
                      :aria-disabled="area.locked || undefined"
                      :aria-label="area.locked ? `Label (locked): ${area.label}` : `Edit label: ${area.label || 'empty'}`"
                      @dblclick="!area.locked && beginEdit(index, 'label', area)"
                      @keydown="onValueKeydown($event, index, 'label', area)"
                    >
                      <span class="value-text value-text--label">{{ area.label || 'Click to edit' }}</span>
                      <v-icon
                        v-if="!area.locked"
                        class="edit-pencil"
                        name="edit"
                        small
                        @click.stop="beginEdit(index, 'label', area)"
                      />
                    </div>
                    <v-input
                      v-else
                      :ref="captureInput"
                      v-model="editingValue"
                      placeholder="Area Label"
                      :error="getFieldError(index, 'label')"
                      autofocus
                      @blur="onInputBlur(area, 'label')"
                      @keydown.enter.stop="commitCurrentField(area)"
                      @keydown.tab="onInputTab($event, area, index, 'label')"
                      @keydown.esc.stop="cancelEdit"
                    />
                  </td>

                  <!-- ID Field -->
                  <td>
                    <div
                      v-if="!isEditing(index, 'id')"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      :tabindex="area.locked ? -1 : 0"
                      role="button"
                      :aria-disabled="area.locked || undefined"
                      :aria-label="area.locked ? `ID (locked): ${area.id}` : `Edit ID: ${area.id || 'empty'}`"
                      @dblclick="!area.locked && beginEdit(index, 'id', area)"
                      @keydown="onValueKeydown($event, index, 'id', area)"
                    >
                      <span class="value-text">{{ area.id || 'Click to edit' }}</span>
                      <v-icon
                        v-if="!area.locked"
                        class="edit-pencil"
                        name="edit"
                        small
                        @click.stop="beginEdit(index, 'id', area)"
                      />
                    </div>
                    <v-input
                      v-else
                      :ref="captureInput"
                      v-model="editingValue"
                      placeholder="area-id"
                      :error="getFieldError(index, 'id')"
                      autofocus
                      @blur="onInputBlur(area, 'id')"
                      @keydown.enter.stop="commitCurrentField(area)"
                      @keydown.tab="onInputTab($event, area, index, 'id')"
                      @keydown.esc.stop="cancelEdit"
                    />
                  </td>

                  <!-- Width Field -->
                  <td>
                    <div
                      v-if="!isEditing(index, 'width')"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      :tabindex="area.locked ? -1 : 0"
                      role="button"
                      :aria-disabled="area.locked || undefined"
                      :aria-label="area.locked ? `Width (locked): ${getWidthLabel(area.width)}` : `Edit width: ${getWidthLabel(area.width)}`"
                      @dblclick="!area.locked && beginEdit(index, 'width', area)"
                      @keydown="onValueKeydown($event, index, 'width', area)"
                    >
                      <span class="value-text">{{ getWidthLabel(area.width) }}</span>
                      <v-icon
                        v-if="!area.locked"
                        class="edit-pencil"
                        name="edit"
                        small
                        @click.stop="beginEdit(index, 'width', area)"
                      />
                    </div>
                    <v-select
                      v-else
                      :ref="captureInput"
                      v-model="editingValue"
                      :items="WIDTH_OPTIONS"
                      @update:model-value="saveEditWidth(area)"
                      @blur="onWidthBlur"
                      @keydown.tab="onInputTab($event, area, index, 'width')"
                      @keydown.esc.stop="cancelEdit"
                    />
                  </td>

                  <!-- Max Items Field -->
                  <td>
                    <div
                      v-if="!isEditing(index, 'maxItems')"
                      class="editable-value"
                      :class="{ 'locked': area.locked }"
                      :tabindex="area.locked ? -1 : 0"
                      role="button"
                      :aria-disabled="area.locked || undefined"
                      :aria-label="area.locked ? `Max items (locked): ${area.maxItems || 'unlimited'}` : `Edit max items: ${area.maxItems || 'unlimited'}`"
                      @dblclick="!area.locked && beginEdit(index, 'maxItems', area)"
                      @keydown="onValueKeydown($event, index, 'maxItems', area)"
                    >
                      <span class="value-text">{{ area.maxItems || '∞' }}</span>
                      <v-icon
                        v-if="!area.locked"
                        class="edit-pencil"
                        name="edit"
                        small
                        @click.stop="beginEdit(index, 'maxItems', area)"
                      />
                    </div>
                    <v-input
                      v-else
                      :ref="captureInput"
                      v-model="editingValue"
                      type="number"
                      placeholder="Max"
                      :min="0"
                      autofocus
                      @blur="onInputBlur(area, 'maxItems')"
                      @keydown.enter.stop="commitCurrentField(area)"
                      @keydown.tab="onInputTab($event, area, index, 'maxItems')"
                      @keydown.esc.stop="cancelEdit"
                    />
                  </td>

                  <!-- Allowed Collections -->
                  <td class="collections-cell">
                    <div class="collections-list">
                      <div class="collection-tags">
                        <template v-if="area.allowedTypes && area.allowedTypes.length > 0">
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
                        </template>
                        <!-- No restriction = a non-removable "All collections" chip,
                             so empty and filled cells stay visually consistent. -->
                        <v-chip v-else small class="all-collections-chip">
                          All collections
                        </v-chip>
                      </div>
                      <v-menu
                        v-if="!area.locked && getAvailableCollectionsForArea(area).length > 0"
                        show-arrow
                        placement="bottom-start"
                      >
                        <template #activator="{ toggle, active }">
                          <v-button
                            x-small
                            icon
                            secondary
                            v-btn-aria="{ 'aria-label': 'Add allowed collection', 'aria-haspopup': 'menu', 'aria-expanded': active }"
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
                            <v-list-item-icon>
                              <v-icon :name="collection.icon || 'box'" small />
                            </v-list-item-icon>
                            <v-list-item-content>{{ collection.text }}</v-list-item-content>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </td>

                  <td class="actions-cell">
                    <!-- Lock/unlock toggle: ALWAYS rendered so a locked area can be
                         unlocked again. The orphaned area is system-locked and not
                         toggleable (disabled). -->
                    <v-button
                      v-tooltip="isOrphaned(area) ? 'This area cannot be unlocked' : (area.locked ? 'Unlock area' : 'Lock area')"
                      v-btn-aria="{
                        'aria-label': area.locked ? 'Unlock area' : 'Lock area',
                        'aria-pressed': !!area.locked,
                        'aria-disabled': isOrphaned(area) || undefined
                      }"
                      icon
                      x-small
                      secondary
                      :disabled="isOrphaned(area)"
                      @click="toggleLock(area, index)"
                    >
                      <v-icon :name="area.locked ? 'lock' : 'lock_open'" />
                    </v-button>
                    <v-button
                      v-if="!area.locked"
                      v-tooltip="'Remove area'"
                      v-btn-aria="{ 'aria-label': 'Remove area' }"
                      icon
                      x-small
                      secondary
                      class="danger"
                      @click="removeArea(area)"
                    >
                      <v-icon name="delete" />
                    </v-button>
                  </td>
                </tr>
              </template>
            </draggable>
          </table>
        </div>

        <EmptyState
          v-else
          icon="dashboard_customize"
          message='No areas defined yet — use "Add area" to create one.'
        />

        <!-- Communicates the one non-obvious lock effect: locking also freezes the
             area's blocks in the layout views. The row-level freeze (static fields,
             lock icon) is already visible, so it isn't repeated here. -->
        <p v-if="hasLockedAreas" class="locked-hint">
          <v-icon name="info" small />
          Locking an area also freezes its blocks — they can't be added, moved or reordered.
        </p>

        <!-- Single shared removal confirm (rendered once, outside the row loop):
             one instance driven by areaPendingRemoval, never one per row. -->
        <AreaDeleteConfirm
          :model-value="areaPendingRemoval !== null"
          :area-label="pendingArea?.label || pendingArea?.id || ''"
          :block-count="pendingBlockCount"
          @update:model-value="(open) => { if (!open) cancelRemove(); }"
          @confirm="confirmRemoveArea"
          @cancel="cancelRemove"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { vBtnAria } from '../directives/btnAria';
import EmptyState from './EmptyState.vue';
import AreaDeleteConfirm from './AreaDeleteConfirm.vue';
import { cloneDeep } from 'lodash-es';
import draggable from 'vuedraggable';
import type { AreaConfig, CollectionOption } from '../types';
import { WIDTH_OPTIONS, AREA_ICON_CHOICES, ORPHANED_AREA_ID } from '../utils/constants';
import { validateAreaConfig, sanitizeAreaId } from '../utils/validators';
import { logger } from '../utils/logger';

// Props
interface Props {
  areas: AreaConfig[];
  availableCollections?: CollectionOption[];
  // Map areaId -> block count, used for the removal orphan warning. Optional with
  // a safe default so the manager renders even if a parent omits it.
  blockCountsByArea?: Record<string, number>;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:areas': [areas: AreaConfig[]];
  'close': [];
}>();

// Inline-edit field model (issue #54).
// `EDITABLE_FIELDS` is the row's Tab traversal order (also the navigation set).
// `TextEditField` is the narrower set committed via `saveEdit` (a text/number
// `v-input`); `width` is excluded because it commits via its own `saveEditWidth`
// path (a `v-select`). Keeping the union tight avoids a TS7053 string-index write
// on `AreaConfig` — note `tsc` skips `.vue` scripts here, so this is review-only.
const EDITABLE_FIELDS = ['label', 'id', 'width', 'maxItems'] as const;
type EditableField = typeof EDITABLE_FIELDS[number];
type TextEditField = Exclude<EditableField, 'width'>;

// State — `localAreas` is the editable working copy of the `areas` prop (renamed
// from `areas` to avoid a prop/ref name collision that made the template binding
// ambiguous).
const localAreas = ref<AreaConfig[]>([]);
// Root element, used as a focus fallback after a removed row's trigger is gone.
const rootEl = ref<HTMLElement | null>(null);
const errors = ref<Record<string, string[]>>({});
// Index + field are tracked separately (not as a composite "i-field" string) so
// the Tab-advance logic never has to parse a key.
const editingArea = ref<number | null>(null);
const editingField = ref<EditableField | null>(null);
const editingValue = ref<string | number | null>(null);
// Suppresses the input's @blur commit while we programmatically move the edit to
// the next field on Tab — otherwise the trailing blur would immediately re-close
// the freshly opened field (and double-commit the previous one).
const isProgrammaticSwitch = ref(false);
// Initialize areas on mount
onMounted(() => {
  // Deep clone so inline edits stay isolated to the drawer until "Save Areas".
  // A plain spread would share the area objects with the parent, leaking edits
  // before save and making Cancel non-discarding.
  localAreas.value = cloneDeep(props.areas);
});

// Computed
const hasErrors = computed(() => {
  return Object.keys(errors.value).length > 0;
});

const hasLockedAreas = computed(() => {
  return localAreas.value.some(area => area.locked);
});

// Methods
function addArea() {
  const newArea: AreaConfig = {
    id: `area-${Date.now()}`,
    label: 'New Area',
    icon: 'dashboard_customize'
  };

  localAreas.value.push(newArea);
  validateAreas();
}

function isOrphaned(area: AreaConfig): boolean {
  return area.id === ORPHANED_AREA_ID;
}

// Toggle an area's lock from the editor. NOTE: locking freezes the WHOLE area —
// the row here AND its blocks in the layout views (add/move/drag all key off
// `locked`). The orphaned area is system-locked and never toggleable. If the row
// being locked is mid inline-edit, cancel that edit first so no commit lands on a
// now-locked area.
function toggleLock(area: AreaConfig, index: number) {
  if (isOrphaned(area)) return;
  if (!area.locked && editingArea.value === index) cancelEdit();
  area.locked = !area.locked;
  validateAreas();
}

// --- Area removal with confirmation ----------------------------------------
// A single shared confirm dialog (rendered once, outside the row loop) is driven
// by `areaPendingRemoval` (the area id, NOT an index — so a reorder can never
// retarget the wrong row) — never one dialog per row. `removeArea` only opens the
// dialog; `confirmRemoveArea` resolves the id and performs the splice.
const areaPendingRemoval = ref<string | null>(null);
const removeTrigger = ref<HTMLElement | null>(null);

const pendingArea = computed<AreaConfig | null>(() =>
  areaPendingRemoval.value === null
    ? null
    : (localAreas.value.find(a => a.id === areaPendingRemoval.value) ?? null)
);
const pendingBlockCount = computed<number>(() =>
  pendingArea.value ? (props.blockCountsByArea?.[pendingArea.value.id] ?? 0) : 0
);

function removeArea(area: AreaConfig) {
  // Remember the trigger so focus can return to it if the user cancels.
  const el = document.activeElement;
  removeTrigger.value = el instanceof HTMLElement ? el : null;
  areaPendingRemoval.value = area.id;
}

function confirmRemoveArea() {
  const id = areaPendingRemoval.value;
  if (id === null) return;
  const index = localAreas.value.findIndex(a => a.id === id);
  if (index === -1) {
    areaPendingRemoval.value = null;
    return;
  }
  const area = localAreas.value[index];
  localAreas.value.splice(index, 1);
  validateAreas();
  logger.log('Area removed', {
    areaId: area?.id,
    label: area?.label,
    blockCount: area ? (props.blockCountsByArea?.[area.id] ?? 0) : 0
  });
  areaPendingRemoval.value = null;
  // The trigger button was removed with its row → focus a stable fallback.
  restoreFocusAfterRemove(true);
}

function cancelRemove() {
  areaPendingRemoval.value = null;
  restoreFocusAfterRemove(false);
}

// Return focus after the dialog closes. On cancel the trigger still exists; on
// confirm it was removed with its row, so fall back to a stable anchor. The
// `document.contains` guard ensures focus never lands on a detached node.
function restoreFocusAfterRemove(triggerRemoved: boolean) {
  const el = removeTrigger.value;
  removeTrigger.value = null;
  // On cancel the trigger still exists → restore to it on the next tick.
  if (!triggerRemoved && el && document.contains(el)) {
    nextTick(() => { if (document.contains(el)) el.focus(); });
    return;
  }
  // On confirm the trigger row (and its focused button) is removed; the v-dialog
  // resets focus to <body> as it tears down, AFTER a single nextTick. Defer one
  // animation frame past that before moving focus to a stable fallback anchor.
  nextTick(() => requestAnimationFrame(() => {
    (rootEl.value?.querySelector<HTMLElement>('.actions-cell button')
      ?? rootEl.value?.querySelector<HTMLElement>('button'))?.focus();
  }));
}

// Picks an area's icon from the curated grid. Like the inline-edit mutators, this
// edits the local working copy; the parent only receives it on "Save Areas". The
// v-menu closes itself when a v-list-item is clicked (Directus default).
function pickAreaIcon(area: AreaConfig, icon: string) {
  area.icon = icon;
}

function validateAreas() {
  const newErrors: Record<string, string[]> = {};

  // Check for duplicate IDs
  const ids = new Set<string>();

  localAreas.value.forEach((area, index) => {
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

// Inline editing — state helpers
function isEditing(index: number, field: EditableField): boolean {
  return editingArea.value === index && editingField.value === field;
}

// Single entry point for entering edit mode (dblclick, pencil click, Enter/F2,
// Tab-advance). Routes `width` to its own select-based edit path.
function beginEdit(index: number, field: EditableField, area: AreaConfig) {
  if (area.locked) return;
  if (field === 'width') {
    startEditWidth(index, area);
    return;
  }
  const value =
    field === 'maxItems' ? (area.maxItems ?? '') :
    field === 'id' ? area.id :
    area.label;
  startEdit(index, field, value);
}

function startEdit(index: number, field: TextEditField, value: string | number | null) {
  editingArea.value = index;
  editingField.value = field;
  editingValue.value = value;
}

function startEditWidth(index: number, area: AreaConfig) {
  editingArea.value = index;
  editingField.value = 'width';
  editingValue.value = area.width ?? 100;
}

function saveEdit(area: AreaConfig, field: TextEditField) {
  if (field === 'id') {
    area.id = sanitizeAreaId(String(editingValue.value ?? ''));
  } else if (field === 'maxItems') {
    const n = Number(editingValue.value);
    area.maxItems = Number.isFinite(n) && n >= 0 ? n : undefined;
  } else {
    area.label = String(editingValue.value ?? '');
  }

  cancelEdit();
  validateAreas();
}

function saveEditWidth(area: AreaConfig) {
  area.width = typeof editingValue.value === 'number'
    ? editingValue.value
    : Number(editingValue.value);
  cancelEdit();
  validateAreas();
}

function cancelEdit() {
  editingArea.value = null;
  editingField.value = null;
  editingValue.value = null;
}

// Commit whatever field is currently being edited (routes width to its own path).
function commitCurrentField(area: AreaConfig) {
  if (editingField.value === 'width') {
    saveEditWidth(area);
  } else if (editingField.value) {
    saveEdit(area, editingField.value as TextEditField);
  }
}

// Tab inside an input: commit + open the next editable field of the row. On the
// last field we do nothing special — native Tab + @blur commit and move focus on.
function onInputTab(e: KeyboardEvent, area: AreaConfig, index: number, field: EditableField) {
  const next = EDITABLE_FIELDS[EDITABLE_FIELDS.indexOf(field) + 1];
  if (!next) return;

  e.preventDefault();
  isProgrammaticSwitch.value = true;
  commitCurrentField(area);
  beginEdit(index, next, area);
  nextTick(() => {
    isProgrammaticSwitch.value = false;
  });
}

function onInputBlur(area: AreaConfig, field: TextEditField) {
  // Skip during a programmatic Tab advance, and skip when the edit was already
  // ended (e.g. Esc → cancelEdit ran first, then the input's unmount fires a
  // trailing blur — committing here would write the just-nulled value as empty).
  if (isProgrammaticSwitch.value || editingArea.value === null) return;
  saveEdit(area, field);
}

function onWidthBlur() {
  if (isProgrammaticSwitch.value) return;
  cancelEdit();
}

// Enter / F2 on a resting value enters edit mode (the value carries tabindex=0).
function onValueKeydown(e: KeyboardEvent, index: number, field: EditableField, area: AreaConfig) {
  if (area.locked) return;
  if (e.key === 'Enter' || e.key === 'F2') {
    e.preventDefault();
    beginEdit(index, field, area);
  }
}

// Focus + select the inline edit control the moment it mounts. A function `:ref`
// fires after the element is in the DOM, so this is deterministic — more robust
// than a queued nextTick, where the ref-update order isn't guaranteed during a
// Tab advance (the old input may unmount after the new one mounts). Bound on the
// text v-inputs AND the width v-select (whose trigger is an <input>), so the Tab
// chain keeps focus across every field. `autofocus` is unreliable on v-if toggle.
function captureInput(el: unknown) {
  if (!el) return;
  const input = (el as { $el?: HTMLElement }).$el?.querySelector('input');
  if (input) {
    input.focus();
    input.select();
  }
}

// Collection management
function getCollectionLabel(collection: string): string {
  const found = props.availableCollections?.find(c => c.value === collection);
  return found?.text || collection;
}

function getAvailableCollectionsForArea(area: AreaConfig): CollectionOption[] {
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

// Width label helper — resolves against the shared WIDTH_OPTIONS source.
function getWidthLabel(width?: number): string {
  if (!width) return 'Full (100%)';
  const option = WIDTH_OPTIONS.find(w => w.value === width);
  return option?.text || `${width}%`;
}

// Save function
function save() {
  validateAreas();

  if (!hasErrors.value) {
    // The orphaned area is system-managed (injected at runtime from orphaned
    // blocks); never persist it into the field config, or it lingers as a phantom
    // entry once the orphaned blocks are gone.
    emit('update:areas', localAreas.value.filter(a => a.id !== ORPHANED_AREA_ID));
    emit('close');
  }
}

// Expose for parent
defineExpose({
  save,
  hasErrors,
  addArea
});
</script>

<style lang="scss" scoped>
.area-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.manager-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.area-section-toolbar {
  display: flex;
  margin-bottom: 16px;
}

.areas-table-wrapper {
  overflow-x: auto;
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background);
}

.areas-table {
  width: 100%;
  border-collapse: collapse;

  /* Subdued header with a tokenized fill — mirrors the redesigned ListView table
     header (#51, issue #73). Not sticky here: the table's vertical scroll lives on
     .manager-content, not the table, so a sticky thead wouldn't track it. Keeps
     --theme--border-width (not a hardcoded 1px). */
  thead {
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      white-space: nowrap;
      /* Normal foreground (not -subdued) for readable contrast on the subdued
         header fill — subdued-on-subdued was too light. */
      color: var(--theme--foreground);
      background: var(--theme--background-subdued);
      border-bottom: var(--theme--border-width) solid var(--theme--border-color);
    }
  }

  tbody {
    tr {
      border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
      background: var(--theme--background);
      transition: background-color 0.2s;

      &:hover {
        background: var(--theme--background-normal);
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
        white-space: nowrap;
        width: 90px;

        .v-button {
          margin: 0 1px;
        }
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

/* Curated icon picker grid (issue #64). Uses native v-list-item — the proven
   clickable-menu pattern already used for the allowed-collections menu in this
   component (raw <button>s inside the teleported v-menu content do not receive
   clicks). The v-list / v-list-item roots carry the AreaManager scope id even
   though v-menu teleports the content, so scoped :deep styles reach them — no
   global leak. v-list-item provides native hover/active styling (active = the
   currently selected icon). */
.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  padding: 4px;
  max-height: 280px;
  overflow-y: auto;
}

.icon-picker-grid :deep(.icon-choice) {
  min-width: 0;
  width: 32px;
  height: 32px;
  min-height: 32px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--theme--border-radius);
}

.drag-handle {
  cursor: grab;
  color: var(--theme--foreground-subdued);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    color: var(--theme--foreground);
  }
}

/* Inline-edit resting value: flat text in the cell, a hover/focus pencil
   affordance, and a real token focus ring (replaces the former inset box-shadow
   faux ring). The :focus-visible outline mirrors the design-handoff `.foc` rule
   exactly so #56 can later globalize it without any visual drift. Kept inline
   (not a mixin) because an @include in <style scoped> compiles to an UN-scoped
   global selector in this build. */
.editable-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--theme--border-radius);
  border: var(--theme--border-width) solid transparent;
  cursor: pointer;
  user-select: none;
  min-height: 32px;
  transition: background-color 0.2s, border-color 0.2s;

  &:not(.locked):hover {
    background: var(--theme--background);
    border-color: var(--theme--border-color);
  }

  &:not(.locked):focus-visible {
    outline: 2px solid var(--theme--primary);
    outline-offset: 2px;
  }

  &.locked {
    cursor: default;
    color: var(--theme--foreground-subdued);
  }
}

.value-text {
  color: var(--theme--foreground);
}

.value-text--label {
  font-weight: 600;
  color: var(--theme--foreground-accent);
}

.edit-pencil {
  color: var(--theme--foreground-subdued);
  opacity: 0;
  transition: opacity 0.12s;
}

.editable-value:not(.locked):hover .edit-pencil,
.editable-value:not(.locked):focus-visible .edit-pencil {
  opacity: 1;
}

/* Reduced motion (a11y §5): no hover/affordance transitions. */
@media (prefers-reduced-motion: reduce) {
  .editable-value,
  .edit-pencil {
    transition: none;
  }
}

/* Chips on top, the add "+" below — consistent for both the empty state (a
   non-removable "All collections" chip) and explicitly selected collections. */
.collections-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;

  .collection-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}

/* The "no restriction" placeholder: same chip shape as a real collection, but
   italic + subdued so it reads as the default rather than an explicit pick. */
.all-collections-chip {
  font-style: italic;
  --v-chip-color: var(--theme--foreground-subdued);
}

/* The sibling expandable-blocks extension leaks a global
   `.close-outline { background: red !important }` (see project memory
   extension-css-global-collision) that turns the native v-chip close button into
   an ugly solid-red circle. Restore the native subtle treatment for our
   collection chips — scoped + !important to beat the leak. */
.collections-cell :deep(.v-chip .close-outline) {
  background: transparent !important;
  border-left: none !important;
  border-radius: 50% !important;
  right: auto !important;
}

.collections-cell :deep(.v-chip .close-outline:hover) {
  background: var(--theme--danger-background) !important;
}

.locked-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

.danger {
  --v-button-background-color-hover: var(--theme--danger-background);
  --v-button-color-hover: var(--theme--danger);
}
</style>
