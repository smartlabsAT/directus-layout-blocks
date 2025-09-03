export interface LayoutBlocksOptions {
  // Field Configuration
  areaField?: string;              // Default: 'area'
  sortField?: string;              // Default: 'sort'
  
  // Layout Configuration
  areas?: AreaConfig[];            // Layout areas
  defaultArea?: string;            // Default: 'main'
  
  // Features
  enableDragDrop?: boolean;        // Default: true
  enableAreaManagement?: boolean;  // Default: false
  enableTemplates?: boolean;       // Default: false
  
  // Display
  viewMode?: 'grid' | 'list';      // Default: 'grid'
  compactMode?: boolean;           // Default: false
  showEmptyAreas?: boolean;        // Default: true
  
  // Advanced
  allowedCollections?: string[];   // Limit M2A collections
  maxItemsPerArea?: number;        // Limit per area
  deleteItems?: boolean;           // Delete items when removing blocks
  autoSetup?: boolean;             // Default: true
}

export interface AreaConfig {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  width?: number;           // Width in percent (10-100)
  maxItems?: number;
  minItems?: number;
  allowedTypes?: string[];
  locked?: boolean;
  hidden?: boolean;
  isDefault?: boolean;      // Mark areas that come from default configuration
}

export interface JunctionInfo {
  collection: string;
  primaryKeyField: string;
  foreignKeyField: string;
  itemField: string;
  collectionField: string;
  existingFields: string[];
  hasAreaField: boolean;
  hasSortField: boolean;
  hasCustomFields: boolean;
  allowedCollections?: string[];
}

export interface BlockItem {
  id: number;
  area: string;
  sort: number;
  collection: string;
  item: any;
  _raw?: any;
}

export interface SetupResult {
  created: FieldDefinition[];
  errors: Error[];
  success: boolean;
}

export interface FieldDefinition {
  field: string;
  type: string;
}

export interface UserPermissions {
  create: boolean;
  update: boolean;
  delete: boolean;
  reorder: boolean;
  manageAreas?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface M2AFieldInfo {
  field: string;
  collection: string;
  junctionCollection: string;
  junctionField: string;
  foreignKeyField: string;
  allowedCollections: string[];
  nestedM2AFields?: Record<string, M2AFieldInfo>;
  hasNestedM2A?: boolean;
  // Additional fields for layout-blocks
  areaField?: string;
  sortField?: string;
}