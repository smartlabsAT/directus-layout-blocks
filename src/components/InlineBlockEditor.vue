<template>
  <!--
    Live inline editor. Edits flow STRAIGHT into the block's item (no Save
    button): the block is staged/dirty immediately and persisted on the global
    Save, or discarded per-block via the block menu's "Revert changes". Close by
    clicking the block again or pressing ESC — the staged edit is kept.

    ESC is a BUBBLE-phase @keydown.esc on the root (NOT document-capture): nested
    relational/file fields open TELEPORTED overlays under <body>, so their ESC
    never bubbles here — they close themselves first. SCSS is inlined + `lb-`-
    namespaced for the scoped build (see BlockItem.vue style note).
  -->
  <div
    ref="root"
    class="lb-inline-editor"
    role="region"
    :aria-label="`Edit ${collectionLabel}`"
    tabindex="-1"
    @keydown.esc="emit('cancel')"
  >
    <v-form
      class="lb-inline-editor__form"
      :collection="collection"
      :primary-key="String(primaryKey)"
      :model-value="modelValue"
      :initial-values="modelValue"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getCollectionLabel } from '../utils/blockHelpers';

interface Props {
  collection: string;
  primaryKey: string | number;       // '+' for a new/create-mode block
  modelValue: Record<string, any>;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
  cancel: [];
}>();

const root = ref<HTMLElement | null>(null);
const collectionLabel = computed(() => getCollectionLabel(props.collection));

// Move focus into the editor region on open (keyboard/SR users land here).
// preventScroll: focus runs while the inline-expand animation still has the
// editor at height:0 — without it the browser scrolls to reveal the 0px target,
// jumping the page when a block low in a long list is opened.
onMounted(() => {
  root.value?.focus({ preventScroll: true });
});
</script>

<style lang="scss" scoped>
.lb-inline-editor {
  padding: 1rem;
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-top: none;
  border-bottom-left-radius: var(--theme--border-radius);
  border-bottom-right-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);

  &:focus-visible {
    outline: 2px solid var(--theme--primary);
    outline-offset: -2px;
  }
}
</style>
