# Directus Layout Blocks Interface

<div align="center">

![Pre-release](https://img.shields.io/badge/status-pre--release-orange.svg)
![Version](https://img.shields.io/badge/version-0.0.5-blue.svg)
![Directus](https://img.shields.io/badge/directus-10.x%20%7C%2011.x-64f.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

</div>

> [!NOTE]
> **Pre-release (v0.0.5).** The extension is functional and integrates with Directus' native
> Save/Discard system. It is not yet published to npm and the configuration surface may still
> change before a stable 1.0 release. Read the [Limitations](#limitations--not-yet-implemented)
> section before relying on it in production.

---

A flexible Directus **interface** for arranging content blocks into named **layout areas**.
It turns a Many-to-Any (M2A) relationship into a visual, drag-and-drop block editor: you define
areas (e.g. *Hero*, *Main*, *Sidebar*), drop blocks of any allowed collection into them, reorder
them, and the order + area assignment are stored on the relationship's junction records.

## Table of Contents

- [What You Get](#what-you-get)
- [How It Works (Architecture)](#how-it-works-architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How Saving Works](#how-saving-works)
- [Permissions & Production Setup](#permissions--production-setup)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Development Guide](#development-guide)
- [Limitations & Not Yet Implemented](#limitations--not-yet-implemented)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## What You Get

- **Visual block management** — Grid and List views for organizing content blocks.
- **Layout areas** — Define custom areas (Hero, Main, Sidebar, …) with width, icon, color, and constraints.
- **Drag & drop** — Move blocks between areas and reorder within an area; keyboard drag-and-drop is supported.
- **Add by create / link / duplicate** — Add a new block inline, **link an existing** item, or **duplicate** one — via a guided wizard.
- **Any collection** — Works with any collections allowed by your M2A relationship.
- **Area constraints** — Per-area allowed collection types and a maximum item count; lockable areas.
- **Orphaned blocks** — Blocks whose area no longer exists are collected in a system "Orphaned" area so nothing is lost.
- **Status display** — Shows a block's `status` (Published / Draft / Archived) when the collection has a status field.
- **Native Save integration** — All block changes flow through Directus' standard Save / Save & Stay / Discard.
- **Permission-aware** — Honors the acting user's Directus permissions for the involved collections.

## How It Works (Architecture)

Three layers are involved. **You create only one field by hand** — the rest is provided by
Directus or by the extension's auto-setup.

| Layer | Created by | What it is |
|-------|-----------|------------|
| **M2A alias field** on your parent collection (e.g. `pages.blocks`) | **You (admin)** | A relational *alias* field (`localType: m2a`). This is where you choose the **Layout Blocks** interface. |
| **Junction collection** (e.g. `pages_blocks`) | **Directus** (automatically) | Stores one row per block: a foreign key to the parent, plus the polymorphic `item` + `collection` pair. |
| **`area` + `sort` fields** on the junction | **The extension** (`autoSetup`, on by default) | `area` (string) = which layout area the block belongs to; `sort` (integer) = order within that area. |

> **Important:** `area` and `sort` live on the **junction records**, not on the parent item. The
> extension reads the allowed block collections from the M2A relation
> (`relation.meta.one_allowed_collections`).

### Data layout (where blocks live)

Blocks are rows in the junction table. For example, a `pages` item with five blocks across three areas:

| id  | pages_id | item | collection    | area    | sort |
|-----|----------|------|---------------|---------|------|
| 101 | 1        | 501  | content_hero  | hero    | 0    |
| 102 | 1        | 601  | content_text  | main    | 0    |
| 103 | 1        | 602  | content_text  | main    | 1    |
| 104 | 1        | 51   | content_image | sidebar | 0    |

Each row is one block: `item` + `collection` point to the content item, `area` is its layout
region, and `sort` orders it within that area. Adding, moving, or reordering blocks adds/updates
rows here.

## Installation

### Prerequisites

- Directus **10.x or 11.x** (`host: ^10.0.0 || ^11.0.0`).
- A Many-to-Any (M2A) field in the collection you want to lay out.

### Installation Steps

1. Build the extension (produces `dist/index.js`):
   ```bash
   npm install
   npm run build
   ```
2. Copy the extension into your Directus `extensions/` directory, e.g.
   `extensions/directus-extension-layout-blocks/` (Directus auto-detects bundled extensions there).
3. Restart Directus. The interface appears as **"Layout Blocks"** when configuring an M2A field.

## Quick Start

### 1. Create a Many-to-Any field

Create an M2A field on your collection (e.g. `pages`) and configure its **Allowed Collections**
(the content types that may be used as blocks):

```javascript
// Field definition (the standard Directus M2A field)
{
  field: 'blocks',
  type: 'alias',
  meta: {
    interface: 'list-m2a',   // standard M2A interface (changed to layout-blocks in step 2)
    special: ['m2a']
  }
}
```

> If you do not configure allowed collections on the relation, the interface shows a warning and
> lets you enter collection names manually in the options.

### 2. Switch the interface to "Layout Blocks"

Edit the field and change its interface to `layout-blocks`, then configure areas:

```javascript
{
  interface: 'layout-blocks',
  options: {
    enableAreaManagement: true,   // optional: let editors manage areas (admin/schema rights — see Permissions)
    areas: [
      { id: 'hero',    label: 'Hero Section', icon: 'panorama',     maxItems: 1, allowedTypes: ['content_hero', 'content_video'] },
      { id: 'main',    label: 'Main Content', icon: 'article',      width: 66 },
      { id: 'sidebar', label: 'Sidebar',      icon: 'view_sidebar', width: 33, allowedTypes: ['content_text', 'content_image', 'content_cta'] }
    ]
  }
}
```

### 3. Create your content (block) collections

Each allowed collection is a normal Directus collection. A `status` field is optional — if present,
its value is shown on the block.

```sql
-- Example: a "hero" block collection
CREATE TABLE content_hero (
  id          serial PRIMARY KEY,
  status      varchar(20) DEFAULT 'draft',
  title       varchar(255),
  subtitle    text,
  image       uuid REFERENCES directus_files(id),
  button_text varchar(100),
  button_link varchar(500)
);
```

On first open, the extension creates the `area` and `sort` fields on the junction automatically
(requires admin/schema rights — see [Permissions](#permissions--production-setup)).

## Configuration

### Interface Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viewMode` | `'grid' \| 'list'` | `'grid'` | Initial view mode. |
| `compactMode` | `boolean` | `false` | Denser block layout. |
| `fullWidth` | `boolean` | `false` | Render the editor across the **full form width** (breaks out of the form column; padding preserved). |
| `enableDragDrop` | `boolean` | `true` | Enable drag-and-drop reordering / moving. |
| `showEmptyAreas` | `boolean` | `true` | Show areas that contain no blocks. |
| `enableAreaManagement` | `boolean` | `false` | Show the **Manage Areas** UI. Saving areas writes the field's options → **requires admin/schema rights**. |
| `areas` | `AreaConfig[]` | `[{ id: 'main', label: 'Main Content', icon: 'inbox', width: 100 }]` | The available layout areas (see below). |
| `defaultArea` | `string` | `'main'` | Area assigned to new blocks. |
| `areaField` | `string` | `'area'` | Junction field name holding the area id. |
| `sortField` | `string` | `'sort'` | Junction field name holding the sort order. |
| `autoSetup` | `boolean` | `true` | Auto-create the `area`/`sort` fields on the junction. **Requires admin/schema rights** (see Permissions). |
| `allowedCollections` | `string[]` | *(unset)* | Restrict blocks to a subset of the M2A's allowed collections. Empty = all allowed collections. |
| `maxItemsPerArea` | `integer` | *(unset)* | Global cap on blocks per area. A per-area `maxItems` takes precedence. |

### Area Configuration

Each entry in `areas` is an `AreaConfig`. These properties are configurable via the area editor:

```typescript
interface AreaConfig {
  id: string;              // Unique area identifier (e.g. 'main')
  label: string;           // Display name
  icon?: string;           // Material Symbols icon name
  color?: string;          // Accent color (hex)
  width?: number;          // Layout width in percent (e.g. 25, 33, 50, 66, 75, 100)
  maxItems?: number;       // Maximum blocks in this area
  allowedTypes?: string[]; // Restrict this area to specific collection names
}
```

> `AreaConfig` also declares `locked`, `hidden`, and `isDefault`, which are used internally
> (e.g. for the system "Orphaned" area) and have no editor fields.

**Locked areas** show no "add block" button, cannot be edited in the Area Manager, and their blocks
cannot be dragged out. The system "Orphaned" area is the exception: it is always locked but lets
blocks leave so you can rescue them into a valid area.

## How Saving Works

The editor integrates with Directus' **native Save** — it does **not** persist block changes
behind the form's back.

- **Staged via the form (persist on Save):** adding, editing (including block field edits made in
  the drawer and status changes), moving, reordering, linking, duplicating, and removing blocks all
  update the field value in memory and `emit('input', …)`.
  They are written when the user clicks **Save** / **Save & Stay**, and reverted by **Discard**
  (the editor reloads from the database). Unsaved blocks carry a temporary id
  (`new_…`, `dup_…`, `existing_…`) until Save resolves them to real keys.
- **Immediate, direct API (outside the form Save):**
  - `autoSetup` field creation — `POST /fields/{junction}` (one-time, on init).
  - Area-management persistence — `PATCH /fields/{collection}/{field}` (when you save areas).
  - Hard delete via the **Delete everywhere** action (requires `delete` permission) — `DELETE /items/{collection}/{id}`.
  - Reads — initial block load and the fetch used when linking/duplicating an existing item.

## Permissions & Production Setup

Two operations require **admin / schema access** because they modify the data model
(Directus restricts `directus_fields` / `directus_collections` to admins):

- **`autoSetup`** → `POST /fields/{junction}` (creates `area`/`sort`).
- **`enableAreaManagement`** (saving areas) → `PATCH /fields/{collection}/{field}`.

**Recommended for non-admin editors:** have an admin open each collection once (so `area`/`sort`
get provisioned and areas are configured), then set `autoSetup: false` and
`enableAreaManagement: false` for the editor-facing configuration. Otherwise a non-admin opening a
not-yet-provisioned field hits a 403 and the interface shows a setup error.

**Permissions an editor (non-admin) role needs:**

| Collection | read | create | update | delete |
|-----------|:----:|:------:|:------:|:------:|
| Junction (`<parent>_<field>`) | ✅ | ✅ | ✅ | ✅ |
| Each allowed block collection | ✅ | ✅¹ | ✅¹ | ✅¹ |
| Parent collection | ✅ | — | ✅ | — |

¹ Only needed if editors should create / edit / delete the underlying items (not just link or view them).

> **Security:** Do not grant blanket `create` / all-fields permission on the junction. Scope the
> junction's `collection` field with a permission **validation rule** (`{ collection: { _in: [ …allowed types ] } }`),
> otherwise editors can point relations at arbitrary collections and bypass the permissions of the
> related collections.

### Manual setup (when `autoSetup: false`)

Create these two fields on the junction collection yourself:

- **`area`** — type `string` (varchar, length 64), not nullable, default = your `defaultArea` (e.g. `main`).
- **`sort`** — type `integer`, not nullable, default `0`.

(If `areaField` / `sortField` are customized, use those names instead.)

## Usage Guide

### Managing areas

With `enableAreaManagement: true`, click **Manage Areas** in the toolbar to add areas and edit each
area's label, id, icon, color, width, max items, and allowed collections. Saving writes the field's
options (admin/schema rights required).

### Adding blocks

Use **Add block** (or the per-area add control) to open the wizard, which offers three modes:

- **Create** a new item inline.
- **Link existing** — reference an existing content item.
- **Duplicate existing** — create a copy of an existing item.

Then fill in the fields and confirm. The block is staged and saved with the form.

### Organizing blocks

- **Drag & drop (pointer)** — move a block between areas or reorder within an area. Invalid moves
  are blocked by area constraints (`allowedTypes`, `maxItems`, lock).
- **Drag & drop (keyboard)** — focus a block, then:
  - **Enter / Space** — grab or drop
  - **Arrow Up / Down** — reorder within the current area
  - **Arrow Left / Right** — move to the previous / next eligible area
  - **Escape** — cancel and restore the original position
- **Edit** — open a block to edit its item in a drawer; changes are **staged** and persisted on Save.
- **Status** — when the block's collection has a `status` field, the status badge is clickable
  (with `update` permission) to switch Published / Draft / Archived; the change is staged.
- **Duplicate** — create a copy of a block's item.
- **Remove** — opens a menu with two choices:
  - **Unassign from this page** — removes the block from this layout only (unlink). The item stays
    in its collection and on any other pages that use it.
  - **Delete everywhere** — permanently deletes the underlying item. Shown only when you have
    `delete` permission on the block's collection.

### Filtering by area

The toolbar's **area selector** (shows "All areas" by default) focuses the view on a single area
and displays the block count per area.

### Orphaned blocks

When an area is removed or its rules change, affected blocks move to a system **Orphaned** area:
- The orphaned area appears only when needed and is locked (cannot be deleted).
- Drag orphaned blocks into a valid area to resolve them; you cannot drag blocks *into* it.

## Project Structure

```
layout-blocks/
├── src/
│   ├── components/
│   │   ├── AddBlockDropdown.vue          # Per-area "add block" control
│   │   ├── AreaDeleteConfirm.vue         # Confirm dialog for deleting an area
│   │   ├── AreaManager.vue               # Area configuration UI
│   │   ├── BlockCreator.vue              # Add-block wizard (create / link / duplicate)
│   │   ├── BlockItem.vue                 # Individual block rendering
│   │   ├── DeleteConfirmationDialog.vue  # Generic delete confirmation
│   │   ├── EmptyState.vue                # Empty-area / empty-list state
│   │   ├── GridView.vue                  # Grid layout view (incl. inline drag & drop)
│   │   ├── ListView.vue                  # List/table view (incl. inline drag & drop)
│   │   └── StatusSelector.vue            # Status display/selector
│   ├── composables/
│   │   ├── useAutoSetup.ts               # Auto-create area/sort junction fields
│   │   ├── useBlockPermissions.ts        # Per-action permission helpers
│   │   ├── useBlocks.ts                  # Block state + emit serialization
│   │   ├── useKeyboardDnd.ts             # Keyboard drag & drop
│   │   └── usePermissions.ts             # Permission lookup
│   ├── config/
│   │   └── areas.ts                      # Default/area helpers
│   ├── directives/
│   │   └── btnAria.ts                    # ARIA pass-through for v-button
│   ├── services/
│   │   ├── api-client.ts                 # API wrapper
│   │   └── api-client.types.ts
│   ├── types/
│   │   └── index.ts                      # TypeScript definitions
│   ├── utils/
│   │   ├── blockHelpers.ts               # Block-related helpers (icons, labels)
│   │   ├── constants.ts                  # Defaults & constants
│   │   ├── helpers.ts                    # General helpers (temp ids, etc.)
│   │   ├── logger.ts / logger-wrapper.ts # Debug logging
│   │   ├── m2a-helper.ts                 # M2A structure analysis + data loading
│   │   ├── validation.ts                 # Input validation
│   │   └── validators.ts                 # Area-config validation
│   ├── interface.vue                     # Main interface component (orchestrator)
│   └── index.ts                          # Extension entry point
├── package.json
└── README.md
```

### Data flow

1. **Initialization** — `interface.vue` (mounted) → `M2AHelper.analyzeM2AStructure()` (`utils/m2a-helper.ts`, detect junction + allowed collections) → `useAutoSetup` (ensure `area`/`sort`) → `useBlocks.loadBlocks()` (read existing blocks) → render.
2. **Block actions** — the wizard / views call `useBlocks` (`addBlock`, `linkExistingItem`, `duplicateExistingItem`, `updateBlock`, `moveBlock`, `reorderBlocks`, `unlinkBlock`, `deleteBlock`); state changes trigger `emit('input', prepareItemsForEmit())`.
3. **Persistence** — Directus' Save writes the emitted M2A value; Discard re-triggers `loadBlocks()`.

## API Reference

### Interface props

```typescript
// As defined in interface.vue
{
  value:      any[];              // M2A field value
  field:      string;             // Field name
  collection: string;             // Parent collection
  primaryKey: string | number;    // Parent item id
  disabled?:  boolean;            // Read-only mode (default false)
  options?:   LayoutBlocksOptions;// Interface options (default {})
}
```

### Events

```typescript
// The interface emits a single 'input' event with the serialized M2A array
emit('input', prepareItemsForEmit());
```

### `useBlocks` composable

```typescript
const {
  blocks,                 // ComputedRef<BlockItem[]>
  loading,                // ComputedRef<boolean>
  error,                  // ComputedRef<unknown>
  isInternalUpdate,       // Ref<boolean> (emit/reload re-entrancy guard)
  loadBlocks,             // () => Promise<void>
  getBlocksForArea,       // (areaId) => BlockItem[]
  addBlock,               // stage a new inline block
  linkExistingItem,       // stage a link to an existing item
  duplicateExistingItem,  // stage a duplicate of an existing item
  updateBlock,            // update a block's area/sort
  unlinkBlock,            // remove the junction link
  deleteBlock,            // unlink (+ hard-delete the item when requested)
  reorderBlocks,          // resequence sort within an area
  moveBlock,              // move a block to another area
  markBlockDirty,         // flag a block as changed (for emit)
  prepareItemsForEmit     // serialize blocks to the M2A form value
} = useBlocks(collection, field, primaryKey, junctionInfo, options);
```

> Drag-and-drop is implemented inline in `GridView.vue` / `ListView.vue` (with `useKeyboardDnd`
> for keyboard interaction); there is no separate drag-and-drop composable.

## Development Guide

```bash
npm install        # install dependencies (pnpm is used in the monorepo)
npm run build      # build dist/index.js
npm run dev        # build in watch mode
```

### Adding a new block type

1. Create the content collection in Directus.
2. Add it to the M2A relationship's allowed collections.
3. *(Optional)* add an icon mapping in `utils/constants.ts` (`COLLECTION_ICONS`).

### Debug logging

Debug logging turns on automatically in development builds (`import.meta.env.MODE === 'development'`).
In a production build, enable it at runtime from the browser console:

```js
localStorage.setItem('LAYOUT_BLOCKS_DEBUG', 'true'); // persists across reloads
window.LAYOUT_BLOCKS_DEBUG = true;                   // or: current session only
location.reload();
```

Logs are prefixed `[LayoutBlocks]`. See `utils/logger.ts` / `utils/logger-wrapper.ts`.

## Limitations & Not Yet Implemented

- **Nested M2A** — the data layer detects and loads nested M2A (up to depth 3), but there is **no
  nested rendering/editing UI**; only top-level blocks are shown.
- **Not on npm** — install manually for now.

## Troubleshooting

**Blocks don't appear**
- Check the M2A relationship and its allowed collections.
- Verify the junction has `area` and `sort` fields (auto-created by `autoSetup`, or add them manually).
- A 403 on load is logged (not shown) — confirm the role has **read** on the junction. Check the browser console.

**"Setup Error" on open**
- `autoSetup` tried to create fields without rights. Open once as an admin (or pre-create the
  junction fields and set `autoSetup: false`). See [Permissions](#permissions--production-setup).

**Can't add blocks (save fails)**
- The role is missing **create** on the junction collection (and/or create on the block collection
  for inline creation). See the permissions table.

**Drag & drop not working**
- Ensure `enableDragDrop: true`, the target area isn't `locked`, and the move satisfies
  `allowedTypes` / `maxItems`.

**Area changes not saving**
- Saving areas needs admin/schema rights (`PATCH /fields`). See Permissions.

**Still stuck?**
- Enable [debug logging](#debug-logging) and watch the browser console (logs are prefixed
  `[LayoutBlocks]`); check the Network tab for failed requests.

## Roadmap

**Done**
- Native Save / Discard integration (changes flow through the form, not direct writes).
- Keyboard drag-and-drop.
- Add by create / link / duplicate.

**Planned**
- Publish to npm.
- Nested M2A rendering/editing.
- Block templates.
- Performance work for large block sets.

## Contributing

Contributions are welcome:

1. Fork the repository.
2. Create a feature branch.
3. Follow the existing code style (TypeScript, Vue 3 `<script setup>`).
4. Add tests where applicable.
5. Open a pull request.

## License

Released under the MIT License.
