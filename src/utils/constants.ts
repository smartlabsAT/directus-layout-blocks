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
  compactMode: false,
  autoSetup: true,
  deleteItems: false,
  enableAreaManagement: false,
  enableTemplates: false
};

export const FIELD_NAME_ALTERNATIVES = {
  area: ['area', 'zone', 'region', 'section', 'layout_area'],
  sort: ['sort', 'order', 'position', 'sort_order', 'display_order']
};

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
} as const;

export const DRAG_ANIMATION_DURATION = 200;

export const MAX_AREA_ID_LENGTH = 64;
export const MAX_AREA_LABEL_LENGTH = 255;

// Status options for blocks
export const STATUS_OPTIONS = [
  { text: 'Published', value: 'published' },
  { text: 'Draft', value: 'draft' },
  { text: 'Archived', value: 'archived' }
];

// Icon mapping for different collection types
export const COLLECTION_ICONS: Record<string, string> = {
  content_headline: 'title',
  content_text: 'text_fields',
  content_image: 'image',
  content_video: 'videocam',
  content_hero: 'landscape',
  content_cta: 'ads_click',
  content_accordion: 'expand_more'
};

// Width options for areas
export const WIDTH_OPTIONS = [
  { text: 'Full (100%)', value: 100 },
  { text: 'Half (50%)', value: 50 },
  { text: 'Third (33%)', value: 33 },
  { text: 'Quarter (25%)', value: 25 },
  { text: 'Two Thirds (66%)', value: 66 },
  { text: 'Three Quarters (75%)', value: 75 }
];