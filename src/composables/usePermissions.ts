import { logger } from '../utils/logger';
import { useApi } from '@directus/extensions-sdk';
import type { UserPermissions } from '../types';

export function usePermissions() {
  const api = useApi();

  async function checkPermissions(
    junctionCollection: string,
    parentCollection: string
  ): Promise<UserPermissions> {
    try {
      // Get current user's permissions
      const response = await api.get('/permissions/me');
      
      // Ensure permissions is an array
      let permissions = response.data.data || response.data || [];
      if (!Array.isArray(permissions)) {
        logger.warn('Permissions response is not an array:', permissions);
        permissions = [];
      }
      
      // If no permissions (might be admin), assume full access
      if (permissions.length === 0) {
        logger.log('No permissions found, assuming admin access');
        return {
          create: true,
          update: true,
          delete: true,
          reorder: true,
          manageAreas: true
        };
      }

      // Check junction table permissions
      const junctionPerms = getCollectionPermissions(permissions, junctionCollection);
      
      // Check parent collection permissions  
      const parentPerms = getCollectionPermissions(permissions, parentCollection);

      // Check field creation permissions
      const fieldPerms = getCollectionPermissions(permissions, 'directus_fields');

      // Combine permissions
      return {
        create: junctionPerms.create && parentPerms.update,
        update: junctionPerms.update && parentPerms.update,
        delete: junctionPerms.delete && parentPerms.update,
        reorder: junctionPerms.update && parentPerms.update,
        manageAreas: fieldPerms.create // Can create fields = can manage areas
      };
    } catch (error) {
      logger.error('Failed to check permissions:', error);
      
      // Default to restrictive permissions on error
      return {
        create: false,
        update: false,
        delete: false,
        reorder: false,
        manageAreas: false
      };
    }
  }

  function getCollectionPermissions(
    permissions: any[],
    collection: string
  ): Record<string, boolean> {
    // Ensure permissions is an array
    if (!Array.isArray(permissions)) {
      logger.warn('getCollectionPermissions: permissions is not an array', permissions);
      return {
        create: false,
        read: false,
        update: false,
        delete: false
      };
    }
    
    const collectionPerms = permissions.filter(p => p && p.collection === collection);
    
    return {
      create: collectionPerms.some(p => p.action === 'create'),
      read: collectionPerms.some(p => p.action === 'read'),
      update: collectionPerms.some(p => p.action === 'update'),
      delete: collectionPerms.some(p => p.action === 'delete')
    };
  }

  async function hasPermission(
    collection: string,
    action: string,
    field?: string
  ): Promise<boolean> {
    try {
      const response = await api.get('/permissions/me');
      let permissions = response.data.data || response.data || [];
      
      if (!Array.isArray(permissions)) {
        logger.warn('hasPermission: permissions is not an array', permissions);
        return false;
      }

      return permissions.some(p => {
        if (p.collection !== collection) return false;
        if (p.action !== action) return false;
        
        // If checking field-specific permission
        if (field && p.fields) {
          if (Array.isArray(p.fields)) {
            return p.fields.includes('*') || p.fields.includes(field);
          }
        }
        
        return true;
      });
    } catch (error) {
      logger.error('Failed to check permission:', error);
      return false;
    }
  }

  async function checkFieldPermissions(
    collection: string,
    fields: string[]
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    
    for (const field of fields) {
      result[field] = await hasPermission(collection, 'update', field);
    }
    
    return result;
  }

  return {
    checkPermissions,
    hasPermission,
    checkFieldPermissions,
    getCollectionPermissions
  };
}