import type { Directive } from 'vue';

/**
 * Forwards ARIA / role / tabindex attributes onto the inner native `<button>`
 * of a Directus `v-button`.
 *
 * Directus' `v-button` renders `<div class="v-button"><button>…</button></div>`
 * with `inheritAttrs: true`, so Vue's attribute fallthrough puts any `role` /
 * `aria-*` / `tabindex` we set in the template on the **wrapper `<div>`**, not on
 * the focusable `<button>`. A screen reader then meets an unlabeled, role-less
 * generic button. This directive copies the given attributes onto the actual
 * `<button>` where they belong, and re-applies on every update so reactive
 * values (`aria-checked`, `aria-expanded`, roving `tabindex`) stay in sync.
 *
 * `null` / `undefined` removes the attribute; `false` is rendered as the string
 * `"false"` (meaningful for `aria-checked` / `aria-expanded`).
 *
 * Usage:
 *   <v-button v-btn-aria="{ 'aria-label': 'Manage areas' }" … />
 *   <v-button v-btn-aria="{ role: 'radio', 'aria-checked': isActive, tabindex: isActive ? 0 : -1 }" … />
 */
type AriaAttrs = Record<string, string | number | boolean | null | undefined>;

function applyAttrs(el: HTMLElement, value: AriaAttrs): void {
  const btn: HTMLElement | null = el.matches('button') ? el : el.querySelector('button');
  if (!btn) return;
  for (const [key, val] of Object.entries(value || {})) {
    if (val === null || val === undefined) {
      btn.removeAttribute(key);
    } else {
      btn.setAttribute(key, String(val));
    }
  }
}

export const vBtnAria: Directive<HTMLElement, AriaAttrs> = {
  mounted(el, binding) {
    applyAttrs(el, binding.value);
  },
  updated(el, binding) {
    applyAttrs(el, binding.value);
  },
};
