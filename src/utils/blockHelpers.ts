import type { BlockItem } from '../types';
import { COLLECTION_META } from './constants';

/**
 * Get the display title for a block
 */
export function getBlockTitle(block: BlockItem): string {
  const item = block.item;
  if (!item) return `Block #${block.id}`;

  return item.title || 
         item.name || 
         item.headline || 
         item.label ||
         item.heading ||
         `${getCollectionLabel(block.collection)} #${block.id}`;
}

/**
 * Get the subtitle/description for a block
 */
export function getBlockSubtitle(block: BlockItem): string | null {
  const item = block.item;
  if (!item) return null;

  return item.subtitle || 
         item.description || 
         item.excerpt ||
         item.summary ||
         null;
}

/**
 * Get a formatted label for a collection name
 */
export function getCollectionLabel(collection: string): string {
  return collection
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^Content /, '');
}

/**
 * Get the Material icon for a collection (by name) from the shared COLLECTION_META.
 */
export function getCollectionIcon(collection: string): string {
  return COLLECTION_META[collection]?.icon ?? 'widgets';
}

/**
 * Get the icon for a block based on its collection.
 */
export function getBlockIcon(block: BlockItem): string {
  return getCollectionIcon(block.collection);
}

/**
 * Get a human-readable status label
 */
export function getStatusLabel(status?: string): string {
  const statusMap: Record<string, string> = {
    published: 'Published',
    draft: 'Draft',
    archived: 'Archived'
  };
  
  return statusMap[status || 'draft'] || 'Draft';
}

/**
 * Create a floating drag-image element for block dragging.
 *
 * Shared by GridView and ListView (issue #51). The Material Symbols glyph is
 * applied via the v-icon component's SCOPED styles (its data-v attribute), so a
 * hand-built icon node would render no glyph — callers therefore pass their
 * already-rendered `.v-icon` node and we clone it. The element must be appended
 * to document.body BEFORE the caller calls `setDragImage()` so the `--theme--*`
 * custom properties resolve (a detached node has none); the caller removes it on
 * the next tick.
 *
 * @param sourceIconEl the block's already-rendered v-icon node to clone. Each view
 *   queries its own DOM — Grid: `.block-item[data-block-id] .block-icon .v-icon`,
 *   List: the dragged row's `.icon-cell .v-icon`. When absent, no icon is shown.
 */
export function createDragImage(block: BlockItem, sourceIconEl?: Element | null): HTMLElement {
  const dragImage = document.createElement('div');
  dragImage.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    background: var(--theme--background);
    border: var(--theme--border-width) solid var(--theme--primary);
    border-radius: var(--theme--border-radius);
    padding: 16px;
    box-shadow: var(--theme--popover--menu--box-shadow);
    font-family: var(--theme--fonts--sans--font-family);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 200px;
    z-index: 9999;
    pointer-events: none;
  `;

  // Header: real collection icon (cloned from the rendered v-icon) + title.
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
    color: var(--theme--foreground);
  `;

  if (sourceIconEl) {
    header.appendChild(sourceIconEl.cloneNode(true));
  }

  const title = document.createElement('span');
  title.textContent = getBlockTitle(block);
  header.appendChild(title);

  dragImage.appendChild(header);

  // Collection type meta line.
  const meta = document.createElement('div');
  meta.style.cssText = `
    font-size: 12px;
    color: var(--theme--foreground-subdued);
  `;
  meta.textContent = getCollectionLabel(block.collection);
  dragImage.appendChild(meta);

  document.body.appendChild(dragImage);
  return dragImage;
}