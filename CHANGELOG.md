# Changelog

All notable changes to the Layout Blocks interface will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation (README.md, ARCHITECTURE.md, DEVELOPMENT.md)
- Utility functions for common operations (blockHelpers.ts)
- Reusable components (EmptyState, StatusSelector)
- Drag & Drop composable for shared logic
- Logger utility with debug mode
- Visual feedback for invalid drop zones
- Inline editing in Area Manager
- Collection management UI in Area Manager

### Changed
- Refactored BlockItem to use shared utilities
- Improved area management with inline editing
- Enhanced orphaned blocks handling
- Better TypeScript typing throughout
- Consolidated constants and configuration

### Fixed
- Orphaned blocks not appearing when areas removed
- Duplicate orphaned tabs in ListView
- Drag & drop validation in ListView
- Area constraints not properly enforced

### Removed
- Test interface file (test-interface.vue)
- Excessive console.log statements
- Duplicate code across components

## [1.0.0] - 2024-01-10

### Added
- Initial release of Layout Blocks interface
- Grid and List view modes
- Drag & drop functionality
- Area management system
- Content block CRUD operations
- M2A relationship support
- Permission-based UI
- Status workflow (Published, Draft, Archived)
- Auto-setup for junction fields
- Orphaned blocks handling
- Area constraints (maxItems, allowedTypes)
- Responsive design
- Dark mode support

### Features
- **Visual Block Management**: Organize content blocks in a visual interface
- **Flexible Areas**: Define custom layout areas with rules
- **Drag & Drop**: Move blocks between areas intuitively
- **Content Types**: Support for any Directus collection
- **Permissions**: Respects Directus user permissions
- **Extensible**: Easy to add new view modes and features