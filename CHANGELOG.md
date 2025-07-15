# Changelog

All notable changes to the Directus Layout Blocks interface will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes at this time._

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