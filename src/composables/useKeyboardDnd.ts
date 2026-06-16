import { ref, nextTick, type Ref } from 'vue';
import { logger } from '../utils/logger';
import type { BlockItem, BlockId, AreaConfig } from '../types';

/**
 * Keyboard equivalent of the pointer drag & drop (KEYBOARD_AND_A11Y.md §3).
 *
 * View-agnostic: GridView and ListView both drive it through the same callbacks,
 * so the move rules (locked / maxItems / allowedTypes / never-orphaned) live in
 * one place and stay identical to the mouse path (each view passes its own
 * `canDrop`, which is the very same function the pointer handlers use).
 *
 * Interaction model (the focused block IS the grab target — no separate handle):
 *  - Enter / Space  → grab / drop toggle
 *  - ArrowUp/Down   → reorder within the current area
 *  - ArrowLeft/Right→ move to the previous/next eligible area (skips locked &
 *                     incompatible areas)
 *  - Escape         → cancel and restore the original position
 *  - Tab            → suppressed while grabbed (movement is arrows-only)
 *
 * Every step is announced through a visually-hidden `aria-live="polite"` region
 * (the returned `announcement` ref). Announcements are English to match the rest
 * of the UI (the extension has no i18n layer).
 */
export interface KeyboardDndDeps {
  /** Traversal order for ArrowLeft/Right (typically the visible areas). */
  areas: Ref<AreaConfig[]>;
  /** Blocks of an area, already sorted as displayed. */
  getAreaBlocks: (areaId: string) => BlockItem[];
  /** Same predicate the pointer DnD uses (locked / maxItems / allowedTypes / orphaned). */
  canDrop: (block: BlockItem, area: AreaConfig) => boolean;
  /** Perform the move (identical payload to the pointer `move-block` emit). */
  emitMove: (payload: { blockId: BlockId; fromArea: string; toArea: string; toIndex: number }) => void;
  /** Whether drag & drop is enabled at all (options.enableDragDrop). */
  enabled: () => boolean;
  /** Human-readable block title for announcements. */
  getTitle: (block: BlockItem) => string;
  /**
   * Re-focus the block's element after a move re-renders the list. Receives the
   * block id; the view resolves it to a DOM node (the element is destroyed and
   * recreated when a block changes area, so focus must be restored explicitly).
   */
  focusBlock: (blockId: BlockId) => void;
  /**
   * Optional: let the view follow the block when it changes area (ListView shows
   * one area at a time, so it switches the selected area to keep the block
   * visible). GridView shows all areas at once and omits this.
   */
  onAreaChange?: (areaId: string) => void;
}

