import type { AreaConfig, BlockItem } from '../types';
import { MAX_AREA_ID_LENGTH, MAX_AREA_LABEL_LENGTH } from './constants';

export function validateAreaId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  // Check length
  if (id.length > MAX_AREA_ID_LENGTH) return false;
  
  // Check format (alphanumeric, dash, underscore)
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export function validateAreaConfig(area: AreaConfig): string[] {
  const errors: string[] = [];
  
  if (!validateAreaId(area.id)) {
    errors.push('Area ID must be alphanumeric with dashes/underscores only');
  }
  
  if (!area.label || area.label.length > MAX_AREA_LABEL_LENGTH) {
    errors.push('Area label is required and must be less than 255 characters');
  }
  
  if (area.maxItems !== undefined && area.maxItems < 0) {
    errors.push('Max items must be a positive number');
  }
  
  if (area.minItems !== undefined && area.minItems < 0) {
    errors.push('Min items must be a positive number');
  }
  
  if (area.maxItems !== undefined && area.minItems !== undefined && area.minItems > area.maxItems) {
    errors.push('Min items cannot be greater than max items');
  }
  
  return errors;
}

export function canAddBlockToArea(
  area: AreaConfig,
  currentBlocks: BlockItem[],
  blockCollection?: string
): { allowed: boolean; reason?: string } {
  // Check max items
  if (area.maxItems !== undefined) {
    const currentCount = currentBlocks.filter(b => b.area === area.id).length;
    if (currentCount >= area.maxItems) {
      return { 
        allowed: false, 
        reason: `Area "${area.label}" already has the maximum number of items (${area.maxItems})` 
      };
    }
  }
  
  // Check allowed types
  if (area.allowedTypes && area.allowedTypes.length > 0 && blockCollection) {
    if (!area.allowedTypes.includes(blockCollection)) {
      return { 
        allowed: false, 
        reason: `Collection "${blockCollection}" is not allowed in area "${area.label}"` 
      };
    }
  }
  
  // Check if area is locked
  if (area.locked) {
    return { 
      allowed: false, 
      reason: `Area "${area.label}" is locked` 
    };
  }
  
  return { allowed: true };
}

export function validateBlockMove(
  block: BlockItem,
  fromArea: AreaConfig,
  toArea: AreaConfig,
  allBlocks: BlockItem[]
): { allowed: boolean; reason?: string } {
  // Can't move from locked area
  if (fromArea.locked) {
    return { 
      allowed: false, 
      reason: `Cannot move blocks from locked area "${fromArea.label}"` 
    };
  }
  
  // Check if can add to target area
  return canAddBlockToArea(toArea, allBlocks, block.collection);
}

export function sanitizeAreaId(input: any): string {
  // Ensure input is a string
  const str = String(input || '');
  
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, MAX_AREA_ID_LENGTH);
}