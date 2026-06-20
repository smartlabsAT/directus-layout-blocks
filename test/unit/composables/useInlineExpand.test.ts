import { describe, it, expect, vi, afterEach } from 'vitest';
import { useInlineExpand, INLINE_EXPAND_MS } from '../../../src/composables/useInlineExpand';

/**
 * The animation itself (real height interpolation) needs a layout engine and is
 * verified live. These tests pin the deterministic, accessibility-relevant
 * behaviour: reduced-motion short-circuit, guaranteed completion via the safety
 * timer (jsdom never fires `transitionend`), and inner-target resolution.
 */
function mockReducedMotion(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({ matches }),
  });
}

describe('useInlineExpand', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips the animation and resolves immediately under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    const { onEnter } = useInlineExpand();
    const el = document.createElement('div');
    const done = vi.fn();

    onEnter(el, done);

    expect(done).toHaveBeenCalledTimes(1);
    // No inline animation styles were applied.
    expect(el.style.height).toBe('');
    expect(el.style.transition).toBe('');
  });

  it('arms the transition and resolves via the safety timer when no transitionend fires', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    const { onEnter } = useInlineExpand();
    const el = document.createElement('div');
    const done = vi.fn();

    onEnter(el, done);

    // Enter started: clipped + transition armed, not yet resolved.
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.transition).toContain(`${INLINE_EXPAND_MS}ms`);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(INLINE_EXPAND_MS + 80);

    expect(done).toHaveBeenCalledTimes(1);
    // Inline styles cleared back to the natural state.
    expect(el.style.height).toBe('');
    expect(el.style.overflow).toBe('');
  });

  it('animates an inner element when a selector is given (list <tr> case)', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    const { onEnter } = useInlineExpand('.lb-inline-anim');
    const row = document.createElement('tr');
    const inner = document.createElement('div');
    inner.className = 'lb-inline-anim';
    row.appendChild(inner);
    const done = vi.fn();

    onEnter(row, done);

    // The inner wrapper is animated, the <tr> itself is left untouched.
    expect(inner.style.overflow).toBe('hidden');
    expect(row.style.overflow).toBe('');

    vi.advanceTimersByTime(INLINE_EXPAND_MS + 80);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stops the in-flight enter and clears styles when cancelled (no late resolve)', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    const { onEnter, onEnterCancelled } = useInlineExpand();
    const el = document.createElement('div');
    const done = vi.fn();

    onEnter(el, done);
    expect(el.style.overflow).toBe('hidden'); // animation armed

    onEnterCancelled(el);

    // Inline styles are dropped immediately…
    expect(el.style.height).toBe('');
    expect(el.style.transition).toBe('');
    // …and the cancelled enter's safety timer must NOT resolve afterwards
    // (a stale timer would otherwise clobber a subsequent leave animation).
    vi.advanceTimersByTime(INLINE_EXPAND_MS + 80);
    expect(done).not.toHaveBeenCalled();
  });
});
