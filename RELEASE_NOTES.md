# Release Notes — v0.0.5

**Status**: Pre-release (pre-1.0, not yet on npm)
**Compatibility**: Directus 10.x / 11.x

---

## 🎉 Directus Layout Blocks

The Directus Layout Blocks interface brings visual, area-based content management to Directus
through a drag-and-drop editor built on Many-to-Any (M2A) relationships.

## 🚀 Highlights

### 📦 Area-based layouts
- Custom layout areas (Hero, Main, Sidebar, …) with width, icon, and color
- Per-area constraints: allowed collection types and a maximum item count
- Lockable areas; automatic handling of orphaned blocks

### 🎯 Drag & drop
- Move blocks between areas and reorder within an area (pointer **and** keyboard)
- Grid and List views

### 🧩 Flexible & native
- Works with any collection allowed by the M2A relationship
- Auto-setup of the junction `area` / `sort` fields
- **Integrates with Directus' native Save / Discard** — block changes are staged in the form and
  persisted on Save (no out-of-band writes for the block flow)
- Permission-aware UI; status display for collections that have a `status` field

## ⚠️ Status & limitations

This is a **pre-release** (v0.0.5): functional and used in real projects, but not yet published to
npm, and the configuration surface may still change before a stable 1.0.

Current limitations:
- **Nested M2A** is detected and loaded by the data layer but has **no nested rendering/editing UI**
  (only top-level blocks are shown).
- **Not on npm** — install manually (see below).
- Not yet tuned for very large block sets.

## 📦 Installation

```bash
git clone https://github.com/smartlabsAT/directus-layout-blocks.git
cp -r directus-layout-blocks /path/to/directus/extensions/directus-extension-layout-blocks
# then restart Directus
```

Create an M2A field, choose the **Layout Blocks** interface, and configure your areas. See the
[README](./README.md) for setup, options, and the permissions a non-admin editor role needs.

## 🛠️ Technical details

- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build**: Vite (Directus Extensions SDK)
- **Styling**: scoped CSS with Directus theme variables

## 🔮 What's next

- Publish to npm
- Nested M2A rendering/editing
- Block templates
- Performance work for large block sets

## 🤝 Contributing & support

Feedback and contributions are welcome. Please report bugs on the
[GitHub repository](https://github.com/smartlabsAT/directus-layout-blocks/issues) and include your
Directus version, steps to reproduce, expected vs. actual behavior, and any console/network errors.

## 📚 Documentation

- [README](./README.md) — setup, configuration, permissions
- [CHANGELOG](./CHANGELOG.md) — version history
- [ARCHITECTURE](./ARCHITECTURE.md) — technical overview
- [DEVELOPMENT](./DEVELOPMENT.md) — development setup

## 📝 License

MIT.
