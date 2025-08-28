import { logger } from './utils/logger';
import InterfaceComponent from './interface.vue';
import { defineInterface } from '@directus/extensions-sdk';

logger.log('Layout Blocks Interface: Loading extension');

export default defineInterface({
  id: 'layout-blocks',
  name: 'Layout Blocks',
  icon: 'dashboard_customize',
  description: 'Universal visual layout for M2A relations with drag & drop support',
  component: InterfaceComponent,
  types: ['alias'],
  localTypes: ['m2a'],
  group: 'relational',
  relational: true,
  options: ({ relations, field }: any) => {
    logger.log('🔍 === LAYOUT BLOCKS OPTIONS START ===');
    logger.log('🔍 Raw relations:', relations);
    logger.log('🔍 Raw field:', field);
    
    // Convert refs to plain objects
    const rels = relations?.value || relations || {};
    const fieldMeta = field?.value || field || {};
    const fieldName = fieldMeta?.field;
    
    logger.log('🔍 Unwrapped relations:', rels);
    logger.log('🔍 Unwrapped field:', fieldMeta);
    logger.log('🔍 Field name:', fieldName);
    
    // Debug the structure of relations
    if (rels) {
      logger.log('🔍 Relations keys:', Object.keys(rels));
      if (rels.m2o) {
        logger.log('🔍 rels.m2o:', rels.m2o);
        logger.log('🔍 rels.m2o.meta:', rels.m2o.meta);
      }
      if (rels.o2m && fieldName) {
        logger.log('🔍 rels.o2m:', rels.o2m);
        logger.log('🔍 rels.o2m[fieldName]:', rels.o2m[fieldName]);
        if (rels.o2m[fieldName]) {
          logger.log('🔍 rels.o2m[fieldName].meta:', rels.o2m[fieldName].meta);
        }
      }
    }
    
    // Get M2A allowed collections - they are stored in m2o.meta
    let allowedCollections: string[] = [];
    
    // Check in m2o.meta for one_allowed_collections
    if (rels?.m2o?.meta?.one_allowed_collections) {
      allowedCollections = rels.m2o.meta.one_allowed_collections;
      logger.log('🔍 Found allowed collections in m2o.meta:', allowedCollections);
    }
    
    // Debug: Log full m2o.meta structure to understand it better
    if (rels?.m2o?.meta) {
      logger.log('🔍 Full m2o.meta structure:', JSON.stringify(rels.m2o.meta, null, 2));
    }
    
    logger.log('🔍 Final allowed collections:', allowedCollections);
    
    // Format allowed collections for use in the interface
    const allowedChoices = Array.isArray(allowedCollections) && allowedCollections.length > 0
      ? allowedCollections.map((collectionName: string) => ({
          text: collectionName
            .split('_')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' '),
          value: collectionName
        }))
      : [];
    
    logger.log('🔍 Allowed choices:', allowedChoices);
    logger.log('🔍 === LAYOUT BLOCKS OPTIONS END ===');
    
    return [
    {
      field: 'areaField',
      name: 'Area Field Name',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        options: {
          placeholder: 'area',
          font: 'monospace'
        },
        note: 'Field name for storing the area identifier'
      },
      schema: {
        default_value: 'area'
      }
    },
    {
      field: 'sortField',
      name: 'Sort Field Name',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        options: {
          placeholder: 'sort',
          font: 'monospace'
        },
        note: 'Field name for storing the sort order'
      },
      schema: {
        default_value: 'sort'
      }
    },
    {
      field: 'areas',
      name: 'Layout Areas',
      type: 'json',
      meta: {
        width: 'full',
        interface: 'list',
        options: {
          fields: [
            {
              field: 'id',
              name: 'ID',
              type: 'string',
              meta: {
                width: 'half',
                interface: 'input',
                options: {
                  font: 'monospace',
                  placeholder: 'main'
                }
              }
            },
            {
              field: 'label',
              name: 'Label',
              type: 'string',
              meta: {
                width: 'half',
                interface: 'input',
                options: {
                  placeholder: 'Main Content'
                }
              }
            },
            {
              field: 'icon',
              name: 'Icon',
              type: 'string',
              meta: {
                width: 'half',
                interface: 'select-icon'
              }
            },
            {
              field: 'color',
              name: 'Color',
              type: 'string',
              meta: {
                width: 'half',
                interface: 'select-color'
              }
            },
            {
              field: 'maxItems',
              name: 'Max Items',
              type: 'integer',
              meta: {
                width: 'half',
                interface: 'input',
                options: {
                  min: 0
                }
              }
            },
            {
              field: 'allowedTypes',
              name: 'Allowed Collections',
              type: 'json',
              meta: {
                width: 'half',
                interface: 'tags',
                options: {
                  placeholder: 'All collections allowed'
                }
              }
            },
            {
              field: 'width',
              name: 'Width (%)',
              type: 'integer',
              meta: {
                width: 'half',
                interface: 'input',
                options: {
                  min: 10,
                  max: 100,
                  placeholder: '100'
                },
                note: 'Width in percent (e.g., 50 for half width)'
              },
              schema: {
                default_value: 100
              }
            }
          ],
          template: '{{label}} ({{id}})'
        },
        note: 'Define the available layout areas'
      },
      schema: {
        default_value: JSON.stringify([
          {
            id: 'main',
            label: 'Main Content',
            icon: 'inbox',
            width: 100
          }
        ])
      }
    },
    {
      field: 'defaultArea',
      name: 'Default Area',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        options: {
          placeholder: 'main'
        },
        note: 'Default area for new blocks'
      },
      schema: {
        default_value: 'main'
      }
    },
    {
      field: 'viewMode',
      name: 'Default View Mode',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Grid View', value: 'grid' },
            { text: 'List View', value: 'list' }
          ]
        }
      },
      schema: {
        default_value: 'grid'
      }
    },
    {
      field: 'enableDragDrop',
      name: 'Enable Drag & Drop',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        options: {
          label: 'Allow blocks to be reordered via drag & drop'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'showEmptyAreas',
      name: 'Show Empty Areas',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        options: {
          label: 'Display areas that have no blocks'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'compactMode',
      name: 'Compact Mode',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        options: {
          label: 'Use compact layout for smaller screens'
        }
      },
      schema: {
        default_value: false
      }
    },
    {
      field: 'enableAreaManagement',
      name: 'Enable Area Management',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        options: {
          label: 'Allow users to create custom areas'
        }
      },
      schema: {
        default_value: false
      }
    },
    {
      field: 'deleteItems',
      name: 'Delete Related Items',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        options: {
          label: 'Delete the actual items when removing blocks'
        },
        note: 'If disabled, only the relation is removed'
      },
      schema: {
        default_value: false
      }
    },
    {
      field: 'autoSetup',
      name: 'Auto Setup Fields',
      type: 'boolean',
      meta: {
        width: 'half',
        interface: 'boolean',
        options: {
          label: 'Automatically create area and sort fields'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'allowedCollections',
      name: 'Allowed Collections',
      type: 'json',
      meta: {
        width: 'full',
        interface: allowedChoices.length > 0 ? 'select-multiple-checkbox' : 'tags',
        options: allowedChoices.length > 0 
          ? {
              choices: allowedChoices
            }
          : {
              placeholder: 'Enter collection names (e.g. content_text, content_image)',
              allowCustom: true,
              iconRight: 'info',
              presets: [
                { text: 'Content Text', value: 'content_text' },
                { text: 'Content Image', value: 'content_image' },
                { text: 'Content Hero', value: 'content_hero' },
                { text: 'Content CTA', value: 'content_cta' },
                { text: 'Content Video', value: 'content_video' },
                { text: 'Content Accordion', value: 'content_accordion' }
              ]
            },
        note: allowedChoices.length === 0 
          ? '⚠️ No collections configured in the M2A relation. Configure allowed collections in the M2A field first, or enter them manually here.' 
          : 'Select which collections to allow as blocks. Leave empty to use all M2A allowed collections.'
      }
    },
    {
      field: 'maxItemsPerArea',
      name: 'Max Items Per Area',
      type: 'integer',
      meta: {
        width: 'half',
        interface: 'input',
        options: {
          min: 0,
          placeholder: 'Unlimited'
        },
        note: 'Global limit for all areas (can be overridden per area)'
      }
    }
  ];
  }
});