<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="handleCancel"
  >
    <v-card>
      <v-card-title class="delete-title">
        <v-icon name="remove_circle_outline" />
        <span>Remove "{{ blockTitle }}"</span>
      </v-card-title>

      <v-card-text>
        <div class="delete-dialog-content">
          <!--
            Native choice control: two selectable v-list-items (issue #53).
            Selection/danger emphasis is applied via our OWN bound classes on the
            v-list-item root (it inherits this component's scope id) — NOT via a
            bare :deep(.v-list-item.active), which compiles to an UNSCOPED global
            selector in this build and would override every active v-list-item in
            the Directus admin (e.g. the module navigation).
            Full radiogroup/focus-trap/focus-ring a11y is owned by #56; here we
            only provide the static role / aria-checked / aria-disabled structure.
          -->
          <v-list class="choice-list" role="radiogroup" aria-label="How to remove this block">
            <v-list-item
              clickable
              class="lb-choice"
              :class="{ 'lb-choice--selected': !deleteContent }"
              :disabled="loading"
              role="radio"
              :aria-checked="!deleteContent"
              :aria-disabled="loading"
              @click="deleteContent = false"
            >
              <v-list-item-icon>
                <v-icon
                  class="radio-indicator"
                  :name="!deleteContent ? 'radio_button_checked' : 'radio_button_unchecked'"
                />
              </v-list-item-icon>
              <v-list-item-content>
                <div class="choice-body">
                  <v-icon class="choice-type-icon" name="link_off" small />
                  <div class="choice-text">
                    <div class="choice-title">Unassign from this page</div>
                    <div class="item-subtitle">The item stays in its collection and on other pages</div>
                  </div>
                </div>
              </v-list-item-content>
            </v-list-item>

            <v-list-item
              clickable
              class="lb-choice"
              :class="{ 'lb-choice--selected': deleteContent, 'lb-choice--danger': deleteContent }"
              :disabled="loading || !canDelete"
              role="radio"
              :aria-checked="deleteContent"
              :aria-disabled="loading || !canDelete"
              @click="canDelete && (deleteContent = true)"
            >
              <v-list-item-icon>
                <v-icon
                  class="radio-indicator"
                  :name="deleteContent ? 'radio_button_checked' : 'radio_button_unchecked'"
                />
              </v-list-item-icon>
              <v-list-item-content>
                <div class="choice-body">
                  <v-icon class="choice-type-icon" name="delete" small />
                  <div class="choice-text">
                    <div class="choice-title">Delete everywhere</div>
                    <div class="item-subtitle">
                      {{ canDelete ? 'Permanently delete the item and all references' : "You don't have delete permission" }}
                    </div>
                  </div>
                </div>
              </v-list-item-content>
            </v-list-item>
          </v-list>

          <!-- Warning for permanent deletion -->
          <v-notice
            v-if="deleteContent"
            type="danger"
            class="delete-warning"
          >
            This action cannot be undone. The content will be permanently deleted.
          </v-notice>

          <!-- Permission notice when the user cannot delete content -->
          <v-notice
            v-if="!canDelete"
            type="info"
          >
            You don't have permission to delete this content. You can only remove it from this page.
          </v-notice>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-button
          secondary
          :disabled="loading"
          @click="handleCancel"
        >
          Cancel
        </v-button>
        <v-button
          :loading="loading"
          :kind="deleteContent ? 'danger' : 'primary'"
          @click="handleConfirm"
        >
          <v-icon class="cta-icon" :name="deleteContent ? 'delete' : 'link_off'" small />
          {{ confirmButtonText }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { logger } from '../utils/logger';

interface Props {
  modelValue: boolean;
  blockTitle?: string;
  canDelete?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  blockTitle: 'this block',
  canDelete: true,
  loading: false
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [options: { deleteContent: boolean }];
  'cancel': [];
}>();

// Local state — `deleteContent` is the single source of truth for the choice and
// is the payload of the `confirm` event (consumed in BlockItem.vue).
const deleteContent = ref(false);

// Reset the choice whenever the dialog (re)opens, so a previous selection never
// leaks into the next open — this also covers the backdrop-close path, which
// closes the dialog without going through handleCancel.
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) deleteContent.value = false;
  }
);

// If the user loses delete permission while "Delete everywhere" is selected
// (e.g. a reactive permission or item change), fall back to the safe default so
// the dialog can never emit a delete the user is no longer allowed to perform.
watch(
  () => props.canDelete,
  (allowed) => {
    if (!allowed) deleteContent.value = false;
  }
);

const confirmButtonText = computed(() => {
  if (props.loading) return 'Processing...';
  return deleteContent.value ? 'Delete everywhere' : 'Unassign';
});

// Methods
function handleConfirm() {
  logger.debug('Delete dialog confirmed', { deleteContent: deleteContent.value });
  emit('confirm', {
    deleteContent: deleteContent.value
  });
}

function handleCancel() {
  logger.debug('Delete dialog cancelled');
  deleteContent.value = false; // Reset to default
  emit('cancel');
  emit('update:modelValue', false);
}
</script>

<style lang="scss" scoped>
.delete-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-dialog-content {
  padding: 8px 0;
}

.choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 0;
}

/*
 * Selected / danger emphasis via our own bound classes (see template comment).
 * Fill uses the documented --v-list-item-* override vars (precedent
 * BlockItem.vue:333) so hover keeps the tint; the 1px primary/danger border
 * (TOKENS §7) is rendered with an inset box-shadow because v-list-item has no
 * border. Title/subtitle text stays in --theme--foreground/-subdued (never
 * recolored to primary/danger) to preserve dark-mode contrast (TOKENS §7).
 */
.lb-choice {
  border-radius: var(--theme--border-radius);

  &.lb-choice--selected {
    --v-list-item-background-color: var(--theme--primary-background);
    --v-list-item-background-color-hover: var(--theme--primary-background);
    box-shadow: inset 0 0 0 var(--theme--border-width) var(--theme--primary);
  }

  &.lb-choice--danger.lb-choice--selected {
    --v-list-item-background-color: var(--theme--danger-background);
    --v-list-item-background-color-hover: var(--theme--danger-background);
    box-shadow: inset 0 0 0 var(--theme--border-width) var(--theme--danger);
  }
}

.radio-indicator {
  color: var(--theme--foreground-subdued);
}

.lb-choice--selected .radio-indicator {
  color: var(--theme--primary);
}

.lb-choice--danger.lb-choice--selected .radio-indicator {
  color: var(--theme--danger);
}

.choice-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.choice-type-icon {
  margin-top: 2px;
  color: var(--theme--foreground-subdued);
}

.choice-title {
  font-weight: 600;
  color: var(--theme--foreground);
}

.item-subtitle {
  font-size: 12px;
  line-height: 1.4;
  margin-top: 2px;
  color: var(--theme--foreground-subdued);
}

.cta-icon {
  margin-right: 4px;
}

.delete-warning {
  margin-top: 16px;
}
</style>
