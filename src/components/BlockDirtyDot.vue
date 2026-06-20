<template>
  <span
    v-tooltip="isNew ? 'New block — not yet saved' : 'Unsaved changes'"
    class="lb-dirty-dot"
    :class="{ 'is-new': isNew }"
    role="status"
    :aria-label="isNew ? 'New, unsaved block' : 'Block has unsaved changes'"
  />
</template>

<script setup lang="ts">
interface Props {
  /** Green (new/temp block) vs primary (edited existing block). */
  isNew?: boolean;
}
withDefaults(defineProps<Props>(), { isNew: false });
</script>

<style lang="scss" scoped>
/* Staged-change indicator — mirrors the sibling expandable-blocks dot. Values
   inlined + `lb-`-namespaced class/keyframe so the scoped build does not collide
   with that extension's global `.dirty-indicator` / `pulse` (see BlockItem.vue
   style note + the extension-css-global-collision memory). The dot needs a
   positioned ancestor (the host adds `position: relative`). */
.lb-dirty-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--theme--primary);
  border: 2px solid var(--theme--background);
  box-sizing: content-box;
  animation: lb-dirty-pulse 2s ease-in-out infinite;

  &.is-new {
    background: var(--theme--success);
  }
}

@keyframes lb-dirty-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}

@media (prefers-reduced-motion: reduce) {
  .lb-dirty-dot {
    animation: none;
  }
}
</style>
