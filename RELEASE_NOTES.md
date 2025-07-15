# Release Notes - v0.0.1-alpha

**Release Date**: June 29, 2024  
**Status**: Alpha Release  
**Compatibility**: Directus 10.x

---

## 🎉 Introducing Directus Layout Blocks

We're excited to announce the first alpha release of the Directus Layout Blocks interface! This extension brings powerful visual content management capabilities to Directus through an intuitive drag-and-drop interface.

## 🚀 What's New

### Visual Content Management
Transform how you manage content blocks in Directus with our new visual interface that makes organizing content intuitive and efficient.

### Key Features

#### 📦 **Area-Based Layouts**
- Create custom layout areas (Hero, Main Content, Sidebar, etc.)
- Define constraints per area (max items, allowed content types)
- Visual width configuration for responsive layouts
- Lock important areas to prevent accidental deletion

#### 🎯 **Drag & Drop Interface**
- Intuitive drag-and-drop between areas
- Visual feedback showing valid drop zones
- Automatic reordering within areas
- Support for both Grid and List views

#### 🔧 **Flexible Configuration**
- Works with any Directus collection through M2A relationships
- Auto-setup of required junction fields
- Permission-aware interface elements
- Support for custom status workflows

#### 🎨 **Modern UI/UX**
- Responsive design that adapts to screen sizes
- Dark mode support
- Empty state indicators
- Status icons and visual feedback
- Inline editing capabilities

## ⚠️ Important Notes

### Alpha Status
This is an **alpha release** intended for testing and feedback. While functional, it's not recommended for production use yet.

### Known Limitations

1. **State Management**: Currently uses direct API calls instead of Directus' native form state management. This will be refactored before v1.0.0.

2. **No npm Package**: This version must be installed manually. npm publishing will come with the beta release.

3. **Performance**: Not yet optimized for large datasets (100+ blocks).

4. **Limited Testing**: Basic functionality is tested, but edge cases may exist.

## 📦 Installation

### Manual Installation

```bash
# 1. Download the extension
git clone https://github.com/smartlabsAT/directus-layout-blocks.git

# 2. Copy to your Directus extensions folder
cp -r directus-layout-blocks /path/to/directus/extensions/interfaces/layout-blocks

# 3. Restart Directus
```

### Configuration

1. Create an M2A field in your collection
2. Select "Layout Blocks" as the interface
3. Configure your areas and constraints
4. Start managing your content visually!

## 🛠️ Technical Details

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Scoped CSS with Directus theme integration
- **Architecture**: Modular component-based design

## 🔮 What's Next

### Roadmap to v1.0.0

- **v0.1.0-beta**: Native state management integration
- **v0.2.0-beta**: Performance optimizations
- **v0.3.0-beta**: Enhanced features and UX
- **v0.5.0-rc**: npm package and documentation
- **v1.0.0**: Production-ready stable release

See our [detailed roadmap](./ROADMAP.md) for more information.

## 🤝 Contributing

We welcome feedback and contributions! This alpha release is an opportunity for the community to help shape the future of this extension.

### How to Help

- **Test** the extension and report bugs
- **Suggest** features and improvements
- **Contribute** code via pull requests
- **Share** your use cases and feedback

### Reporting Issues

Please report bugs and issues on our [GitHub repository](https://github.com/smartlabsAT/directus-layout-blocks/issues).

When reporting issues, please include:
- Directus version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## 📚 Documentation

- [README](./README.md) - Getting started guide
- [ARCHITECTURE](./ARCHITECTURE.md) - Technical deep dive
- [DEVELOPMENT](./DEVELOPMENT.md) - Development setup
- [ROADMAP](./ROADMAP.md) - Future plans

## 🙏 Acknowledgments

Special thanks to:
- The Directus team for their excellent platform
- Early alpha testers for their valuable feedback
- Contributors who helped shape this initial release

## 📝 License

This extension is released under the MIT License.

---

**Note**: This is an alpha release. Features may change, and bugs may exist. Use at your own risk and please report any issues you encounter.

Happy content managing! 🎨