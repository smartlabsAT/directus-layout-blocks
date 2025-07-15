# Directus Layout Blocks Interface

A powerful and flexible interface for managing content blocks in different layout areas within Directus. This extension allows you to create dynamic, block-based layouts with drag-and-drop functionality, area management, and visual organization of content.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Architecture Documentation](#architecture-documentation)
- [API Reference](#api-reference)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

## Features

- **Visual Block Management**: Grid and List views for organizing content blocks
- **Drag & Drop**: Intuitive drag-and-drop interface for moving blocks between areas
- **Flexible Areas**: Define custom layout areas with specific rules and constraints
- **Content Type Support**: Works with any Directus collection through M2A (Many-to-Any) relationships
- **Area Constraints**: Set allowed content types and maximum items per area
- **Orphaned Blocks**: Automatic handling of blocks when areas are removed or rules change
- **Status Management**: Built-in status workflow (Published, Draft, Archived)
- **Responsive Design**: Adapts to different screen sizes and layouts
- **Permission Support**: Respects Directus user permissions for create, read, update, delete

## Installation

### Prerequisites

- Directus 10.x or higher
- A Many-to-Any (M2A) field in your collection

### Installation Steps

1. Copy the extension to your Directus extensions folder:
```bash
cp -r layout-blocks /path/to/directus/extensions/interfaces/
```

2. Restart Directus to load the extension

3. The extension will appear as "Layout Blocks" when configuring an M2A interface

## Quick Start

### 1. Create a Many-to-Any Field

First, create an M2A field in your collection (e.g., `pages`):

```javascript
// Example field configuration
{
  field: 'content_blocks',
  type: 'alias',
  meta: {
    interface: 'list-m2a',
    special: ['m2a'],
    options: {
      // Will be replaced with layout-blocks interface
    }
  }
}
```

### 2. Configure Layout Blocks Interface

After creating the M2A field, edit it and change the interface to "Layout Blocks":

```javascript
{
  interface: 'layout-blocks',
  options: {
    enableAreaManagement: true,
    areas: [
      {
        id: 'hero',
        label: 'Hero Section',
        icon: 'panorama',
        maxItems: 1,
        allowedTypes: ['content_hero', 'content_video']
      },
      {
        id: 'main',
        label: 'Main Content',
        icon: 'article',
        width: 66
      },
      {
        id: 'sidebar',
        label: 'Sidebar',
        icon: 'view_sidebar',
        width: 33,
        allowedTypes: ['content_text', 'content_image', 'content_cta']
      }
    ]
  }
}
```

### 3. Create Content Collections

Create collections for your content blocks:

```sql
-- Example: content_hero collection
CREATE TABLE content_hero (
  id serial PRIMARY KEY,
  status varchar(20) DEFAULT 'draft',
  title varchar(255),
  subtitle text,
  image uuid REFERENCES directus_files(id),
  button_text varchar(100),
  button_link varchar(500)
);

-- Example: content_text collection
CREATE TABLE content_text (
  id serial PRIMARY KEY,
  status varchar(20) DEFAULT 'draft',
  title varchar(255),
  content text
);
```

## Configuration

### Interface Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viewMode` | `'grid' \| 'list'` | `'grid'` | Default view mode |
| `showEmptyAreas` | `boolean` | `true` | Show areas without blocks |
| `enableDragDrop` | `boolean` | `true` | Enable drag and drop functionality |
| `enableAreaManagement` | `boolean` | `true` | Allow users to manage areas |
| `compactMode` | `boolean` | `false` | Use compact display mode |
| `autoSetup` | `boolean` | `true` | Auto-create required junction fields |
| `areaField` | `string` | `'area'` | Junction field name for area assignment |
| `sortField` | `string` | `'sort'` | Junction field name for sorting |
| `areas` | `AreaConfig[]` | `[]` | Predefined area configurations |

### Area Configuration

Each area can be configured with:

```typescript
interface AreaConfig {
  id: string;              // Unique area identifier
  label: string;           // Display name
  icon?: string;           // Material icon name
  width?: number;          // Width percentage (25, 33, 50, 66, 75, 100)
  maxItems?: number;       // Maximum blocks allowed
  allowedTypes?: string[]; // Allowed collection names
  locked?: boolean;        // Prevent area deletion
  color?: string;          // Custom color (hex)
}
```

## Usage Guide

### Managing Areas

1. Click the "Manage Areas" button in the toolbar
2. Add new areas with the "Add Area" button
3. Configure each area:
   - **Label**: Display name for the area
   - **ID**: Unique identifier (auto-generated, can be customized)
   - **Icon**: Visual icon for the area
   - **Width**: Layout width (Full, Half, Third, etc.)
   - **Max Items**: Limit number of blocks
   - **Allowed Collections**: Restrict content types

### Adding Content Blocks

1. Click the "+" button in an area or use the main add button
2. Select the content type you want to add
3. Fill in the content fields
4. Click "Create" to add the block

### Organizing Blocks

**Drag & Drop**:
- Drag blocks between areas
- Visual feedback shows valid/invalid drop zones
- Blocks automatically reorder within areas

**Status Management**:
- Click the status indicator to change block status
- Available statuses: Published, Draft, Archived

**Block Actions**:
- Edit: Click the block or use the edit button
- Duplicate: Create a copy of the block
- Delete: Remove the block (with confirmation)

### Handling Orphaned Blocks

When areas are removed or their rules change, affected blocks are moved to an "Orphaned Blocks" area:
- Orphaned blocks can be dragged to valid areas
- The orphaned area appears only when needed
- Blocks cannot be dragged INTO the orphaned area

## Architecture Documentation

### Component Structure

```
layout-blocks/
├── src/
│   ├── components/
│   │   ├── AreaManager.vue      # Area configuration UI
│   │   ├── BlockCreator.vue     # Block creation modal
│   │   ├── BlockItem.vue        # Individual block component
│   │   ├── EmptyState.vue       # Empty state display
│   │   ├── GridView.vue         # Grid layout view
│   │   ├── ListView.vue         # List/table view
│   │   └── StatusSelector.vue   # Status dropdown component
│   ├── composables/
│   │   ├── useAutoSetup.ts      # Auto-setup junction fields
│   │   ├── useBlocks.ts         # Block CRUD operations
│   │   ├── useDragDrop.ts       # Drag & drop logic
│   │   ├── useJunctionDetection.ts # M2A structure detection
│   │   └── usePermissions.ts    # Permission checking
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   ├── utils/
│   │   ├── blockHelpers.ts      # Block utility functions
│   │   ├── constants.ts         # App constants
│   │   ├── logger.ts            # Debug logging
│   │   └── validators.ts        # Input validation
│   ├── interface.vue            # Main interface component
│   └── index.ts                 # Extension entry point
├── package.json
└── README.md
```

### Data Flow

1. **Initialization**:
   ```
   interface.vue (mounted)
     → useJunctionDetection (detect M2A structure)
     → useAutoSetup (ensure required fields)
     → useBlocks (load existing blocks)
     → Initialize UI state
   ```

2. **Block Creation**:
   ```
   User Action → BlockCreator
     → Create item in content collection
     → Create junction record
     → Update local state
     → Emit update event
   ```

3. **Drag & Drop**:
   ```
   DragStart → useDragDrop
     → Validate drop targets
     → Visual feedback
     → On drop: Update junction record
     → Reorder blocks in area
   ```

### State Management

The extension uses Vue 3's Composition API for state management:

- **Local State**: Each component manages its own UI state
- **Shared State**: Block data flows down through props
- **Updates**: Child components emit events, parent handles API calls
- **Reactivity**: Vue's reactive system ensures UI updates

### API Integration

All API calls go through Directus SDK:

```typescript
// Create block
await api.post(`/items/${collection}`, itemData);
await api.post(`/items/${junctionCollection}`, junctionData);

// Update block
await api.patch(`/items/${collection}/${id}`, updates);

// Delete block
await api.delete(`/items/${junctionCollection}/${junctionId}`);
```

## API Reference

### Main Interface Props

```typescript
interface Props {
  value: any[];                    // M2A field value
  field: string;                   // Field name
  collection: string;              // Parent collection
  primaryKey: string | number;     // Parent item ID
  disabled?: boolean;              // Read-only mode
  options?: LayoutBlocksOptions;   // Interface options
}
```

### Events

```typescript
// Emitted when blocks change
emit('input', updatedBlocks);
```

### Composables

#### useBlocks

```typescript
const {
  blocks,        // Ref<BlockItem[]>
  loading,       // Ref<boolean>
  loadBlocks,    // () => Promise<void>
  createBlock,   // (area, collection, item) => Promise<BlockItem>
  updateBlock,   // (id, updates) => Promise<void>
  moveBlock,     // (id, fromArea, toArea, index) => Promise<void>
  removeBlock,   // (id) => Promise<void>
  duplicateBlock // (id) => Promise<BlockItem>
} = useBlocks(collection, field, primaryKey, junctionInfo, options);
```

#### useDragDrop

```typescript
const {
  draggedBlock,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  canDropInArea
} = useDragDrop(blocks, areas, { onMove });
```

## Development Guide

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. For development with watch mode:
   ```bash
   npm run dev
   ```

### Adding New Block Types

1. Create your content collection in Directus
2. Add the collection to the M2A relationship
3. (Optional) Add icon mapping in `utils/constants.ts`:
   ```typescript
   export const COLLECTION_ICONS: Record<string, string> = {
     // ...existing icons
     'content_your_type': 'your_icon'
   };
   ```

### Extending the Interface

To add new features:

1. **New View Mode**: 
   - Create component in `components/`
   - Add to `VIEW_MODES` constant
   - Update view switching logic

2. **New Block Actions**:
   - Add handler in `useBlocks` composable
   - Add UI in BlockItem component
   - Emit appropriate events

3. **New Area Features**:
   - Update `AreaConfig` type
   - Add UI in AreaManager
   - Implement logic in GridView/ListView

### Code Style Guide

- Use TypeScript for all new code
- Follow Vue 3 Composition API patterns
- Use `<script setup>` syntax
- Maintain consistent naming:
  - Components: PascalCase
  - Composables: use* prefix
  - Utils: camelCase
  - Events: kebab-case

## Troubleshooting

### Common Issues

**Blocks not appearing**:
- Check M2A relationship configuration
- Verify junction collection has `area` and `sort` fields
- Check browser console for API errors

**Drag & drop not working**:
- Ensure `enableDragDrop` is true
- Check if areas have `locked: true`
- Verify area constraints (allowedTypes, maxItems)

**Area changes not saving**:
- Check user permissions for field updates
- Verify no validation errors in area configuration
- Check network tab for API errors

**Orphaned blocks appearing**:
- This is normal when areas are removed or rules change
- Drag blocks to valid areas to resolve
- Blocks remain accessible and can be reorganized

### Debug Mode

Enable debug logging by editing `utils/logger.ts`:

```typescript
const DEBUG = true; // Set to true for console logs
```

### Performance Tips

- Use `compactMode` for large numbers of blocks
- Consider pagination for collections with many items
- Limit allowed collections to reduce API calls
- Use list view for better performance with many blocks

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow the code style guide
4. Add tests if applicable
5. Submit a pull request

## License

This extension is released under the MIT License.