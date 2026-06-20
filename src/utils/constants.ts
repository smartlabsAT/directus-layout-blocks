export const DEFAULT_AREA_CONFIG = [
  {
    id: 'main',
    label: 'Main Content',
    icon: 'inbox',
    width: 100
  }
];

export const DEFAULT_OPTIONS = {
  areaField: 'area',
  sortField: 'sort',
  defaultArea: 'main',
  enableDragDrop: true,
  showEmptyAreas: true,
  viewMode: 'grid' as const,
  editMode: 'drawer' as const,
  compactMode: false,
  fullWidth: false,
  autoSetup: true,
  enableAreaManagement: false
};

export const FIELD_NAME_ALTERNATIVES = {
  area: ['area', 'zone', 'region', 'section', 'layout_area'],
  sort: ['sort', 'order', 'position', 'sort_order', 'display_order']
};

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
} as const;

export const EDIT_MODES = {
  DRAWER: 'drawer',
  INLINE: 'inline'
} as const;

export const DRAG_ANIMATION_DURATION = 200;

export const MAX_AREA_ID_LENGTH = 64;
export const MAX_AREA_LABEL_LENGTH = 255;

// The special, system-managed area that collects blocks whose area no longer
// exists. It is injected/removed automatically (interface.vue computedAreas) and
// is always locked — never user-creatable, -editable, -removable or -unlockable.
export const ORPHANED_AREA_ID = 'orphaned';

// Status options for blocks
export const STATUS_OPTIONS = [
  { text: 'Published', value: 'published' },
  { text: 'Draft', value: 'draft' },
  { text: 'Archived', value: 'archived' }
];

export interface CollectionMeta {
  icon: string;
  label: string;
  description: string;
  quickFields?: string[];
}

// Single source of truth for collection display metadata (icon/label/description/quick-create
// fields). This is the UNION of every collection key used across the extension — every key that
// getBlockIcon historically resolved (incl. content_hero/content_accordion) MUST stay here, or the
// block icons in the already-shipped GridView/ListView would regress to the generic fallback.
export const COLLECTION_META: Record<string, CollectionMeta> = {
  content_headline: { icon: 'title', label: 'Headline', description: 'Title or heading text', quickFields: ['headline', 'subheadline'] },
  content_text: { icon: 'text_fields', label: 'Text Block', description: 'Rich text content', quickFields: ['title', 'content'] },
  content_image: { icon: 'image', label: 'Image', description: 'Image with caption', quickFields: ['title', 'alt_text'] },
  content_video: { icon: 'videocam', label: 'Video', description: 'Embedded video', quickFields: ['title', 'video_url'] },
  content_cta: { icon: 'ads_click', label: 'Call to Action', description: 'Button or action link', quickFields: ['title', 'button_text', 'button_link'] },
  content_button: { icon: 'smart_button', label: 'Button', description: 'Simple button element', quickFields: ['button_text', 'button_link'] },
  content_wysiwig: { icon: 'edit_note', label: 'Rich Text', description: 'WYSIWYG editor content', quickFields: ['content'] },
  content_block: { icon: 'widgets', label: 'Generic Block', description: 'Flexible content block', quickFields: ['title', 'content'] },
  content_hero: { icon: 'landscape', label: 'Hero', description: 'Hero banner section' },
  content_accordion: { icon: 'expand_more', label: 'Accordion', description: 'Collapsible content section' }
};

// Icon mapping derived from COLLECTION_META — kept as a named export for backward compatibility.
export const COLLECTION_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(COLLECTION_META).map(([key, meta]) => [key, meta.icon])
);

// Width options for areas
export const WIDTH_OPTIONS = [
  { text: 'Full (100%)', value: 100 },
  { text: 'Half (50%)', value: 50 },
  { text: 'Third (33%)', value: 33 },
  { text: 'Quarter (25%)', value: 25 },
  { text: 'Two Thirds (66%)', value: 66 },
  { text: 'Three Quarters (75%)', value: 75 }
];

// Curated icon choices for the AreaManager icon picker — a bounded, layout/section
// focused set (Material Symbols) rendered as a v-icon grid. Chosen over the native
// `interface-select-icon` interface, whose teleported, full-width, virtual-scrolled
// menu does not fit a compact table cell (issue #64). Includes the icons used by the
// default/locked areas so existing values are always representable in the grid.
export const AREA_ICON_CHOICES = [
  'dashboard', 'dashboard_customize', 'grid_view', 'view_quilt', 'view_column', 'view_agenda',
  'view_day', 'view_carousel', 'view_sidebar', 'vertical_split', 'horizontal_split', 'web',
  'horizontal_rule', 'table_rows', 'calendar_view_day', 'vertical_align_top', 'vertical_align_bottom',
  'west', 'east', 'inbox', 'title', 'text_fields', 'image', 'smart_button',
  'ads_click', 'video_library', 'segment', 'star'
];