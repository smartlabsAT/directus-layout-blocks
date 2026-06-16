<template>
  <v-menu
    v-if="editable"
    show-arrow
    placement="bottom"
    :close-on-content-click="true"
  >
    <template #activator="{ toggle, active }">
      <div
        class="status-display"
        :class="{ clickable: editable }"
        role="button"
        tabindex="0"
        aria-haspopup="listbox"
        :aria-expanded="active"
        :aria-label="`Status: ${getStatusLabel(status)}. Activate to change.`"
        @click="editable && toggle()"
        @keydown.enter.prevent="editable && toggle()"
        @keydown.space.prevent="editable && toggle()"
      >
        <span class="lb-status-dot" :class="`status-${status || 'draft'}`" />
        <span class="status-text">{{ getStatusLabel(status) }}</span>
      </div>
    </template>

    <v-list role="listbox">
      <v-list-item
        v-for="option in STATUS_OPTIONS"
        :key="option.value"
        clickable
        role="option"
        :aria-selected="(status || 'draft') === option.value"
        :active="(status || 'draft') === option.value"
        @click="$emit('update:status', option.value)"
      >
        <v-list-item-icon>
          <span class="lb-status-dot" :class="`status-${option.value}`" />
        </v-list-item-icon>
        <v-list-item-content>{{ option.text }}</v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
  
  <div v-else class="status-display">
    <span class="lb-status-dot" :class="`status-${status || 'draft'}`" />
    <span class="status-text">{{ getStatusLabel(status) }}</span>
  </div>
</template>

<script setup lang="ts">
import { STATUS_OPTIONS } from '../utils/constants';
import { getStatusLabel } from '../utils/blockHelpers';

interface Props {
  status?: string;
  editable?: boolean;
}

withDefaults(defineProps<Props>(), {
  editable: true
});

defineEmits<{
  'update:status': [status: string];
}>();
</script>

<style lang="scss" scoped>
.status-display {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
  transition: background-color 0.2s;

  &.clickable {
    cursor: pointer;

    &:hover {
      background-color: var(--theme--background-normal);
    }
  }

  /* Keyboard focus ring (a11y §1) — the status pill is a custom button. */
  &:focus-visible {
    outline: 2px solid var(--theme--form--field--input--focus-ring-color);
    outline-offset: 2px;
  }

  .status-text {
    color: var(--theme--foreground);
  }
}
</style>

<style lang="scss">
/* Single source of truth for status-dot styling (issue #50).
   Declared globally (not scoped) on purpose: this one definition covers BOTH
   the in-component activator dot AND the teleported v-menu list dots. Two
   <style> blocks in an SFC cannot share a SCSS mixin, and scoped styles cannot
   reach the teleported v-list — so a single global rule is the only way to keep
   one source. The class is namespaced (`lb-`) so this global rule never collides
   with the sibling `expandable-blocks` extension's own global `.status-dot`
   rules. StatusSelector is the only place status dots are styled. */
.lb-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--theme--foreground-subdued);

  &.status-published {
    background: var(--theme--success);
  }

  &.status-draft {
    background: var(--theme--warning);
  }

  &.status-archived {
    background: var(--theme--foreground-subdued);
  }
}

.v-list .v-list-item-icon {
  margin-right: 12px;
  min-width: 20px;
  display: flex;
  align-items: center;
}
</style>
