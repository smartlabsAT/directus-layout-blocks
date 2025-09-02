import { computed, type ComputedRef } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { logger } from '../utils/logger';

export interface PermissionChecks {
  canLinkItems: (collection: string) => boolean;
  canDuplicateItems: (collection: string) => boolean;
  canCreateItems: (collection: string) => boolean;
  canUpdateItems: (collection: string) => boolean;
  canDeleteItems: (collection: string) => boolean;
  canReorderItems: (collection: string) => boolean;
  hasAnyPermission: (collection: string) => boolean;
}

export interface ValidationRules {
  maxBlocksPerArea: number | null;
  maxTotalBlocks: number | null;
  allowCircularReferences: boolean;
  allowedCollections: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Composable for managing block permissions and validation
 */
export function useBlockPermissions(
  options?: ComputedRef<any>
): {
  permissions: PermissionChecks;
  validation: {
    validateAddBlock: (area: string, collection: string, currentBlockCount: number) => ValidationResult;
    validateLinkItem: (collection: string, itemId: string | number) => ValidationResult;
    validateDuplicateItem: (collection: string) => ValidationResult;
    validateMoveBlock: (fromArea: string, toArea: string, collection: string) => ValidationResult;
    validateDeleteBlock: (collection: string) => ValidationResult;
  };
  rules: ComputedRef<ValidationRules>;
} {
  const stores = useStores();
  const { usePermissionsStore, useUserStore } = stores;
  const permissionsStore = usePermissionsStore();
  const userStore = useUserStore();

  // Compute validation rules from options
  const rules = computed<ValidationRules>(() => ({
    maxBlocksPerArea: options?.value?.maxItemsPerArea || null,
    maxTotalBlocks: options?.value?.maxTotalBlocks || null,
    allowCircularReferences: options?.value?.allowCircularReferences !== false,
    allowedCollections: options?.value?.allowedCollections || []
  }));

  /**
   * Check if user has specific permission for a collection
   */
  function hasPermission(collection: string, action: string): boolean {
    try {
      const currentUser = userStore.currentUser;
      if (!currentUser) {
        logger.warn('No current user found');
        return false;
      }

      // Admin users have all permissions
      if (currentUser.role?.admin_access === true) {
        return true;
      }

      // Check permissions for the collection
      // Note: Directus permissions API may vary, this is a simplified check
      const permissions = permissionsStore.permissions || [];
      
      const hasPermission = permissions.some((permission: any) => {
        return (
          permission.collection === collection &&
          permission.action === action &&
          permission.role === currentUser.role?.id
        );
      });

      logger.debug(`Permission check for ${collection}.${action}: ${hasPermission}`);
      return hasPermission;
    } catch (error) {
      logger.error('Error checking permissions:', error);
      return false; // Fail securely - deny by default
    }
  }

  // Permission check functions
  const permissions: PermissionChecks = {
    canLinkItems: (collection: string) => {
      // Need read permission to link existing items
      return hasPermission(collection, 'read');
    },
    
    canDuplicateItems: (collection: string) => {
      // Need both read and create permissions to duplicate
      return hasPermission(collection, 'read') && hasPermission(collection, 'create');
    },
    
    canCreateItems: (collection: string) => {
      // Need create permission
      return hasPermission(collection, 'create');
    },
    
    canUpdateItems: (collection: string) => {
      // Need update permission
      return hasPermission(collection, 'update');
    },
    
    canDeleteItems: (collection: string) => {
      // Need delete permission
      return hasPermission(collection, 'delete');
    },
    
    canReorderItems: (collection: string) => {
      // Need update permission to reorder
      return hasPermission(collection, 'update');
    },
    
    hasAnyPermission: (collection: string) => {
      // Check if user has any permission for this collection
      return (
        hasPermission(collection, 'read') ||
        hasPermission(collection, 'create') ||
        hasPermission(collection, 'update') ||
        hasPermission(collection, 'delete')
      );
    }
  };

  // Validation functions
  const validation = {
    /**
     * Validate adding a new block
     */
    validateAddBlock: (area: string, collection: string, currentBlockCount: number): ValidationResult => {
      // Check if collection is allowed
      if (rules.value.allowedCollections.length > 0 && 
          !rules.value.allowedCollections.includes(collection)) {
        return {
          valid: false,
          error: `Collection "${collection}" is not allowed`
        };
      }

      // Check max blocks per area
      if (rules.value.maxBlocksPerArea !== null && 
          currentBlockCount >= rules.value.maxBlocksPerArea) {
        return {
          valid: false,
          error: `Maximum blocks (${rules.value.maxBlocksPerArea}) reached for this area`
        };
      }

      // Check permissions
      if (!permissions.canCreateItems(collection)) {
        return {
          valid: false,
          error: 'You do not have permission to create items in this collection'
        };
      }

      return { valid: true };
    },

    /**
     * Validate linking an existing item
     */
    validateLinkItem: (collection: string, _itemId: string | number): ValidationResult => {
      // Check if collection is allowed
      if (rules.value.allowedCollections.length > 0 && 
          !rules.value.allowedCollections.includes(collection)) {
        return {
          valid: false,
          error: `Collection "${collection}" is not allowed`
        };
      }

      // Check permissions
      if (!permissions.canLinkItems(collection)) {
        return {
          valid: false,
          error: 'You do not have permission to read items from this collection'
        };
      }

      // TODO: Check for circular references if needed
      if (!rules.value.allowCircularReferences) {
        // This would require checking if the item references back to the current item
        logger.debug('Circular reference check not implemented yet');
      }

      return { valid: true };
    },

    /**
     * Validate duplicating an item
     */
    validateDuplicateItem: (collection: string): ValidationResult => {
      // Check if collection is allowed
      if (rules.value.allowedCollections.length > 0 && 
          !rules.value.allowedCollections.includes(collection)) {
        return {
          valid: false,
          error: `Collection "${collection}" is not allowed`
        };
      }

      // Check permissions
      if (!permissions.canDuplicateItems(collection)) {
        return {
          valid: false,
          error: 'You do not have permission to duplicate items in this collection'
        };
      }

      return { valid: true };
    },

    /**
     * Validate moving a block between areas
     */
    validateMoveBlock: (fromArea: string, toArea: string, collection: string): ValidationResult => {
      // Check permissions
      if (!permissions.canUpdateItems(collection)) {
        return {
          valid: false,
          error: 'You do not have permission to move blocks'
        };
      }

      // Check if target area allows this collection type
      // This would require area-specific configuration
      
      return { valid: true };
    },

    /**
     * Validate deleting a block
     */
    validateDeleteBlock: (collection: string): ValidationResult => {
      // Check permissions
      if (!permissions.canDeleteItems(collection)) {
        return {
          valid: false,
          error: 'You do not have permission to delete blocks'
        };
      }

      return { valid: true };
    }
  };

  return {
    permissions,
    validation,
    rules
  };
}