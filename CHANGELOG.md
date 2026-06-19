# Changelog

All notable changes to the Directus Layout Blocks interface will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Substantial work has landed since `v0.0.5` (the redesign epic and its follow-ups) but has not yet been tagged as a release.

### Added
- **Full Width** interface option to render the editor across the full form width.
- Keyboard drag & drop, arrow-key focus navigation between blocks, focus rings, ARIA roles, and reduced-motion support (accessibility pass).
- AreaManager: icon picker, lock/unlock, delete confirmation, and per-collection icons.
- Redesigned block-creation wizard (create / link existing / duplicate existing) and a native-choice delete dialog.

### Changed
- **Block changes now persist through Directus' native Save / Discard** (global Save integration) instead of direct API calls — changes are staged in the form and written on Save; Discard reloads from the database.
- Full UI redesign to the Directus design language: interface shell, toolbar, ListView (segmented tabs + tokenized table), BlockItem, and AreaManager.
- Theme QA across light / dark / custom primary; shared drag preview and shared components from `expandable-blocks` (incl. ItemSelector integration).
- Compatibility: Directus **10.x and 11.x**.

### Removed
- Unused interface options `deleteItems` and `enableTemplates`, and the unused `AreaConfig.minItems`.
- Stale documentation: `TROUBLESHOOTING.md` and `ROADMAP.md`.

### Fixed
- Directus 11 admin check; numerous keyboard / focus / ARIA issues; toolbar sticky-shadow behavior.

### Docs
- README overhauled to match the current code (options, permissions, save model, limitations); RELEASE_NOTES updated.

## [0.0.5] - 2025-09-04

Maintenance release: removed E2E tests that required a running Directus instance (CI stability).

## [0.0.4] - 2025-09-02

Maintenance release (version bump).

## [0.0.3] - 2025-09-02

### Added
- Dependency on `expandable-blocks` for shared components and ItemSelector integration.

## [0.0.2-alpha] - 2025-08-28

### Added
- Proper logger system (replacing raw console statements); quality tooling and GitHub workflows.

## [0.0.1-alpha] - 2024-06-29

**Initial alpha release** 🎉

This is the first public release of the Directus Layout Blocks interface. While functional, this is an alpha version with known limitations.

### 🚀 Features

#### Core Functionality
- **Visual Block Management**: Grid and List views for organizing content blocks
- **Drag & Drop**: Intuitive drag-and-drop interface for moving blocks between areas
- **Area Management**: Create and configure layout areas with constraints
- **Content Types**: Support for any Directus collection through M2A relationships
- **Status Workflow**: Built-in support for Published, Draft, and Archived statuses

#### Area System
- Define custom layout areas with specific rules
- Set maximum items per area
- Restrict allowed content types per area
- Visual width configuration (Full, Half, Third, etc.)
- Locked areas to prevent deletion
- Automatic orphaned block handling

#### User Interface
- Responsive grid and list views
- Dark mode support
- Empty state indicators
- Visual feedback during drag operations
- Status indicators with icons
- Inline editing capabilities

#### Technical Features
- Auto-setup for required junction fields
- Permission-based UI elements
- TypeScript support
- Modular component architecture
- Composable-based logic organization

### ⚠️ Known Limitations

This alpha release has the following limitations that will be addressed before v1.0.0:

1. **State Management**: Uses direct API calls instead of Directus' native form state management
2. **Save/Revert**: No integration with Directus' save and revert system
3. **Performance**: Not optimized for large datasets (100+ blocks)
4. **Testing**: Limited test coverage
5. **Documentation**: Some advanced features not fully documented

### 🛠️ Technical Details

- **Compatibility**: Directus 10.x
- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build**: Vite
- **Style**: Scoped CSS with Directus theme variables

### 📦 Installation

This alpha version must be installed manually:

```bash
# Copy to your Directus extensions folder
cp -r layout-blocks /path/to/directus/extensions/interfaces/

# Restart Directus
```

### 🔄 Migration

No migration needed for fresh installations. This is the initial release.

### 🙏 Acknowledgments

Thanks to all early testers and contributors who helped shape this initial release.