# Layout Blocks Architecture Documentation

## Overview

The Layout Blocks interface is a sophisticated Directus extension that provides a visual, drag-and-drop interface for managing content blocks within defined layout areas. This document provides an in-depth technical overview of the architecture, design patterns, and implementation details.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Concepts](#core-concepts)
3. [Component Hierarchy](#component-hierarchy)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Event System](#event-system)
8. [Security Considerations](#security-considerations)
9. [Performance Optimizations](#performance-optimizations)
10. [Extension Points](#extension-points)

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Directus Application                    │
├────────────────────────────────────────────────────────────┤
│                    Layout Blocks Interface                 │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Junction   │    Block     │    Area      │   Permission  │
│  Detection   │ Management   │ Management   │   System      │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                    Directus API Layer                      │
├────────────────────────────────────────────────────────────┤
│   Junction Table  │  Content Collections  │  System Tables │
└────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build System**: Vite (via Directus SDK)
- **State Management**: Vue Reactivity System
- **API Client**: Directus SDK
- **Styling**: SCSS with Directus Design System

## Core Concepts

### 1. Many-to-Any (M2A) Relationships

The interface is built on Directus's M2A relationship type:

```typescript
// M2A Structure Example
{
  collection: 'pages',              // Parent collection
  field: 'content_blocks',          // M2A field
  junction: 'pages_blocks',         // Junction collection
  related_collections: [            // Allowed content types
    'content_hero',
    'content_text',
    'content_image'
  ]
}
```

### 2. Junction Table Structure

The junction table connects parent items with content blocks:

```sql
CREATE TABLE pages_blocks (
  id serial PRIMARY KEY,
  pages_id integer REFERENCES pages(id),
  collection varchar(64),          -- Related collection name
  item integer,                    -- Related item ID
  area varchar(64),               -- Area assignment
  sort integer,                   -- Sort order within area
  -- Additional metadata fields
);
```

### 3. Block Lifecycle

```
Create Block:
Parent Item → Junction Record → Content Item

Update Block:
Content Item Update → Junction Update (if area/sort changes)

Delete Block:
Junction Record Delete → (Optional) Content Item Delete

Move Block:
Junction Record Update (area/sort fields)
```

## Component Hierarchy

### Component Tree

```
interface.vue (Root Component)
├── Toolbar
│   ├── Area Selector
│   ├── View Mode Switcher
│   └── Area Manager Button
├── GridView / ListView (View Components)
│   ├── Area Container
│   │   ├── Area Header
│   │   ├── BlockItem Components
│   │   │   ├── Block Content
│   │   │   ├── StatusSelector
│   │   │   └── Action Menu
│   │   └── Area Footer
│   └── EmptyState
├── BlockCreator (Modal)
│   ├── Collection Selector
│   └── Item Form
├── Block Editor (Drawer)
│   └── Directus Form Component
└── AreaManager (Drawer)
    ├── Area List
    └── Area Configuration
```

### Component Responsibilities

#### interface.vue (Main Component)
- **Purpose**: Root component and main orchestrator
- **Responsibilities**:
  - Initialize M2A relationship detection
  - Manage global state
  - Handle API communications
  - Coordinate child components
  - Manage modals and drawers

#### GridView.vue / ListView.vue
- **Purpose**: Visual representation of blocks
- **Responsibilities**:
  - Render blocks in areas
  - Handle drag & drop interactions
  - Manage area-specific logic
  - Emit block actions to parent

#### BlockItem.vue
- **Purpose**: Individual block representation
- **Responsibilities**:
  - Display block content
  - Handle block-level interactions
  - Manage block status
  - Provide action menu

#### AreaManager.vue
- **Purpose**: Area configuration interface
- **Responsibilities**:
  - CRUD operations for areas
  - Area constraint configuration
  - Validation of area settings
  - Orphaned block management

## Data Flow

### 1. Initialization Flow

```typescript
// 1. Component Mount
onMounted() → initialize()

// 2. Junction Detection
detectJunctionStructure() → {
  collection: 'pages_blocks',
  foreignKeyField: 'pages_id',
  collectionField: 'collection',
  itemField: 'item'
}

// 3. Field Validation
ensureRequiredFields() → {
  area: 'varchar',
  sort: 'integer'
}

// 4. Load Blocks
loadBlocks() → [
  {
    id: 1,
    area: 'main',
    sort: 0,
    collection: 'content_text',
    item: { id: 1, title: 'Welcome', content: '...' }
  }
]
```

### 2. Block Creation Flow

```typescript
// 1. User initiates creation
openBlockCreator(area: 'main')

// 2. Select collection type
selectCollection('content_hero')

// 3. Fill form and submit
createBlock({
  area: 'main',
  collection: 'content_hero',
  item: { title: 'Hero Title', ... }
})

// 4. API calls
POST /items/content_hero → { id: 123, ... }
POST /items/pages_blocks → {
  pages_id: currentPageId,
  collection: 'content_hero',
  item: 123,
  area: 'main',
  sort: 0
}

// 5. Update local state
blocks.value.push(newBlock)
```

### 3. Drag & Drop Flow

```typescript
// 1. Drag Start
handleDragStart(block, sourceArea)
→ Set draggedBlock
→ Add visual feedback
→ Calculate valid drop zones

// 2. Drag Over
handleDragOver(targetArea)
→ Check canDropInArea()
→ Apply visual indicators
→ Set drop effect

// 3. Drop
handleDrop(targetArea, dropIndex)
→ Validate drop
→ Update junction record
→ Reorder blocks
→ Update UI

// 4. API Update
PATCH /items/pages_blocks/{id} → {
  area: 'sidebar',
  sort: 2
}
```

## State Management

### Reactive State Structure

```typescript
// Main State
const blocks = ref<BlockItem[]>([])
const areas = ref<AreaConfig[]>([])
const selectedArea = ref<string | null>(null)
const loading = ref(false)

// UI State
const viewMode = ref<'grid' | 'list'>('grid')
const showBlockCreator = ref(false)
const showAreaManager = ref(false)
const drawerActive = ref(false)

// Editing State
const editingId = ref<number | null>(null)
const editingCollection = ref<string>('')
const editingValues = ref<any>({})

// Computed Properties
const computedAreas = computed(() => {
  // Add orphaned area if needed
  // Filter by visibility settings
  // Apply user customizations
})

const orphanedBlocks = computed(() => 
  blocks.value.filter(b => b.area === 'orphaned')
)
```

### State Update Patterns

```typescript
// Optimistic Updates
async function moveBlock(blockId, toArea, toIndex) {
  // 1. Update local state immediately
  const block = blocks.value.find(b => b.id === blockId)
  block.area = toArea
  block.sort = toIndex
  
  // 2. Update UI
  sortBlocks()
  
  try {
    // 3. Persist to API
    await api.patch(`/items/${junction}/${blockId}`, {
      area: toArea,
      sort: toIndex
    })
  } catch (error) {
    // 4. Revert on failure
    await loadBlocks()
    notify.error('Failed to move block')
  }
}
```

## API Integration

### API Service Layer

```typescript
// Block Operations
class BlockService {
  async create(collection: string, data: any): Promise<any> {
    return api.post(`/items/${collection}`, data)
  }
  
  async update(collection: string, id: number, data: any): Promise<any> {
    return api.patch(`/items/${collection}/${id}`, data)
  }
  
  async delete(collection: string, id: number): Promise<void> {
    return api.delete(`/items/${collection}/${id}`)
  }
}

// Junction Operations
class JunctionService {
  async create(data: JunctionData): Promise<JunctionRecord> {
    return api.post(`/items/${this.junctionCollection}`, data)
  }
  
  async updatePosition(id: number, area: string, sort: number): Promise<void> {
    return api.patch(`/items/${this.junctionCollection}/${id}`, { area, sort })
  }
  
  async delete(id: number): Promise<void> {
    return api.delete(`/items/${this.junctionCollection}/${id}`)
  }
}
```

### API Error Handling

```typescript
// Centralized error handler
async function handleApiError(error: any, context: string) {
  console.error(`API Error in ${context}:`, error)
  
  const message = error.response?.data?.errors?.[0]?.message 
    || error.message 
    || 'An unexpected error occurred'
  
  notifications.add({
    title: `Error: ${context}`,
    text: message,
    type: 'error',
    persist: true
  })
  
  // Specific error handling
  if (error.response?.status === 403) {
    // Permission denied
    permissions.value = await checkPermissions()
  } else if (error.response?.status === 400) {
    // Validation error
    if (message.includes('area')) {
      // Handle orphaned blocks
      await handleOrphanedBlocks()
    }
  }
}
```

## Event System

### Component Events

```typescript
// Block Events
interface BlockEvents {
  'update-block': { blockId: number; updates?: any }
  'remove-block': number
  'duplicate-block': number
  'move-block': {
    blockId: number
    fromArea: string
    toArea: string
    toIndex: number
  }
}

// Area Events
interface AreaEvents {
  'update:areas': AreaConfig[]
  'area-selected': string | null
  'area-removed': string
}

// Global Events
interface GlobalEvents {
  'input': BlockItem[]  // v-model update
  'add-block': string?  // Optional area
}
```

### Event Flow Example

```
User Action: Drag block from 'main' to 'sidebar'

1. BlockItem @dragstart
   → GridView handleDragStart()
   → Set drag state

2. Area @dragover
   → GridView handleDragOver()
   → Validate drop
   → Visual feedback

3. Area @drop
   → GridView handleDrop()
   → Emit 'move-block'

4. interface.vue handleMoveBlock()
   → Update API
   → Update local state
   → Emit 'input'

5. Parent component receives update
   → Persists to database
```

## Security Considerations

### 1. Permission Checks

```typescript
// Check permissions on mount
const permissions = await checkPermissions(junctionCollection, parentCollection)

// Permission-based UI
<v-button v-if="permissions.create" @click="addBlock">
  Add Block
</v-button>

// API-level validation
if (!permissions.update) {
  throw new Error('Insufficient permissions to update blocks')
}
```

### 2. Input Validation

```typescript
// Area ID validation
function sanitizeAreaId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, MAX_AREA_ID_LENGTH)
}

// Collection validation
function validateCollection(collection: string): boolean {
  return allowedCollections.includes(collection)
}
```

### 3. XSS Prevention

- All user content is rendered through Vue's template system
- No direct HTML injection
- Sanitized inputs for IDs and slugs

## Performance Optimizations

### 1. Lazy Loading

```typescript
// Load block content only when needed
const blockContent = computed(() => {
  if (!expanded.value) return null
  return loadBlockContent(block.value.id)
})
```

### 2. Debounced Updates

```typescript
// Debounce area updates
const debouncedSave = debounce(async (areas: AreaConfig[]) => {
  await saveAreas(areas)
}, 500)
```

### 3. Virtual Scrolling

For large numbers of blocks:
```typescript
// Use virtual list for performance
<virtual-list
  :items="blocks"
  :item-height="100"
  :buffer="5"
>
  <template #default="{ item }">
    <block-item :block="item" />
  </template>
</virtual-list>
```

### 4. Memoization

```typescript
// Memoize expensive computations
const memoizedAreaBlocks = computed(() => {
  const cache = new Map()
  return (areaId: string) => {
    if (!cache.has(areaId)) {
      cache.set(
        areaId,
        blocks.value.filter(b => b.area === areaId)
      )
    }
    return cache.get(areaId)
  }
})
```

## Extension Points

### 1. Custom Block Renderers

```typescript
// Register custom block renderer
interface BlockRenderer {
  collection: string
  component: Component
  icon?: string
  preview?: (item: any) => string
}

const customRenderers: BlockRenderer[] = [
  {
    collection: 'custom_map',
    component: MapBlockRenderer,
    icon: 'map',
    preview: (item) => `Map: ${item.location}`
  }
]
```

### 2. Area Plugins

```typescript
// Custom area behavior
interface AreaPlugin {
  id: string
  beforeDrop?: (block: BlockItem, area: AreaConfig) => boolean
  afterDrop?: (block: BlockItem, area: AreaConfig) => void
  renderArea?: (h: any, area: AreaConfig, blocks: BlockItem[]) => VNode
}
```

### 3. Validation Rules

```typescript
// Add custom validation
interface ValidationRule {
  field: string
  validate: (value: any, block: BlockItem) => boolean | string
}

const customValidations: ValidationRule[] = [
  {
    field: 'video_url',
    validate: (url) => {
      const pattern = /^https:\/\/(www\.)?(youtube|vimeo)\.com/
      return pattern.test(url) || 'Only YouTube and Vimeo URLs allowed'
    }
  }
]
```

### 4. Export/Import

```typescript
// Export configuration
interface ExportData {
  version: string
  areas: AreaConfig[]
  blocks: BlockItem[]
  metadata: Record<string, any>
}

function exportConfiguration(): ExportData {
  return {
    version: '1.0.0',
    areas: areas.value,
    blocks: blocks.value.map(b => ({
      ...b,
      item: null  // Reference only
    })),
    metadata: {
      exported: new Date().toISOString(),
      collection: props.collection
    }
  }
}
```

## Best Practices

### 1. Error Handling

Always wrap API calls:
```typescript
try {
  await apiCall()
} catch (error) {
  handleApiError(error, 'Operation Context')
  // Graceful degradation
}
```

### 2. Type Safety

Use TypeScript interfaces:
```typescript
// Bad
const block: any = { ... }

// Good
const block: BlockItem = {
  id: 1,
  area: 'main',
  sort: 0,
  collection: 'content_text',
  item: { ... }
}
```

### 3. Composable Pattern

Extract reusable logic:
```typescript
// Bad: Logic in component
const blocks = ref([])
async function loadBlocks() { ... }

// Good: Use composable
const { blocks, loading, loadBlocks } = useBlocks(...)
```

### 4. Event Naming

Follow conventions:
```typescript
// Bad
emit('blockUpdated', data)

// Good
emit('update:block', data)
emit('block-updated', data)
```

## Debugging

### Enable Debug Mode

```typescript
// utils/logger.ts
const DEBUG = true  // Enable logging
```

### Debug Information

```typescript
// Component state debugging
watchEffect(() => {
  logger.debug('Blocks state:', {
    count: blocks.value.length,
    areas: [...new Set(blocks.value.map(b => b.area))],
    orphaned: blocks.value.filter(b => b.area === 'orphaned').length
  })
})
```

### Performance Profiling

```typescript
// Measure operation time
const start = performance.now()
await heavyOperation()
logger.debug(`Operation took ${performance.now() - start}ms`)
```

## Future Enhancements

1. **Block Templates**: Save and reuse block configurations
2. **Revision History**: Track changes to blocks over time
3. **Collaborative Editing**: Real-time updates for multiple users
4. **Advanced Layouts**: CSS Grid support, responsive breakpoints
5. **Block Library**: Shared block repository across projects
6. **AI Integration**: Smart block suggestions and content generation
7. **Performance**: Virtual scrolling for thousands of blocks
8. **Accessibility**: Enhanced keyboard navigation and screen reader support

---

This architecture document serves as a comprehensive guide for developers working with or extending the Layout Blocks interface. For implementation details, refer to the source code and inline documentation.