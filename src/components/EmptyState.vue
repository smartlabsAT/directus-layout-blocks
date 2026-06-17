<template>
  <div class="empty-state" :class="{ dense }">
    <v-icon :name="icon" large />
    <p>{{ message }}</p>
    <!-- Custom action (e.g. an AddBlockDropdown); falls back to a plain button. -->
    <slot name="action">
      <v-button
        v-if="showAction && actionLabel"
        :small="small"
        :secondary="secondary"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </v-button>
    </slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string;
  message: string;
  showAction?: boolean;
  actionLabel?: string;
  small?: boolean;
  secondary?: boolean;
  /** Tighter padding/min-height for constrained contexts (e.g. a grid area card). */
  dense?: boolean;
}

withDefaults(defineProps<Props>(), {
  icon: 'inbox',
  showAction: false,
  small: false,
  secondary: false,
  dense: false
});

defineEmits<{
  action: [];
}>();
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  color: var(--theme--foreground-subdued);
  text-align: center;
  min-height: 200px;

  &.dense {
    gap: 12px;
    padding: 16px;
    min-height: 120px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }

  .v-icon {
    color: var(--theme--foreground-subdued);
  }
}
</style>