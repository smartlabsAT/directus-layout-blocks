import { logger } from '../utils/logger';
import { useApi, useStores } from '@directus/extensions-sdk';
import type { JunctionInfo, SetupResult, FieldDefinition, LayoutBlocksOptions } from '../types';

export function useAutoSetup() {
  const api = useApi();
  const { useNotificationsStore } = useStores();
  const notifications = useNotificationsStore();

  async function ensureRequiredFields(
    junctionInfo: JunctionInfo,
    options: LayoutBlocksOptions
  ): Promise<SetupResult> {
    const created: FieldDefinition[] = [];
    const errors: Error[] = [];

    if (!options.autoSetup) {
      return { created, errors, success: true };
    }

    try {
      // Check and create area field
      const areaFieldName = options.areaField || 'area';
      if (!junctionInfo.existingFields.includes(areaFieldName)) {
        const areaFieldCreated = await createAreaField(
          junctionInfo.collection,
          areaFieldName,
          options.defaultArea || 'main'
        );
        
        if (areaFieldCreated) {
          created.push({ field: areaFieldName, type: 'area' });
        }
      } else {
        // Field exists, check if it's the right type
        const isValidType = await checkFieldCompatibility(
          junctionInfo.collection,
          areaFieldName,
          'string'
        );
        
        if (!isValidType) {
          // Try alternative field name
          const altFieldName = `${areaFieldName}_layout`;
          if (!junctionInfo.existingFields.includes(altFieldName)) {
            const altFieldCreated = await createAreaField(
              junctionInfo.collection,
              altFieldName,
              options.defaultArea || 'main'
            );
            
            if (altFieldCreated) {
              created.push({ field: altFieldName, type: 'area' });
              // Update options to use the alternative field
              options.areaField = altFieldName;
            }
          } else {
            errors.push(new Error(`Field conflict: Cannot use '${areaFieldName}' or '${altFieldName}' for area`));
          }
        }
      }

      // Check and create sort field
      const sortFieldName = options.sortField || 'sort';
      if (!junctionInfo.existingFields.includes(sortFieldName)) {
        const sortFieldCreated = await createSortField(
          junctionInfo.collection,
          sortFieldName
        );
        
        if (sortFieldCreated) {
          created.push({ field: sortFieldName, type: 'sort' });
        }
      } else {
        // Check if existing field is compatible
        const isValidType = await checkFieldCompatibility(
          junctionInfo.collection,
          sortFieldName,
          'integer'
        );
        
        if (!isValidType) {
          // Try alternative field name
          const altFieldName = `${sortFieldName}_order`;
          if (!junctionInfo.existingFields.includes(altFieldName)) {
            const altFieldCreated = await createSortField(
              junctionInfo.collection,
              altFieldName
            );
            
            if (altFieldCreated) {
              created.push({ field: altFieldName, type: 'sort' });
              // Update options to use the alternative field
              options.sortField = altFieldName;
            }
          } else {
            errors.push(new Error(`Field conflict: Cannot use '${sortFieldName}' or '${altFieldName}' for sort`));
          }
        }
      }

      // Set default values for existing records if fields were created
      if (created.length > 0) {
        await setDefaultValues(junctionInfo.collection, options);
      }

      if (created.length > 0) {
        notifications.add({
          title: 'Layout Blocks Setup',
          text: `Created ${created.length} field${created.length > 1 ? 's' : ''}: ${created.map(f => f.field).join(', ')}`,
          type: 'success'
        });
      }

    } catch (error) {
      logger.error('Auto setup error:', error);
      errors.push(error as Error);
      
      notifications.add({
        title: 'Setup Error',
        text: error.message || 'Failed to setup required fields',
        type: 'error',
        persist: true
      });
    }

    return {
      created,
      errors,
      success: errors.length === 0
    };
  }

  async function createAreaField(
    collection: string,
    fieldName: string,
    defaultValue: string
  ): Promise<boolean> {
    try {
      await api.post(`/fields/${collection}`, {
        field: fieldName,
        type: 'string',
        meta: {
          interface: 'input',
          display: 'raw',
          hidden: true,
          readonly: false,
          sort: 1000
        },
        schema: {
          name: fieldName,
          table: collection,
          data_type: 'varchar',
          max_length: 64,
          default_value: defaultValue,
          is_nullable: false,
          is_unique: false
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to create area field '${fieldName}':`, error);
      if (error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
        // Field already exists, not an error
        return false;
      }
      throw error;
    }
  }

  async function createSortField(
    collection: string,
    fieldName: string
  ): Promise<boolean> {
    try {
      await api.post(`/fields/${collection}`, {
        field: fieldName,
        type: 'integer',
        meta: {
          interface: 'input',
          display: 'raw',
          hidden: true,
          readonly: false,
          sort: 1001
        },
        schema: {
          name: fieldName,
          table: collection,
          data_type: 'integer',
          default_value: 0,
          is_nullable: false,
          is_unique: false
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to create sort field '${fieldName}':`, error);
      if (error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
        // Field already exists, not an error
        return false;
      }
      throw error;
    }
  }

  async function checkFieldCompatibility(
    collection: string,
    fieldName: string,
    expectedType: string
  ): Promise<boolean> {
    try {
      const response = await api.get(`/fields/${collection}/${fieldName}`);
      const field = response.data.data;
      
      if (!field) return false;
      
      // Check if the field type is compatible
      const fieldType = field.type || field.schema?.data_type;
      
      if (expectedType === 'string') {
        return ['string', 'varchar', 'text'].includes(fieldType);
      } else if (expectedType === 'integer') {
        return ['integer', 'int', 'bigint', 'smallint'].includes(fieldType);
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to check field compatibility for ${fieldName}:`, error);
      return false;
    }
  }

  async function setDefaultValues(
    collection: string,
    options: LayoutBlocksOptions
  ): Promise<void> {
    try {
      const areaField = options.areaField || 'area';
      const sortField = options.sortField || 'sort';
      const defaultArea = options.defaultArea || 'main';

      // Update records with null area values
      await api.patch(`/items/${collection}`, {
        [areaField]: defaultArea
      }, {
        params: {
          filter: {
            [areaField]: {
              _null: true
            }
          }
        }
      });

      // Update records with null sort values
      // We'll set them based on their ID order
      const itemsWithNullSort = await api.get(`/items/${collection}`, {
        params: {
          filter: {
            [sortField]: {
              _null: true
            }
          },
          fields: ['id'],
          sort: ['id'],
          limit: -1
        }
      });

      if (itemsWithNullSort.data.data?.length > 0) {
        // Update each item with an incremental sort value
        const updates = itemsWithNullSort.data.data.map((item: any, index: number) => ({
          id: item.id,
          [sortField]: index
        }));

        // Batch update
        for (const update of updates) {
          await api.patch(`/items/${collection}/${update.id}`, {
            [sortField]: update[sortField]
          });
        }
      }
    } catch (error) {
      logger.error('Failed to set default values:', error);
      // Not critical, continue
    }
  }

  async function validateSetup(
    junctionInfo: JunctionInfo,
    options: LayoutBlocksOptions
  ): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const areaField = options.areaField || 'area';
    const sortField = options.sortField || 'sort';

    // Check if required fields exist
    if (!junctionInfo.existingFields.includes(areaField)) {
      issues.push(`Area field '${areaField}' not found`);
    }

    if (!junctionInfo.existingFields.includes(sortField)) {
      issues.push(`Sort field '${sortField}' not found`);
    }

    // Check field types
    if (junctionInfo.existingFields.includes(areaField)) {
      const isValidType = await checkFieldCompatibility(
        junctionInfo.collection,
        areaField,
        'string'
      );
      if (!isValidType) {
        issues.push(`Area field '${areaField}' is not a string type`);
      }
    }

    if (junctionInfo.existingFields.includes(sortField)) {
      const isValidType = await checkFieldCompatibility(
        junctionInfo.collection,
        sortField,
        'integer'
      );
      if (!isValidType) {
        issues.push(`Sort field '${sortField}' is not an integer type`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  return {
    ensureRequiredFields,
    createAreaField,
    createSortField,
    checkFieldCompatibility,
    setDefaultValues,
    validateSetup
  };
}