<template>
  <!--
    Slim area-removal confirmation. Structure mirrors DeleteConfirmationDialog.vue
    (v-dialog + v-card + @esc), but this is a simple Yes/No confirm with an optional
    orphan warning — not the block-specific unassign/delete choice. Focus
    capture/restore is owned by the parent (AreaManager), because only the parent
    knows that confirming removes the trigger row from the DOM.
  -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="handleCancel"
  >
    <v-card>
      <v-card-title class="confirm-title">
        <v-icon name="delete" />
        <span>Remove "{{ areaLabel }}"?</span>
      </v-card-title>

      <v-card-text>
        <p class="confirm-text">
          This removes the area from the layout. You can add it again later with "Add area".
        </p>
        <v-notice v-if="blockCount > 0" type="warning" class="orphan-warning">
          This area contains {{ blockCount }} {{ blockCount === 1 ? 'block' : 'blocks' }} —
          they will become orphaned when you save.
        </v-notice>
      </v-card-text>

      <v-card-actions>
        <v-button secondary @click="handleCancel">Cancel</v-button>
        <v-button kind="danger" @click="handleConfirm">
          <v-icon class="cta-icon" name="delete" small />
          Remove area
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  areaLabel?: string;
  blockCount?: number;
}

withDefaults(defineProps<Props>(), {
  areaLabel: 'this area',
  blockCount: 0
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [];
  'cancel': [];
}>();

function handleConfirm() {
  emit('confirm');
  emit('update:modelValue', false);
}

function handleCancel() {
  emit('cancel');
  emit('update:modelValue', false);
}
</script>

<style lang="scss" scoped>
.confirm-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-text {
  color: var(--theme--foreground);
  margin: 0;
}

.orphan-warning {
  margin-top: 12px;
}

.cta-icon {
  margin-right: 4px;
}
</style>
