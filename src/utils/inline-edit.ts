import type { BlockId } from '../types';

/**
 * Single-open accordion decision. Given the currently-open block id (or null)
 * and the just-triggered block id, return the next id to open — or `null` to
 * close. Clicking the open block closes it; clicking another switches to it —
 * the previous block stays staged/dirty (live edits are KEPT, not discarded; use
 * the per-block revert to discard a single block's staged changes).
 *
 * Strict `===` is intentional: persisted ids are numeric and temp ids are
 * prefixed strings, so a numeric `10` and a string `"10"` never refer to the
 * same junction. Do NOT loosen this comparison.
 */
export function nextInlineEditTarget(
  currentEditingId: BlockId | null,
  clickedId: BlockId,
): BlockId | null {
  return currentEditingId === clickedId ? null : clickedId;
}
