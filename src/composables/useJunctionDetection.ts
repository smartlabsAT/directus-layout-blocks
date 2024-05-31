import { useApi } from '@directus/extensions-sdk';
import type { JunctionInfo } from '../types';

export function useJunctionDetection() {
  const api = useApi();

  async function detectJunctionStructure(
    collection: string,
    field: string
  ): Promise<JunctionInfo> {
    try {
      console.log(`🔍 Detecting junction structure for ${collection}.${field}`);
      
      // 1. First check if the field exists and is a M2A type
      const fieldResponse = await api.get(`/fields/${collection}/${field}`);
      const fieldData = fieldResponse.data.data;
      
      if (!fieldData) {
        throw new Error(`Field ${collection}.${field} does not exist`);
      }
      
      if (fieldData.type !== 'alias' || !fieldData.meta?.special?.includes('m2a')) {
        throw new Error(`Field ${collection}.${field} is not a M2A relation field. Type: ${fieldData.type}, Special: ${fieldData.meta?.special}`);
      }
      
      // 2. For M2A fields, we need to look at the field metadata directly
      // M2A fields store their junction info in the field metadata, not in relations
      console.log('Getting field metadata for M2A junction info...');
      
      // Get the field's metadata which contains junction info for M2A
      const fieldMeta = fieldData.meta;
      console.log('Field metadata:', {
        interface: fieldMeta?.interface,
        special: fieldMeta?.special,
        junction_collection: fieldMeta?.junction_collection,
        one_allowed_collections: fieldMeta?.one_allowed_collections,
        options: fieldMeta?.options,
        display_options: fieldMeta?.display_options
      });
      
      // Check if junction collection exists in field metadata
      let junctionCollection = fieldMeta?.junction_collection;
      let oneCollectionField = fieldMeta?.one_collection_field || 'collection';
      let oneAllowedCollections = fieldMeta?.one_allowed_collections || [];
      
      // IMPORTANT: For M2A fields configured through the UI, allowed collections
      // are stored in the relation metadata, not the field metadata.
      // We need to fetch the relation that connects to the junction table.
      
      // If not in field metadata, try to get it from relations
      if (!junctionCollection || oneAllowedCollections.length === 0) {
        console.log('Getting relations to find junction collection and allowed collections...');
        
        // Get all relations for this field
        const relationsResponse = await api.get('/relations', {
          params: {
            filter: {
              _or: [
                {
                  _and: [
                    { collection: { _eq: collection } },
                    { field: { _eq: field } }
                  ]
                },
                {
                  _and: [
                    { related_collection: { _eq: collection } },
                    { 'meta.one_field': { _eq: field } }
                  ]
                }
              ]
            }
          }
        });
        
        const relations = relationsResponse.data.data;
        console.log(`Found ${relations.length} relations for field`);
        
        // First, try to find the M2A relation directly
        const directM2aRelation = relations.find((r: any) => 
          r.collection === collection && 
          r.field === field &&
          r.meta?.special?.includes('m2a')
        );
        
        if (directM2aRelation) {
          console.log('Found direct M2A relation:', directM2aRelation);
          
          // Get junction collection from relation
          if (!junctionCollection && directM2aRelation.related_collection) {
            junctionCollection = directM2aRelation.related_collection;
          }
          
          // Get allowed collections from relation metadata
          if (directM2aRelation.meta?.one_allowed_collections) {
            // Handle both string and array formats
            if (typeof directM2aRelation.meta.one_allowed_collections === 'string') {
              oneAllowedCollections = directM2aRelation.meta.one_allowed_collections
                .split(',')
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0);
            } else if (Array.isArray(directM2aRelation.meta.one_allowed_collections)) {
              oneAllowedCollections = directM2aRelation.meta.one_allowed_collections;
            }
            console.log('Found allowed collections from M2A relation:', oneAllowedCollections);
          }
        }
        
        // For M2A, we need to find the relation that connects our field to the junction table
        // This relation has the junction table as 'related_collection' and our field as 'meta.one_field'
        const junctionRelation = relations.find((rel: any) => {
          // Check if this relation's one_field matches our field
          return rel.meta?.one_field === field && rel.collection === collection;
        });
        
        // If not found, try alternative approach - look for junction relations
        if (!junctionRelation) {
          console.log('Primary approach failed, trying alternative...');
          // Sometimes the relation is stored differently
          const altRelation = relations.find((rel: any) => {
            return rel.field === field && rel.meta?.special?.includes('m2a');
          });
          
          if (altRelation) {
            console.log('Found alternative relation:', altRelation);
            junctionCollection = altRelation.meta?.junction_collection || altRelation.related_collection;
            oneCollectionField = altRelation.meta?.one_collection_field || 'collection';
            oneAllowedCollections = altRelation.meta?.one_allowed_collections || [];
          }
        }
        
        if (junctionRelation) {
          console.log('Found junction relation:', junctionRelation);
          junctionCollection = junctionRelation.collection; // This is the junction collection
          oneCollectionField = junctionRelation.meta?.one_collection_field || 'collection';
          oneAllowedCollections = junctionRelation.meta?.one_allowed_collections || [];
          
          // Store junction info from the relation
          console.log('Storing junction info from relation');
          
          // If no allowed collections in the relation, we need to find them elsewhere
          if (oneAllowedCollections.length === 0) {
            console.log('No allowed collections in junction relation, checking for O2M relation to junction...');
            
            // For M2A relations created through the UI, there's an O2M relation from
            // the parent collection to the junction table
            const o2mRelation = relations.find((rel: any) => {
              return rel.collection === collection && 
                     rel.field === field && 
                     rel.related_collection === junctionCollection;
            });
            
            if (o2mRelation) {
              console.log('Found O2M relation to junction:', o2mRelation);
              // The allowed collections might be in this relation's metadata
              oneAllowedCollections = o2mRelation.meta?.one_allowed_collections || [];
            }
            
            // Still no collections? Check the junction table's relations
            if (oneAllowedCollections.length === 0 && junctionCollection) {
              console.log('Checking junction table relations...');
              const junctionRelationsResp = await api.get('/relations', {
                params: {
                  filter: {
                    collection: { _eq: junctionCollection }
                  }
                }
              });
              
              const junctionRels = junctionRelationsResp.data.data || [];
              // Find the M2A relation in the junction table
              const m2aRel = junctionRels.find((r: any) => 
                r.meta?.special?.includes('m2a') && r.field === 'item'
              );
              
              if (m2aRel?.meta?.one_allowed_collections) {
                oneAllowedCollections = m2aRel.meta.one_allowed_collections;
                console.log('Found allowed collections in junction M2A relation:', oneAllowedCollections);
              }
            }
          }
          
          // Double check this is actually a junction table
          const junctionFieldsCheck = await api.get(`/fields/${junctionCollection}`);
          const junctionFields = junctionFieldsCheck.data.data || [];
          const hasM2AFields = junctionFields.some((f: any) => 
            f.field === 'item' || f.field === 'collection'
          );
          
          if (!hasM2AFields) {
            console.log('Found relation does not appear to be a M2A junction table');
            junctionCollection = null;
          } else {
            // If still no allowed collections, try to get them from the junction's collection field
            if (oneAllowedCollections.length === 0) {
              const collectionField = junctionFields.find((f: any) => f.field === 'collection');
              if (collectionField?.meta?.special?.includes('m2a-collection')) {
                // Get allowed values from the collection field
                const allowedValues = collectionField.schema?.allowed_values || 
                                    collectionField.meta?.options?.choices ||
                                    [];
                console.log('Collection field allowed values:', allowedValues);
                
                if (Array.isArray(allowedValues) && allowedValues.length > 0) {
                  oneAllowedCollections = allowedValues;
                }
              }
            }
          }
        }
        
        // Alternative: Look for collections that might be junction tables based on naming
        if (!junctionCollection) {
          console.log('Trying to find junction by naming convention...');
          const possibleJunctionName = `${collection}_${field}`;
          const altJunctionName = `${collection.replace(/_/g, '')}_${field}`;
          
          // Check if such a collection exists
          try {
            const collectionsResp = await api.get('/collections');
            const allCollections = collectionsResp.data.data || [];
            const foundCollection = allCollections.find((c: any) => 
              c.collection === possibleJunctionName || 
              c.collection === altJunctionName ||
              c.collection.includes(collection) && c.collection.includes(field)
            );
            
            if (foundCollection) {
              console.log('Found possible junction collection by naming:', foundCollection.collection);
              junctionCollection = foundCollection.collection;
            }
          } catch (e) {
            console.error('Error checking collections:', e);
          }
        }
      }
      
      if (!junctionCollection) {
        // Debug: Let's see all relations to understand the structure
        console.log('DEBUG: Could not find junction collection. Dumping all relations...');
        const allRelationsResp = await api.get('/relations');
        const allRelations = allRelationsResp.data.data || [];
        const relevantRelations = allRelations.filter((r: any) => 
          r.collection === collection || 
          r.related_collection === collection ||
          r.field === field ||
          r.meta?.one_field === field
        );
        console.log('Relevant relations:', relevantRelations);
        
        throw new Error(
          `The M2A field "${field}" is not properly configured. ` +
          `It appears you tried to use Layout Blocks on a field without first creating a proper M2A relationship.\n\n` +
          `To fix this:\n` +
          `1. Delete this field\n` +
          `2. Create a new field with type "Many to Any (M2A)"\n` +
          `3. Select the collections you want to relate\n` +
          `4. THEN choose "Layout Blocks" as the interface for that M2A field`
        );
      }
      
      // Junction collection found!
      console.log(`Found junction collection: ${junctionCollection}`);
      
      // Final attempt to get allowed collections if still empty
      if (oneAllowedCollections.length === 0) {
        console.log('Still no allowed collections, checking junction relations...');
        
        // Get all relations FROM the junction table
        const junctionRelationsResp = await api.get('/relations', {
          params: {
            filter: {
              collection: {
                _eq: junctionCollection
              }
            }
          }
        });
        
        const junctionRelations = junctionRelationsResp.data.data || [];
        console.log('All junction relations:', junctionRelations);
        
        // Look for the M2A item relation - it should have special: ['m2a']
        const itemRelation = junctionRelations.find((r: any) => 
          r.field === 'item' && r.meta?.special?.includes('m2a')
        );
        
        console.log('Found item relation:', itemRelation);
        
        if (itemRelation?.meta?.one_allowed_collections) {
          oneAllowedCollections = itemRelation.meta.one_allowed_collections;
          console.log('Found allowed collections from item relation:', oneAllowedCollections);
        } else if (itemRelation) {
          // Sometimes the allowed collections are in a different format
          console.log('Item relation meta:', itemRelation.meta);
        }
      }
      
      // Get junction collection fields
      const fieldsResponse = await api.get(`/fields/${junctionCollection}`);
      const fields = fieldsResponse.data.data || [];
      const fieldNames = fields.map((f: any) => f.field);
      
      console.log('Junction collection fields:', fields.map((f: any) => ({
        field: f.field,
        type: f.type,
        special: f.meta?.special
      })));
      
      // Final attempt: Check the collection field in the junction table
      if (oneAllowedCollections.length === 0) {
        console.log('Checking collection field in junction table...');
        const collectionField = fields.find((f: any) => f.field === 'collection');
        
        if (collectionField) {
          console.log('Collection field full details:', {
            field: collectionField.field,
            type: collectionField.type,
            schema: collectionField.schema,
            meta: collectionField.meta
          });
          
          // Check if there are enum values (allowed values)
          if (collectionField.schema?.enum) {
            oneAllowedCollections = collectionField.schema.enum;
            console.log('Found allowed collections from collection field enum:', oneAllowedCollections);
          }
          // Check in meta options
          else if (collectionField.meta?.options?.choices) {
            oneAllowedCollections = collectionField.meta.options.choices.map((c: any) => 
              typeof c === 'string' ? c : c.value
            );
            console.log('Found allowed collections from collection field choices:', oneAllowedCollections);
          }
          // Check if it's stored as a string constraint in the database
          else if (collectionField.schema?.is_nullable === false && collectionField.schema?.foreign_key_table) {
            // This might be a foreign key constraint
            console.log('Collection field appears to have FK constraint:', collectionField.schema.foreign_key_table);
          }
        }
      }
      
      // Find the foreign key field - this points back to the parent record
      const foreignKeyField = fieldMeta?.junction_field || fieldNames.find((f: string) => 
        f === `${collection}_id` || 
        f === `${collection.slice(0, -1)}_id` ||
        (f.endsWith('_id') && f !== 'id' && f !== 'item')
      ) || `${collection}_id`;
      
      const result = {
        collection: junctionCollection,
        primaryKeyField: 'id',
        foreignKeyField,
        itemField: 'item',
        collectionField: oneCollectionField,
        existingFields: fieldNames,
        hasAreaField: fieldNames.includes('area'),
        hasSortField: fieldNames.includes('sort'),
        hasCustomFields: fieldNames.length > 4,
        allowedCollections: oneAllowedCollections.length > 0 ? oneAllowedCollections : []
      };
      
      console.log('🎯 Junction detection complete:', {
        collection: result.collection,
        foreignKeyField: result.foreignKeyField,
        allowedCollections: result.allowedCollections,
        allowedCollectionsCount: result.allowedCollections.length
      });
      
      return result;
    } catch (error) {
      console.error('Junction detection error:', error);
      throw new Error(`Failed to detect junction structure: ${error.message}`);
    }
  }

  async function getJunctionFields(junctionCollection: string): Promise<any[]> {
    try {
      const response = await api.get(`/fields/${junctionCollection}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get junction fields:', error);
      return [];
    }
  }

  async function getFieldInfo(collection: string, field: string): Promise<any> {
    try {
      const response = await api.get(`/fields/${collection}/${field}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to get field info for ${collection}.${field}:`, error);
      return null;
    }
  }

  async function analyzeExistingData(junctionCollection: string): Promise<{
    totalCount: number;
    hasAreaValues: boolean;
    hasSortValues: boolean;
    uniqueAreas: string[];
  }> {
    try {
      // Get a sample of existing data
      const response = await api.get(`/items/${junctionCollection}`, {
        params: {
          limit: 100,
          fields: ['area', 'sort'],
          meta: 'total_count'
        }
      });

      const items = response.data.data || [];
      const totalCount = response.data.meta?.total_count || 0;

      // Analyze the data
      const hasAreaValues = items.some((item: any) => item.area != null);
      const hasSortValues = items.some((item: any) => item.sort != null);
      
      const uniqueAreas = [...new Set(
        items
          .map((item: any) => item.area)
          .filter((area: any) => area != null)
      )] as string[];

      return {
        totalCount,
        hasAreaValues,
        hasSortValues,
        uniqueAreas
      };
    } catch (error) {
      console.error('Failed to analyze existing data:', error);
      return {
        totalCount: 0,
        hasAreaValues: false,
        hasSortValues: false,
        uniqueAreas: []
      };
    }
  }

  async function checkFieldType(
    collection: string, 
    fieldName: string, 
    expectedType: string
  ): Promise<boolean> {
    const fieldInfo = await getFieldInfo(collection, fieldName);
    if (!fieldInfo) return false;

    return fieldInfo.type === expectedType || 
           fieldInfo.schema?.data_type === expectedType;
  }

  return {
    detectJunctionStructure,
    getJunctionFields,
    getFieldInfo,
    analyzeExistingData,
    checkFieldType
  };
}