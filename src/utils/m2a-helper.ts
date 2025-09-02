import { logger } from './logger';
import { isNotNullish } from './validation';
import { METADATA_FIELDS } from './helpers';
import { createApiClient } from '../services/api-client';
import type { IDirectusApiClient } from '../services/api-client.types';
import type { M2AFieldInfo } from '../types';

export type { M2AFieldInfo };

export class M2AHelper {
  private api: any;
  private apiClient: IDirectusApiClient;
  private fieldsStore: any;
  private relationsStore: any;
  
  constructor(api: any, stores: any) {
    this.api = api;
    this.apiClient = createApiClient(api);
    this.fieldsStore = stores.useFieldsStore();
    this.relationsStore = stores.useRelationsStore();
  }

  /**
   * Analyze a collection to find all M2A fields and their nested structures
   * Extended version with area/sort field support for layout-blocks
   */
  async analyzeM2AStructure(
    collection: string, 
    field: string
  ): Promise<M2AFieldInfo> {
    // Get relation info
    const relations = this.relationsStore.getRelationsForField(collection, field);
    const relation = relations?.[0];
    
    if (!relation) {
      logger.debug(`No relation found for ${collection}.${field}, returning minimal structure`);
      // Return a minimal structure instead of throwing
      return {
        field,
        collection,
        junctionCollection: `${collection}_${field}`,
        junctionField: field,
        foreignKeyField: `${collection}_id`,
        allowedCollections: [],
        nestedM2AFields: {},
        // Additional fields for layout-blocks
        areaField: 'area',
        sortField: 'sort'
      };
    }

    // Determine junction collection name
    let junctionCollection = relation.collection;
    if (!junctionCollection || junctionCollection === collection) {
      junctionCollection = `${collection}_${field}`;
    }

    // Determine foreign key field
    const foreignKeyField = relation.meta?.many_field || `${collection}_id`;

    // Get allowed collections
    let allowedCollections = [];
    if (relation.meta?.one_allowed_collections) {
      allowedCollections = relation.meta.one_allowed_collections;
    }
    
    // If no allowed collections in relation meta, check if they're passed via field options
    if (allowedCollections.length === 0) {
      try {
        const fields = this.fieldsStore.getFieldsForCollection(collection);
        const fieldConfig = fields.find((f: any) => f.field === field);
        if (fieldConfig?.meta?.options?.allowedCollections) {
          allowedCollections = fieldConfig.meta.options.allowedCollections;
        }
      } catch (e) {
        logger.debug('Could not get field options:', e);
      }
    }

    // Check for area/sort fields in junction collection (for layout-blocks)
    let areaField: string | undefined;
    let sortField: string | undefined;
    
    try {
      const junctionFields = this.fieldsStore.getFieldsForCollection(junctionCollection);
      
      // Check for area field
      const hasAreaField = junctionFields.some((f: any) => f.field === 'area');
      if (hasAreaField) {
        areaField = 'area';
      }
      
      // Check for sort field
      const hasSortField = junctionFields.some((f: any) => f.field === 'sort');
      if (hasSortField) {
        sortField = 'sort';
      }
    } catch (e) {
      logger.debug('Could not check junction fields for area/sort:', e);
    }

    const fieldInfo: M2AFieldInfo = {
      field,
      collection,
      junctionCollection,
      junctionField: field, // The field name is the junction field
      foreignKeyField,
      allowedCollections,
      nestedM2AFields: {},
      // Include area/sort fields if found
      areaField,
      sortField
    };

    // Check each allowed collection for nested M2A fields
    for (const allowedCollection of allowedCollections) {
      try {
        const fields = this.fieldsStore.getFieldsForCollection(allowedCollection);
        const m2aFields = fields.filter((f: any) => 
          f.meta?.interface === 'm2a' || f.meta?.special?.includes('m2a')
        );

        if (m2aFields.length > 0) {
          fieldInfo.hasNestedM2A = true;
          for (const nestedField of m2aFields) {
            try {
              // Recursively analyze nested M2A
              const nestedInfo = await this.analyzeM2AStructure(
                allowedCollection, 
                nestedField.field
              );
              fieldInfo.nestedM2AFields![allowedCollection] = nestedInfo;
            } catch (nestedError) {
              logger.warn(`Could not analyze nested field ${allowedCollection}.${nestedField.field}:`, nestedError);
              // Continue with other fields
            }
          }
        }
      } catch (error) {
        logger.warn(`Could not analyze ${allowedCollection}:`, error);
      }
    }

    return fieldInfo;
  }

