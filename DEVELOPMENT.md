# Layout Blocks Development Guide

This guide provides detailed information for developers who want to contribute to or extend the Layout Blocks interface.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Code Standards](#code-standards)
4. [Common Tasks](#common-tasks)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Performance Considerations](#performance-considerations)
8. [Contributing Guidelines](#contributing-guidelines)

## Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Directus development environment
- Vue.js DevTools browser extension
- TypeScript knowledge

### Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd layout-blocks
```

2. Install dependencies:
```bash
npm install
```

3. Build for development:
```bash
npm run dev
```

4. Link to your Directus instance:
```bash
# Copy to your Directus extensions folder
cp -r dist /path/to/directus/extensions/interfaces/layout-blocks

# Or create a symlink for development
ln -s $(pwd)/dist /path/to/directus/extensions/interfaces/layout-blocks
```

### Development Workflow

1. **Watch Mode**: Run `npm run dev` to watch for changes
2. **Hot Reload**: Directus will automatically reload when the extension is rebuilt
3. **Browser DevTools**: Use Vue DevTools for component inspection

## Project Structure

```
layout-blocks/
├── src/
│   ├── components/         # Vue components
│   │   ├── AreaManager.vue      # Area configuration UI
│   │   ├── BlockCreator.vue     # Block creation modal
│   │   ├── BlockItem.vue        # Individual block display
│   │   ├── EmptyState.vue       # Empty state component
│   │   ├── GridView.vue         # Grid layout view
│   │   ├── ListView.vue         # List/table view
│   │   └── StatusSelector.vue   # Status dropdown
│   │
│   ├── composables/        # Vue composables (hooks)
│   │   ├── useAutoSetup.ts      # Auto-setup logic
│   │   ├── useBlocks.ts         # Block CRUD operations
│   │   ├── useDragDrop.ts       # Drag & drop functionality
│   │   ├── useJunctionDetection.ts # M2A detection
│   │   └── usePermissions.ts    # Permission checks
│   │
│   ├── types/              # TypeScript definitions
│   │   └── index.ts            # All type definitions
│   │
│   ├── utils/              # Utility functions
│   │   ├── blockHelpers.ts     # Block-related utilities
│   │   ├── constants.ts        # Application constants
│   │   ├── logger.ts           # Logging utility
│   │   └── validators.ts       # Input validators
│   │
│   ├── config/             # Configuration files
│   │   └── areas.ts           # Default area configs
│   │
│   ├── interface.vue       # Main interface component
│   └── index.ts           # Extension entry point
│
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md             # User documentation
├── ARCHITECTURE.md       # Architecture documentation
└── DEVELOPMENT.md        # This file
```

## Code Standards

### TypeScript Guidelines

1. **Use strict typing**:
```typescript
// ❌ Bad
const block: any = { ... }
function processBlock(data: any) { ... }

// ✅ Good
const block: BlockItem = { ... }
function processBlock(data: BlockItem): void { ... }
```

2. **Define interfaces for all data structures**:
```typescript
interface BlockConfig {
  id: number;
  area: string;
  collection: string;
  item: Record<string, any>;
}
```

3. **Use enums for constants**:
```typescript
enum ViewMode {
  Grid = 'grid',
  List = 'list'
}
```

### Vue Component Guidelines

1. **Use Composition API with `<script setup>`**:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BlockItem } from '../types';

// Props with types
interface Props {
  block: BlockItem;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: true
});

// Emits with types
const emit = defineEmits<{
  'update:block': [block: BlockItem];
  'delete': [id: number];
}>();
</script>
```

2. **Component naming**:
- PascalCase for component files: `BlockItem.vue`
- Descriptive names that indicate purpose

3. **Props validation**:
```typescript
interface Props {
  blocks: BlockItem[];
  maxItems?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 10
});
```

### CSS/SCSS Guidelines

1. **Use scoped styles**:
```vue
<style lang="scss" scoped>
.block-item {
  // Styles only apply to this component
}
</style>
```

2. **Follow BEM-like naming**:
```scss
.block-item {
  &__title { }
  &__content { }
  &--active { }
}
```

3. **Use CSS variables**:
```scss
.block-item {
  background: var(--background-normal);
  color: var(--foreground-normal);
}
```

### Composables Pattern

Create reusable logic in composables:

```typescript
// composables/useBlockOperations.ts
export function useBlockOperations() {
  const loading = ref(false);
  
  async function createBlock(data: BlockData) {
    loading.value = true;
    try {
      // Implementation
    } finally {
      loading.value = false;
    }
  }
  
  return {
    loading: readonly(loading),
    createBlock
  };
}
```

## Common Tasks

### Adding a New View Mode

1. Create the view component:
```typescript
// components/KanbanView.vue
<template>
  <div class="kanban-view">
    <!-- Implementation -->
  </div>
</template>
```

2. Add to constants:
```typescript
// utils/constants.ts
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
  KANBAN: 'kanban'
} as const;
```

3. Update the interface:
```vue
// interface.vue
const viewComponent = computed(() => {
  switch (viewMode.value) {
    case 'kanban': return KanbanView;
    // ...
  }
});
```

### Adding a New Block Action

1. Define the action in types:
```typescript
// types/index.ts
interface BlockActions {
  archive?: boolean;
  // ...
}
```

2. Add to BlockItem component:
```vue
<v-list-item @click="$emit('archive')">
  <v-list-item-icon>
    <v-icon name="archive" />
  </v-list-item-icon>
  <v-list-item-content>Archive</v-list-item-content>
</v-list-item>
```

3. Handle in parent component:
```typescript
async function handleArchiveBlock(blockId: number) {
  await api.patch(`/items/${collection}/${blockId}`, {
    status: 'archived'
  });
}
```

### Adding Custom Validation

1. Create validator:
```typescript
// utils/validators.ts
export function validateVideoUrl(url: string): boolean | string {
  const pattern = /^https:\/\/(www\.)?(youtube|vimeo)\.com/;
  return pattern.test(url) || 'Invalid video URL';
}
```

2. Use in component:
```typescript
const urlError = computed(() => {
  if (!videoUrl.value) return null;
  return validateVideoUrl(videoUrl.value);
});
```

## Testing

### Unit Tests

Run unit tests:
```bash
npm run test
```

Write tests for utilities:
```typescript
// utils/__tests__/blockHelpers.test.ts
import { describe, it, expect } from 'vitest';
import { getBlockTitle } from '../blockHelpers';

describe('getBlockTitle', () => {
  it('returns item title if available', () => {
    const block = {
      id: 1,
      item: { title: 'Test Title' }
    };
    expect(getBlockTitle(block)).toBe('Test Title');
  });
});
```

### E2E Tests

For end-to-end testing with Directus:
```typescript
// e2e/layout-blocks.test.ts
test('can create and move blocks', async ({ page }) => {
  await page.goto('/admin/content/pages/1');
  await page.click('[data-testid="add-block"]');
  // ...
});
```

## Debugging

### Enable Debug Mode

1. Set debug flag:
```typescript
// utils/logger.ts
const DEBUG = true; // Enable logging
```

2. Use logger in code:
```typescript
import { logger } from '../utils/logger';

logger.log('Block created:', block);
logger.error('Failed to save:', error);
```

### Vue DevTools

1. Install Vue DevTools browser extension
2. Open DevTools and navigate to Vue tab
3. Inspect component state and props

### Common Issues

#### Blocks Not Loading
- Check network tab for API errors
- Verify junction table structure
- Check console for JavaScript errors

#### Drag & Drop Not Working
- Verify `enableDragDrop` option is true
- Check browser compatibility
- Look for event handler errors

#### Performance Issues
- Use Chrome Performance profiler
- Check for unnecessary re-renders
- Optimize computed properties

## Performance Considerations

### 1. Optimize Computed Properties

```typescript
// ❌ Bad - runs on every change
const filteredBlocks = computed(() => {
  return blocks.value
    .filter(b => b.area === selectedArea.value)
    .sort((a, b) => a.sort - b.sort)
    .map(b => ({ ...b, computed: expensiveOperation(b) }));
});

// ✅ Good - use separate computed properties
const areaBlocks = computed(() => 
  blocks.value.filter(b => b.area === selectedArea.value)
);

const sortedBlocks = computed(() => 
  [...areaBlocks.value].sort((a, b) => a.sort - b.sort)
);
```

### 2. Debounce Expensive Operations

```typescript
import { debounce } from 'lodash-es';

const saveAreas = debounce(async (areas: AreaConfig[]) => {
  await api.patch(`/fields/${collection}/${field}`, {
    meta: { options: { areas } }
  });
}, 500);
```

### 3. Virtual Scrolling

For large lists:
```vue
<virtual-list
  :items="blocks"
  :item-height="80"
  v-slot="{ item }"
>
  <block-item :block="item" />
</virtual-list>
```

### 4. Lazy Loading

```typescript
const blockDetails = ref<Map<number, any>>(new Map());

async function loadBlockDetails(blockId: number) {
  if (blockDetails.value.has(blockId)) return;
  
  const details = await api.get(`/items/${collection}/${blockId}`);
  blockDetails.value.set(blockId, details.data);
}
```

## Contributing Guidelines

### Before You Start

1. Check existing issues and PRs
2. Discuss major changes in an issue first
3. Follow the code standards

### Making Changes

1. Fork the repository
2. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

3. Make your changes following code standards
4. Add/update tests as needed
5. Update documentation

### Commit Messages

Follow conventional commits:
```
feat: add kanban view mode
fix: resolve drag and drop issue in Safari
docs: update installation instructions
refactor: extract block utilities
test: add unit tests for validators
```

### Pull Request Process

1. Ensure all tests pass
2. Update README.md if needed
3. Add entry to CHANGELOG.md
4. Submit PR with clear description

### Code Review

- Address all review comments
- Keep discussions professional
- Be open to feedback

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Directus Extensions SDK](https://docs.directus.io/extensions/sdk/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Directus API Reference](https://docs.directus.io/reference/api/)

## Support

For questions or issues:
1. Check the documentation
2. Search existing issues
3. Create a new issue with reproduction steps
4. Join Directus Discord for community help