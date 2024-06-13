import { ref, Ref } from 'vue';
import type { BlockItem, AreaConfig } from '../types';
import { createDragImage } from '../utils/blockHelpers';

export interface DragDropOptions {
  onMove: (data: {
    blockId: number;
    fromArea: string;
    toArea: string;
    toIndex: number;
  }) => void;
}

export function useDragDrop(
  blocks: Ref<BlockItem[]>,
  areas: Ref<AreaConfig[]>,
  options: DragDropOptions
) {
  const draggedBlock = ref<BlockItem | null>(null);
  const draggedFromArea = ref<AreaConfig | null>(null);
  const dragOverArea = ref<string | null>(null);

  function handleDragStart(event: DragEvent, block: BlockItem, area?: AreaConfig) {
    draggedBlock.value = block;
    if (area) {
      draggedFromArea.value = area;
    }
    
    // Set drag data
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('block-id', block.id.toString());
    event.dataTransfer!.setData('block-area', block.area || '');
    
    // Add dragging class to the element
    const element = event.target as HTMLElement;
    const blockElement = element.closest('.block-item') || element.closest('.block-row');
    if (blockElement) {
      blockElement.classList.add('dragging');
    }
    
    // Add dragging class to body for global styles
    document.body.classList.add('dragging-block');
    
    // Create custom drag image
    const dragImage = createDragImage(block);
    event.dataTransfer!.setDragImage(dragImage, 10, 10);
    
    // Remove the drag image after a short delay
    setTimeout(() => {
      dragImage.remove();
    }, 0);
  }

  function handleDragEnd(event: DragEvent) {
    // Remove dragging class from the element
    const element = event.target as HTMLElement;
    const blockElement = element.closest('.block-item') || element.closest('.block-row');
    if (blockElement) {
      blockElement.classList.remove('dragging');
    }
    
    // Remove dragging class from body
    document.body.classList.remove('dragging-block');
    
    // Reset drag state
    draggedBlock.value = null;
    draggedFromArea.value = null;
    dragOverArea.value = null;
  }

  function canDropInArea(block: BlockItem, area: AreaConfig): boolean {
    // Never allow dropping into orphaned area
    if (area.id === 'orphaned') {
      return false;
    }
    
    // Check if area is locked
    if (area.locked && area.id !== 'orphaned') {
      return false;
    }
    
    // Check max items
    if (area.maxItems) {
      const currentCount = blocks.value.filter(b => b.area === area.id).length;
      const isSameArea = block.area === area.id;
      
      if (!isSameArea && currentCount >= area.maxItems) {
        return false;
      }
    }

    // Check allowed types
    if (area.allowedTypes && area.allowedTypes.length > 0) {
      if (!area.allowedTypes.includes(block.collection)) {
        return false;
      }
    }

    return true;
  }

  function handleDragOver(event: DragEvent, area: AreaConfig): boolean {
    if (!draggedBlock.value) return false;
    
    const canDrop = canDropInArea(draggedBlock.value, area);
    const areaElement = event.currentTarget as HTMLElement;
    
    if (canDrop) {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'move';
      areaElement.classList.remove('drag-not-allowed');
      areaElement.classList.add('drag-over');
      dragOverArea.value = area.id;
      return true;
    } else {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'none';
      areaElement.classList.add('drag-not-allowed');
      areaElement.classList.remove('drag-over');
      dragOverArea.value = null;
      return false;
    }
  }

  function handleDragLeave(event: DragEvent) {
    const areaElement = event.currentTarget as HTMLElement;
    areaElement.classList.remove('drag-not-allowed');
    areaElement.classList.remove('drag-over');
    areaElement.classList.remove('drag-hover');
    dragOverArea.value = null;
  }

  function handleDrop(event: DragEvent, targetArea: AreaConfig, dropIndex?: number) {
    event.preventDefault();
    
    const areaElement = event.currentTarget as HTMLElement;
    areaElement.classList.remove('drag-over');
    areaElement.classList.remove('drag-hover');
    areaElement.classList.remove('drag-not-allowed');
    
    if (!draggedBlock.value || !canDropInArea(draggedBlock.value, targetArea)) {
      return;
    }
    
    // Calculate drop index if not provided
    if (dropIndex === undefined) {
      dropIndex = blocks.value.filter(b => b.area === targetArea.id).length;
    }
    
    // Emit move event
    options.onMove({
      blockId: draggedBlock.value.id,
      fromArea: draggedBlock.value.area || '',
      toArea: targetArea.id,
      toIndex: dropIndex
    });
    
    // Reset drag state
    dragOverArea.value = null;
    draggedBlock.value = null;
    draggedFromArea.value = null;
  }

  return {
    draggedBlock,
    draggedFromArea,
    dragOverArea,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canDropInArea
  };
}