  /**
   * Load data for M2A field with all nested structures
   * Extended version with area/sort field support for layout-blocks
   */
  async loadM2AData(
    parentId: string | number,
    fieldInfo: M2AFieldInfo,
    depth: number = 0,
    maxDepth: number = 3,
    area?: string
  ): Promise<any[]> {
    if (depth >= maxDepth) {
      logger.warn('Max nesting depth reached');
      return [];
    }

    try {
      // Build fields parameter for nested M2A
      let fieldsParam = '*';
      
      // Add item expansion for each allowed collection
      if (fieldInfo.allowedCollections.length > 0) {
        const itemFields = fieldInfo.allowedCollections
          .map(col => `item:${col}.*`)
          .join(',');
        fieldsParam = `*,${itemFields}`;
      } else {
        // If no allowed collections specified, try to expand item generically
        fieldsParam = '*,item.*';
      }

      // Build filter
      const filter: any = {
        [fieldInfo.foreignKeyField]: {
          _eq: parentId
        }
      };

      // Add area filter if specified and field exists
      if (area && fieldInfo.areaField) {
        filter[fieldInfo.areaField] = {
          _eq: area
        };
      }

      // Build sort parameter
      let sortParam = ['id'];
      if (fieldInfo.areaField && fieldInfo.sortField) {
        sortParam = [fieldInfo.areaField, fieldInfo.sortField];
      } else if (fieldInfo.sortField) {
        sortParam = [fieldInfo.sortField];
      }

      // Load junction records
      const response = await this.apiClient.searchItems(fieldInfo.junctionCollection, {
        filter,
        fields: fieldsParam.split(','),
        limit: -1,
        sort: sortParam
      });

      const records = response.data || [];

      // If there are nested M2A fields, load them recursively
      if (fieldInfo.hasNestedM2A && depth < maxDepth) {
        for (const record of records) {
          if (record.item && typeof record.item === 'object' && record.item !== null) {
            const itemCollection = record.collection;
            const nestedFieldInfo = fieldInfo.nestedM2AFields?.[itemCollection];
            
            if (nestedFieldInfo) {
              // Find all M2A fields in this item
              const itemFields = this.fieldsStore.getFieldsForCollection(itemCollection);
              const m2aFields = itemFields.filter((f: any) => 
                f.meta?.special?.includes('m2a')
              );

              for (const m2aField of m2aFields) {
                // Load nested M2A data
                const nestedData = await this.loadM2AData(
                  record.item.id,
                  nestedFieldInfo,
                  depth + 1,
                  maxDepth
                );
                
                // Attach to item
                record.item[m2aField.field] = nestedData;
              }
            }
          }
        }
      }

      return records;
    } catch (error) {
      logger.error(`Error loading M2A data for ${fieldInfo.collection}.${fieldInfo.field}:`, error);
      throw error; // Re-throw to match test expectations
    }
  }

  /**
   * Create default data for a collection, initializing all M2A fields
   */
  getDefaultDataForCollection(collection: string): any {
    const defaultData: any = {};
    
    try {
      const fields = this.fieldsStore.getFieldsForCollection(collection);
      
      // Process each field
      fields.forEach((field: any) => {
        // Skip system fields
        if (METADATA_FIELDS.includes(field.field)) {
          return;
        }
        
        // Skip hidden fields
        if (field.meta?.hidden) {
          return;
        }
        
        // Use schema default if available
        if (isNotNullish(field.schema?.default_value)) {
          defaultData[field.field] = field.schema.default_value;
          return;
        }
        
        // Set defaults based on field type
        switch (field.type) {
          case 'string':
          case 'text':
            defaultData[field.field] = '';
            break;
          case 'integer':
          case 'bigInteger':
          case 'float':
          case 'decimal':
            // Check if it's a foreign key field - FKs should be null, not 0
            if (field.schema?.foreign_key_table) {
              defaultData[field.field] = null;
              logger.debug(`Setting FK field ${field.field} to null (references ${field.schema.foreign_key_table})`);
            } else {
              defaultData[field.field] = 0;
            }
            break;
          case 'boolean':
            defaultData[field.field] = false;
            break;
          case 'json':
          case 'csv':
            defaultData[field.field] = null;
            break;
          case 'uuid':
          case 'hash':
            defaultData[field.field] = null;
            break;
          case 'date':
          case 'dateTime':
          case 'time':
          case 'timestamp':
            defaultData[field.field] = null;
            break;
          default:
            // For alias fields (like M2A), don't include in defaults
            if (field.type !== 'alias') {
              defaultData[field.field] = null;
            }
        }
      });
      
    } catch (error) {
      logger.warn(`Could not get fields for ${collection}:`, error);
    }
    
    logger.debug(`Generated default data for ${collection}:`, defaultData);
    return defaultData;
  }
}