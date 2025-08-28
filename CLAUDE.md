# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sprache
du antwortest mir und sagst immer was du machst auf: *Deutsch*
Dokumentation und Kommentare schreibst du auf: *Englisch*

## Formatierung von Antworten

Wenn du längere Antworten oder wichtige Informationen präsentierst, verwende farbige Trennlinien statt Kästen, um das Kopieren zu erleichtern:

```
═══════════════════════════════════════════════════════════════════════════════

Dein Inhalt hier...

═══════════════════════════════════════════════════════════════════════════════
```

Dies macht die Inhalte visuell abgegrenzt, aber trotzdem einfach kopierbar.

**WICHTIG**: Vermeide Kästen um Inhalte, da diese das Kopieren erschweren!

## Project Overview

This is a **Directus CMS layout extension** that provides an interactive M2A (Many-to-Any) block-based content management interface. The extension enables visual content composition with various block types including text, images, videos, CTAs, and more.

## Extension Type: Layout

This is a **layout extension** that provides:

- **Layout Extension** (`layout-blocks`):
   - Entry: `src/index.ts`
   - Output: `dist/index.js`
   - Provides a complete layout interface for managing block-based content
   - Supports drag & drop, inline editing, and various media types
   - Integrates with Directus' collections and relationships

## Technology Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Directus Extensions SDK (v12.0.2)
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Directus**: v11.0.0+ compatible
- **Key Libraries**: 
  - @directus/extensions-sdk (v12.0.2)
  - vuedraggable (v4.1.0)
  - lodash-es (v4.17.21)
- **Styling**: SCSS/Sass
- **Extension Type**: Layout
- **Package Manager**: pnpm (primary), npm (commands)

## Development Commands

```bash
# Package Management
pnpm install          # We use pnpm for package management

# Development
npm run build         # Build the extension
npm run dev           # Development mode with file watcher

# Testing
npm run test -- --run # Unit tests with Vitest (use --run to avoid watcher)
npm run test:ui       # Vitest UI interface
npm run test:coverage -- --run # With coverage reports
npm run test:e2e      # End-to-end tests with Playwright
npm run test:e2e:ui   # E2E tests with UI

# Code Quality
npm run type-check    # Run TypeScript type checking
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix

# Release
npm run release:patch # Bump patch version
npm run release:minor # Bump minor version
npm run release:major # Bump major version

# Docker (if running in Docker)
docker compose restart directus # Restart Directus after changes
```

## URL for Directus

https://backend.smartlabs.dev/

## Project Structure

### Core Components (in src/components/)

1. **layout-blocks.vue** - Main layout component
   - Orchestrates all functionality
   - Manages state and data flow
   - Handles Directus integration

2. **Component Modules**:
   - **BlockList.vue** - Main container for blocks with drag & drop
   - **BlockItem.vue** - Individual block rendering
   - **BlockEditor.vue** - Inline editing interface
   - **BlockActions.vue** - Action buttons (duplicate, delete, move)
   - **BlockStatus.vue** - Status management
   - **AddBlockButton.vue** - Interface for adding new blocks
   - **MediaSelector.vue** - Media selection and management

### Block Types Supported

- **Text Block** - Rich text content
- **Image Block** - Image with caption
- **Video Block** - Video embed
- **Call to Action** - CTA buttons and links
- **Hero Banner** - Large header sections
- **Gallery** - Image galleries
- **Accordion** - Collapsible content
- **Quote** - Blockquotes and testimonials

### Composables (in src/composables/)

- **useLayoutBlocks.ts** - Main composable orchestrating functionality
- **useBlockState.ts** - State management for blocks
- **useBlockActions.ts** - CRUD operations
- **useDragDrop.ts** - Drag and drop functionality
- **useMediaHandling.ts** - Media upload and selection

### Utilities (in src/utils/)

- **block-helpers.ts** - Block manipulation utilities
- **validation.ts** - Input validation
- **logger.ts** - Debug logging system
- **notifications.ts** - User notifications

### Type System (in src/types/)

- **index.ts** - Main type exports
- **blocks.ts** - Block-specific types
- **layout.ts** - Layout configuration types
- **directus.ts** - Directus integration types

## Important Development Notes

1. **Code Reuse & Extension Policy** (CRITICAL):
   - **ALWAYS search for existing services, functions, and helpers before writing new logic**
   - Use existing utilities wherever possible (check utils/, composables/)
   - **New files MAY be created when necessary**, BUT:
     - MUST reuse existing functionality instead of creating duplicate functions
     - Check if similar functionality already exists before implementing
     - Prefer extending existing modules over creating redundant ones
   - Services and functions MAY be extended if needed, BUT:
     - NEVER break existing interfaces or method signatures
     - ALWAYS ensure backward compatibility
     - Add new parameters as optional with defaults
     - Test that existing functionality still works after changes
   - **NO DUPLICATE FUNCTIONALITY**: If a function/utility already exists, use it!

2. **Directus Native Features & Third-Party Packages Policy** (CRITICAL):
   - **ALWAYS use Directus native functionality when available**:
     - Use Directus SDK methods for API calls
     - Leverage Directus stores (useItemsStore, useCollectionsStore, etc.)
     - Use Directus UI components and interfaces
     - Integrate with Directus permission system
     - Use Directus notification system
   - **Research before implementing complex features**:
     - Check if Directus already provides the functionality
     - Search for existing npm packages that solve the problem
     - Document why a package was chosen in code comments

