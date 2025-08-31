# Shared Components from expandable-blocks

This directory documents the available shared components and composables from the `directus-extension-expandable-blocks` package.

## Available Imports

### Composables

```typescript
import { useItemSelector } from 'directus-extension-expandable-blocks/shared';
```

The main composable that provides ItemSelector functionality:
- Opens ItemSelector dialog
- Manages search and filtering
- Handles pagination
- Provides multi-language support
- Manages permissions

### Components

```typescript
import { ItemSelectorDrawer } from 'directus-extension-expandable-blocks/shared';
```

The main drawer component for item selection:
- Full-featured item browser
- Search and filter capabilities
- Link and Duplicate modes
- Permission-aware UI

### Type Definitions

```typescript
import type { 
  ItemSelectorConfig,
  ItemSelectorReturn,
  TranslationInfo,
  FieldWithTranslation 
} from 'directus-extension-expandable-blocks/shared';
```

TypeScript type definitions for:
- `ItemSelectorConfig` - Configuration options
- `ItemSelectorReturn` - Return type of useItemSelector
- `TranslationInfo` - Translation metadata
- `FieldWithTranslation` - Field with translation support

## Usage Example

```typescript
import { useItemSelector, ItemSelectorDrawer } from 'directus-extension-expandable-blocks/shared';
import type { ItemSelectorConfig } from 'directus-extension-expandable-blocks/shared';

// In your component setup
const itemSelector = useItemSelector(api, allowedCollections, {
  loggerPrefix: '[LayoutBlocks]',
  allowLink: true,
  allowDuplicate: true,
  defaultItemsPerPage: 50
});

// Open the selector
itemSelector.open('collection_name');

// Handle selection
const handleItemSelection = (items: any[]) => {
  // Process selected items
  itemSelector.close();
};
```

## Version

Currently using: `directus-extension-expandable-blocks@^1.3.0`

## Documentation

For detailed documentation, see:
- [SHARED_COMPONENTS.md](../../expandable-blocks/SHARED_COMPONENTS.md)
- [GitHub Repository](https://github.com/smartlabsAT/directus-expandable-blocks)