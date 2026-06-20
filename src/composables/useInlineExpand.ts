/**
 * Inline-editor expand/collapse animation — a height accordion driven by Vue
 * <transition> JS hooks (NOT CSS classes), shared by GridView and ListView.
 *
 * Why JS hooks (`:css="false"`) instead of a CSS `grid-template-rows` trick:
 *  - The list editor lives in a <tr>, which cannot be height-animated via CSS;
 *    here we animate an inner wrapper and let the row follow.
 *  - A plain `v-if` pops, and a <tr> unmounts before any CSS leave could run.
 *    With `:css="false"` Vue keeps the element mounted until done() fires, so
 *    BOTH open and close animate.
 *
 * Fine-tune the feel via INLINE_EXPAND_MS / INLINE_EXPAND_EASING — the single
 * source of truth (the inline `transition` is written from these; there is no
 * duplicated CSS duration to keep in sync). Honors `prefers-reduced-motion`
 * (a11y §5): the animation is skipped and the editor appears/disappears at once.
 */

// Expand/collapse duration (ms) and easing — tweak here to fine-tune the feel.
export const INLINE_EXPAND_MS = 220;
export const INLINE_EXPAND_EASING = 'ease';

type DoneFn = () => void;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param targetSelector  When the transition element is not the element we want
 *   to size (e.g. a <tr> in the list), the inner element to actually animate.
 *   Omit for the grid, where the transition element IS the sized wrapper.
 */
export function useInlineExpand(targetSelector?: string) {
  // The element whose height we animate (may differ from the transition element).
  function resolveTarget(el: Element): HTMLElement {
    if (targetSelector) {
      const inner = el.querySelector(targetSelector);
      if (inner) return inner as HTMLElement;
    }
    return el as HTMLElement;
  }

  // Strip every inline style we set, returning the element to its natural
  // (auto-height, visible-overflow) state.
  function reset(t: HTMLElement): void {
    t.style.height = '';
    t.style.overflow = '';
    t.style.opacity = '';
    t.style.transition = '';
  }

  // Animate `t` between two explicit heights, fading opacity in step. A fallback
  // timer guarantees done() even when no `transitionend` fires (height unchanged,
  // zero-height layouts, interrupted transition) so the editor never gets stuck.
  function animate(t: HTMLElement, from: string, to: string, done: DoneFn): void {
    t.style.overflow = 'hidden';
    t.style.height = from;
    t.style.opacity = from === '0px' ? '0' : '1';
    // Force a reflow so the start values are committed before we transition.
    t.getBoundingClientRect();
    t.style.transition =
      `height ${INLINE_EXPAND_MS}ms ${INLINE_EXPAND_EASING}, opacity ${INLINE_EXPAND_MS}ms ${INLINE_EXPAND_EASING}`;
    t.style.height = to;
    t.style.opacity = to === '0px' ? '0' : '1';

    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      t.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      reset(t);
      done();
    };
    const onEnd = (e: Event): void => {
      if (e.target === t && (e as TransitionEvent).propertyName === 'height') finish();
    };
    const timer = setTimeout(finish, INLINE_EXPAND_MS + 80);
    t.addEventListener('transitionend', onEnd);
  }

  function onEnter(el: Element, done: DoneFn): void {
    const t = resolveTarget(el);
    if (prefersReducedMotion()) { done(); return; }
    animate(t, '0px', `${t.scrollHeight}px`, done);
  }

  function onLeave(el: Element, done: DoneFn): void {
    const t = resolveTarget(el);
    if (prefersReducedMotion()) { done(); return; }
    animate(t, `${t.scrollHeight}px`, '0px', done);
  }

  // Interrupted mid-flight (e.g. rapid open→close): drop our inline styles.
  function onEnterCancelled(el: Element): void { reset(resolveTarget(el)); }
  function onLeaveCancelled(el: Element): void { reset(resolveTarget(el)); }

  return { onEnter, onLeave, onEnterCancelled, onLeaveCancelled };
}
