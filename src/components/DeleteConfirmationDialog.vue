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
          <v-radio-group
            v-model="deleteMode"
            :disabled="loading"
          >
            <v-radio
              value="unlink"
              label="Remove from this page only"
            >
              <template #label>
                <div class="option-label">
                  <v-icon name="link_off" small />
                  <div>
                    <div class="option-title">Remove from this page only</div>
                    <div class="option-description">
                      The content will remain available and can be used elsewhere
                    </div>
                  </div>
                </div>
              </template>
            </v-radio>

            <v-radio
              value="delete"
              label="Delete permanently"
              :disabled="!canDelete"
            >
              <template #label>
                <div class="option-label danger">
                  <v-icon name="delete" small />
                  <div>
                    <div class="option-title">Delete permanently</div>
                    <div class="option-description">
                      The content will be removed completely and cannot be recovered
                    </div>
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>

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
          :kind="deleteMode === 'delete' ? 'danger' : 'primary'"
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
const deleteMode = ref<'unlink' | 'delete'>('unlink');

// Computed properties
const dialogTitle = computed(() => {
  return `Remove ${props.blockTitle}?`;
});

const confirmButtonText = computed(() => {
  if (props.loading) return 'Processing...';
  return deleteMode.value === 'delete' ? 'Delete Permanently' : 'Remove';
});

// Methods
function handleConfirm() {
  logger.debug('Delete dialog confirmed', { mode: deleteMode.value });
  emit('confirm', {
    deleteContent: deleteMode.value === 'delete'
  });
}

function handleCancel() {
  logger.debug('Delete dialog cancelled');
  deleteMode.value = 'unlink'; // Reset to default
  emit('cancel');
  emit('update:modelValue', false);
}
</script>

<style lang="scss" scoped>
.delete-dialog-content {
  :deep(.v-radio-group) {
    .v-radio {
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

.option-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;

  .v-icon {
    margin-top: 2px;
    color: var(--theme--foreground-subdued);
  }

  &.danger .v-icon {
    color: var(--theme--danger);
  }

  .option-title {
    font-weight: 500;
    margin-bottom: 4px;
  }

  .option-description {
    font-size: 13px;
    color: var(--theme--foreground-subdued);
    line-height: 1.4;
  }
}

.delete-warning {
  margin-top: 16px;
}
</style>