export function useKeyboardDnd(deps: KeyboardDndDeps) {
  /** Id of the currently grabbed block, or null when nothing is grabbed. */
  const grabbedId = ref<BlockId | null>(null);
  /** Original area + index, used to restore on Escape. */
  const origin = ref<{ area: string; index: number } | null>(null);
  /** Latest live-region message. */
  const announcement = ref('');

  function announce(message: string): void {
    /* Re-assigning the same string would not re-trigger the live region; clear
       first so identical consecutive messages (e.g. repeated "skipped") still
       get announced. */
    announcement.value = '';
    nextTick(() => {
      announcement.value = message;
    });
  }

  function isGrabbed(blockId: BlockId): boolean {
    return grabbedId.value === blockId;
  }

  function areaById(areaId: string): AreaConfig | undefined {
    return deps.areas.value.find((a) => a.id === areaId);
  }

  /** A block may only be grabbed if its source area allows dragging out. */
  function canGrab(block: BlockItem): boolean {
    if (!deps.enabled()) return false;
    const source = areaById(block.area);
    /* Mirror the pointer rule: locked areas can't be dragged out of, except the
       orphaned area (which is itself never a drop target but its blocks may be
       rescued out of it). */
    if (source?.locked && source.id !== 'orphaned') return false;
    return true;
  }

  function grab(block: BlockItem): void {
    if (!canGrab(block)) {
      announce(`${deps.getTitle(block)} can't be moved — its area is locked.`);
      return;
    }
    const list = deps.getAreaBlocks(block.area);
    const index = list.findIndex((b) => b.id === block.id);
    grabbedId.value = block.id;
    origin.value = { area: block.area, index };
    const area = areaById(block.area);
    announce(
      `${deps.getTitle(block)} grabbed. Position ${index + 1} of ${list.length} in ${area?.label ?? block.area}. ` +
        `Use arrow keys to move, Enter to drop, Escape to cancel.`
    );
    logger.log('⌨️ Keyboard DnD: grabbed', block.id, 'in', block.area);
  }

  function moveWithin(block: BlockItem, direction: -1 | 1): void {
    const areaId = block.area;
    const list = deps.getAreaBlocks(areaId);
    const i = list.findIndex((b) => b.id === block.id);
    const j = i + direction;
    if (j < 0 || j >= list.length) {
      announce(`Already at the ${direction < 0 ? 'top' : 'bottom'} of ${areaById(areaId)?.label ?? areaId}.`);
      return;
    }
    deps.emitMove({ blockId: block.id, fromArea: areaId, toArea: areaId, toIndex: j });
    deps.focusBlock(block.id);
    announce(`${deps.getTitle(block)} moved to position ${j + 1} of ${list.length} in ${areaById(areaId)?.label ?? areaId}.`);
  }

  function moveAcross(block: BlockItem, direction: -1 | 1): void {
    /* Only real areas are traversal targets; the orphaned area is never a drop
       target, so exclude it from the left/right order. */
    const order = deps.areas.value.filter((a) => a.id !== 'orphaned');
    const curIdx = order.findIndex((a) => a.id === block.area);
    let k = curIdx + direction;
    let skipped = false;
    while (k >= 0 && k < order.length) {
      const target = order[k];
      if (deps.canDrop(block, target)) {
        const toIndex = deps.getAreaBlocks(target.id).length;
        deps.emitMove({ blockId: block.id, fromArea: block.area, toArea: target.id, toIndex });
        deps.onAreaChange?.(target.id);
        deps.focusBlock(block.id);
        announce(`${deps.getTitle(block)} moved to ${target.label}, position ${toIndex + 1} of ${toIndex + 1}.`);
        return;
      }
      skipped = true;
      k += direction;
    }
    announce(
      skipped
        ? `No available area in that direction — locked or full areas were skipped.`
        : `No area in that direction.`
    );
  }

  function drop(block: BlockItem): void {
    const list = deps.getAreaBlocks(block.area);
    const index = list.findIndex((b) => b.id === block.id);
    announce(`${deps.getTitle(block)} dropped in ${areaById(block.area)?.label ?? block.area} at position ${index + 1}.`);
    logger.log('⌨️ Keyboard DnD: dropped', block.id, 'in', block.area);
    grabbedId.value = null;
    origin.value = null;
  }

  function cancel(block: BlockItem): void {
    if (origin.value) {
      deps.emitMove({
        blockId: block.id,
        fromArea: block.area,
        toArea: origin.value.area,
        toIndex: origin.value.index,
      });
      deps.onAreaChange?.(origin.value.area);
      deps.focusBlock(block.id);
    }
    announce(`Move cancelled. ${deps.getTitle(block)} returned to its original position.`);
    logger.log('⌨️ Keyboard DnD: cancelled', block.id);
    grabbedId.value = null;
    origin.value = null;
  }

  /**
   * Keydown handler bound to each block's grab element. The view passes the
   * block currently rendered at that element.
   */
  function handleBlockKeydown(event: KeyboardEvent, block: BlockItem): void {
    if (!deps.enabled()) return;
    const key = event.key;

    if (grabbedId.value === null) {
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        event.stopPropagation();
        grab(block);
      }
      return;
    }

    /* Grabbed mode: only react to the grabbed block; ignore stray keys elsewhere. */
    if (grabbedId.value !== block.id) return;

    switch (key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        cancel(block);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        event.stopPropagation();
        drop(block);
        break;
      case 'Tab':
        /* Movement is arrows-only while grabbed. */
        event.preventDefault();
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        moveWithin(block, -1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        moveWithin(block, 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        moveAcross(block, -1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        moveAcross(block, 1);
        break;
    }
  }

  return {
    announcement,
    grabbedId,
    isGrabbed,
    handleBlockKeydown,
  };
}
