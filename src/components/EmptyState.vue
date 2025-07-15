<template>
  <div class="empty-state">
    <v-icon :name="icon" large />
    <p>{{ message }}</p>
    <v-button
      v-if="showAction && actionLabel"
      :small="small"
      :secondary="secondary"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </v-button>
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
}

withDefaults(defineProps<Props>(), {
  icon: 'inbox',
  showAction: false,
  small: false,
  secondary: false
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
  color: var(--foreground-subdued);
  text-align: center;
  min-height: 200px;

  p {
    margin: 0;
    font-size: 14px;
  }

  .v-icon {
    color: var(--foreground-subdued);
  }
}
</style>