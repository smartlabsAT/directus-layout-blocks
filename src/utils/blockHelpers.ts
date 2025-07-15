import type { BlockItem } from '../types';

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
 * Get the icon for a block based on its collection
 */
export function getBlockIcon(block: BlockItem): string {
  const icons: Record<string, string> = {
    content_headline: 'title',
    content_text: 'text_fields',
    content_image: 'image',
    content_video: 'videocam',
    content_hero: 'landscape',
    content_cta: 'ads_click',
    content_accordion: 'expand_more',
    // Add more mappings as needed
  };
  
  return icons[block.collection] || 'widgets';
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
 * Create a drag image element for block dragging
 */
export function createDragImage(block: BlockItem): HTMLElement {
  const dragImage = document.createElement('div');
  dragImage.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    background: var(--background-page);
    border: 2px solid var(--primary);
    border-radius: var(--border-radius);
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    font-family: var(--font-family);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 200px;
    z-index: 9999;
    pointer-events: none;
  `;
  
  // Add header with icon
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
    color: var(--foreground-normal);
  `;
  
  const icon = document.createElement('span');
  icon.innerHTML = '📦';
  header.appendChild(icon);
  
  const title = document.createElement('span');
  title.textContent = getBlockTitle(block);
  header.appendChild(title);
  
  dragImage.appendChild(header);
  
  // Add collection type
  const meta = document.createElement('div');
  meta.style.cssText = `
    font-size: 12px;
    color: var(--foreground-subdued);
  `;
  meta.textContent = getCollectionLabel(block.collection);
  dragImage.appendChild(meta);
  
  document.body.appendChild(dragImage);
  return dragImage;
}