3. **Build Process**:
   - Development uses automatic file watching (`npm run dev`)
   - Changes in `/extensions/layout-blocks/src/` are automatically detected
   - Docker container restart may be needed for major changes

4. **Testing Environment**:
   - Extension is part of the Smartlabs CMS project using Directus v11.2.0
   - Local Directus runs on port 8055 with PostgreSQL on port 6801
   - Testing domain: `https://backend.smartlabs.dev/` (local)

## Logging Guidelines (CRITICAL)

### ⚠️ NEVER use console.log/warn/error directly!

The extension includes a logging system that MUST be used for all logging:

### Import the Logger

```typescript
// Use relative imports based on your file location
import { logger, logDebug, logError, logWarn } from '../utils/logger';

// For component-specific logging
const componentLogger = logger.scope('MyComponent');
```

### Logger Functions

- **logDebug()** - For debug information
- **logError()** - For errors (with stack traces)
- **logWarn()** - For warnings
- **logger.scope()** - For scoped logging

### Important Notes

- Use structured data (objects) for context, not string concatenation
- The logger prefix `[LayoutBlocks]` is added automatically
- All logs include timestamps

## Common Development Workflows

### Adding a New Block Type

1. **Define the block type** in `src/types/blocks.ts`
2. **Add UI support** in `src/components/AddBlockButton.vue`
3. **Configure display** in `src/components/BlockItem.vue`
4. **Add icon mapping** if needed
5. **Test the new block type** thoroughly

### Extending Existing Services

1. **Search for existing functionality first**: Use grep/search tools
2. **Check all related files**: Service might be used in multiple places
3. **Add optional parameters** to maintain backward compatibility
4. **Update TypeScript types** accordingly
5. **Test all existing usages** after changes

## Testing Approach

- **Unit Tests**: Vitest with Vue Test Utils
  - Test files in `test/unit/`
  - Setup file in `test/setup.ts`
  - Coverage reports in `test-output/coverage/`

- **E2E Tests**: Playwright
  - Test files in `test/e2e/`
  - Screenshots in `test-output/screenshots/`

## Documentation Structure

- **README.md** - User-facing documentation
- **CLAUDE.md** - This development guide
- **docs/** - Additional documentation
  - **ARCHITECTURE.md** - System architecture
  - **CHANGELOG.md** - Version history
  - **CONTRIBUTING.md** - Contribution guidelines
  - **ROADMAP.md** - Future plans

## Git Commit Guidelines

**IMPORTANT**: When creating commits for this project:
- **NO SIGNATURES**: Do NOT add any AI signatures, emojis, or "Generated with Claude" messages
- Keep commit messages clean and professional
- Follow conventional commit format: `type: description`
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Example: `fix: resolve drag and drop ordering issue`

### Git Add Rules (CRITICAL)
- **NEVER use `git add -A` or `git add .`** unless explicitly instructed
- **ONLY add specific files** that are directly related to the current task
- Commits should contain ONLY the logic/changes for the current feature/fix
- Before committing, always check what files will be included
- If user wants all changes added, they will explicitly say so

## Key Files to Understand

### Core Files
1. **src/index.ts** - Extension entry point
2. **src/layout-blocks.vue** - Main layout component
3. **src/composables/useLayoutBlocks.ts** - Core business logic
4. **src/components/BlockList.vue** - Block list container
5. **src/types/blocks.ts** - TypeScript type definitions

### Configuration
1. **package.json** - Project configuration
2. **tsconfig.json** - TypeScript configuration
3. **vite.config.ts** - Build configuration

## Package Management

- **Primary**: pnpm (used for dependency installation: `pnpm install`)
- **Commands**: npm (all scripts in package.json use npm: `npm run build`, `npm run test`, etc.)
- **Lock file**: pnpm-lock.yaml (committed to repository)

## Extension Configuration

The layout extension can be configured with the following options:
- **collections**: Which collections to enable the layout for
- **blockTypes**: Available block types
- **enableDragDrop**: Enable/disable drag and drop
- **enableInlineEdit**: Enable/disable inline editing
- **maxBlocks**: Maximum number of blocks allowed

## Integration with Directus

The extension integrates with Directus through:
- **useItems** - For fetching and managing collection items
- **useStores** - For accessing Directus stores
- **useApi** - For API calls
- **useNotification** - For user notifications
- **useRouter** - For navigation

## Performance Considerations

- Lazy load heavy components
- Use virtual scrolling for large block lists
- Optimize image loading with lazy loading
- Cache API responses where appropriate
- Minimize re-renders with proper Vue reactivity

## Security Notes

- Always validate user input
- Sanitize HTML content
- Use Directus permission system
- Never expose sensitive data in logs
- Follow OWASP guidelines for web security

## Support & Resources

- **Directus Documentation**: https://docs.directus.io/
- **Vue 3 Documentation**: https://vuejs.org/
- **TypeScript Documentation**: https://www.typescriptlang.org/
- **Project Repository**: [Your repository URL]