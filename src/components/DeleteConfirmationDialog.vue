<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="handleCancel"
  >
    <template #activator="{ on }">
      <slot name="activator" :on="on" />
    </template>

    <v-card>
      <v-card-title>
        {{ dialogTitle }}
      </v-card-title>

      <v-card-text>
        <div class="delete-dialog-content">
          <!-- Radio options for delete type -->
          <div class="action-options">
            <label class="action-option" :class="{ selected: deleteMode === 'unlink' }">
              <input
                type="radio"
                :value="false"
                v-model="deleteContent"
                :disabled="loading"
                name="delete-mode"
              />
              <div class="option-content">
                <v-icon name="link_off" small />
                <div>
                  <div class="option-title">Remove from this page only</div>
                  <div class="option-description">
                    The content will remain available and can be used elsewhere
                  </div>
                </div>
              </div>
            </label>

            <label class="action-option" :class="{ selected: deleteMode === 'delete', danger: true }">
              <input
                type="radio"
                :value="true"
                v-model="deleteContent"
                :disabled="loading || !canDelete"
                name="delete-mode"
              />
              <div class="option-content">
                <v-icon name="delete" small />
                <div>
                  <div class="option-title">Delete permanently</div>
                  <div class="option-description">
                    The content will be removed completely and cannot be recovered
                  </div>
                </div>
              </div>
            </label>
          </div>

          <!-- Warning for permanent deletion -->
          <v-notice
            v-if="deleteMode === 'delete'"
            type="danger"
            class="delete-warning"
          >
            <strong>Warning:</strong> This action cannot be undone. The content will be permanently deleted.
          </v-notice>

          <!-- Permission notice if can't delete -->
          <v-notice
            v-if="!canDelete && deleteMode === 'delete'"
            type="info"
          >
            You don't have permission to delete this content. You can only remove it from this page.
          </v-notice>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-button
          secondary
          @click="handleCancel"
          :disabled="loading"
        >
          Cancel
        </v-button>
        <v-button
          :loading="loading"
          :kind="deleteContent ? 'danger' : 'primary'"
          @click="handleConfirm"
        >
          {{ confirmButtonText }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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

// Local state
const deleteContent = ref(false);

// Computed properties
const deleteMode = computed(() => deleteContent.value ? 'delete' : 'unlink');

const dialogTitle = computed(() => {
  return `Remove ${props.blockTitle}?`;
});

const confirmButtonText = computed(() => {
  if (props.loading) return 'Processing...';
  return deleteContent.value ? 'Delete Permanently' : 'Remove';
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
.delete-dialog-content {
  padding: 8px 0;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.action-option {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 2px solid var(--border-normal);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--background-page);

  &:hover {
    border-color: var(--primary-25);
    background: var(--background-normal);
  }

  &.selected {
    border-color: var(--primary);
    background: var(--primary-10);
  }

  &.danger.selected {
    border-color: var(--danger);
    background: var(--danger-10);
  }

  input[type="radio"] {
    margin-right: 12px;
    margin-top: 2px;
    cursor: pointer;
  }

  &:has(input:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.option-content {
  display: flex;
  gap: 12px;
  flex: 1;

  .v-icon {
    margin-top: 2px;
    color: var(--foreground-subdued);
  }

  .option-title {
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--foreground-normal);
  }

  .option-description {
    font-size: 13px;
    color: var(--foreground-subdued);
    line-height: 1.4;
  }
}

.danger {
  .v-icon {
    color: var(--danger);
  }
}

.delete-warning {
  margin-top: 16px;
}
</style>