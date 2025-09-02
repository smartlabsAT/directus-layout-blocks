import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';
import { useBlockPermissions } from '../../../src/composables/useBlockPermissions';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock Directus stores
vi.mock('@directus/extensions-sdk', () => ({
  useStores: () => ({
    usePermissionsStore: () => mockPermissionsStore,
    useUserStore: () => mockUserStore
  })
}));

let mockPermissionsStore: any;
let mockUserStore: any;

describe('useBlockPermissions Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock stores
    mockPermissionsStore = {
      permissions: []
    };
    
    mockUserStore = {
      currentUser: {
        id: 1,
        role: {
          id: 1,
          admin_access: false
        }
      }
    };
  });

  describe('Permission Checks', () => {
    it('should grant all permissions to admin users', () => {
      mockUserStore.currentUser.role.admin_access = true;
      
      const { permissions } = useBlockPermissions();
      
      expect(permissions.canCreateItems('content_text')).toBe(true);
      expect(permissions.canLinkItems('content_text')).toBe(true);
      expect(permissions.canDuplicateItems('content_text')).toBe(true);
      expect(permissions.canUpdateItems('content_text')).toBe(true);
      expect(permissions.canDeleteItems('content_text')).toBe(true);
    });

    it('should check specific permissions for non-admin users', () => {
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'read', role: 1 },
        { collection: 'content_text', action: 'create', role: 1 },
        { collection: 'content_image', action: 'read', role: 1 }
      ];
      
      const { permissions } = useBlockPermissions();
      
      // content_text has read and create
      expect(permissions.canLinkItems('content_text')).toBe(true);
      expect(permissions.canCreateItems('content_text')).toBe(true);
      expect(permissions.canDuplicateItems('content_text')).toBe(true); // needs both
      expect(permissions.canUpdateItems('content_text')).toBe(false);
      expect(permissions.canDeleteItems('content_text')).toBe(false);
      
      // content_image only has read
      expect(permissions.canLinkItems('content_image')).toBe(true);
      expect(permissions.canCreateItems('content_image')).toBe(false);
      expect(permissions.canDuplicateItems('content_image')).toBe(false);
    });

    it('should deny all permissions when user is not found', () => {
      mockUserStore.currentUser = null;
      
      const { permissions } = useBlockPermissions();
      
      expect(permissions.canCreateItems('content_text')).toBe(false);
      expect(permissions.canLinkItems('content_text')).toBe(false);
      expect(permissions.canDuplicateItems('content_text')).toBe(false);
    });

    it('should handle permission check errors gracefully', () => {
      // Force an error by making role undefined
      mockUserStore.currentUser.role = undefined;
      
      const { permissions } = useBlockPermissions();
      
      // Should fail securely (deny by default)
      expect(permissions.canCreateItems('content_text')).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should validate adding blocks with max limit', () => {
      const options = computed(() => ({
        maxItemsPerArea: 5,
        allowedCollections: ['content_text', 'content_image']
      }));
      
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'create', role: 1 }
      ];
      
      const { validation } = useBlockPermissions(options);
      
      // Should allow when under limit
      let result = validation.validateAddBlock('main', 'content_text', 3);
      expect(result.valid).toBe(true);
      
      // Should deny when at limit
      result = validation.validateAddBlock('main', 'content_text', 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum blocks (5) reached');
    });

    it('should validate allowed collections', () => {
      const options = computed(() => ({
        allowedCollections: ['content_text']
      }));
      
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'create', role: 1 },
        { collection: 'content_image', action: 'create', role: 1 }
      ];
      
      const { validation } = useBlockPermissions(options);
      
      // Should allow listed collection
      let result = validation.validateAddBlock('main', 'content_text', 0);
      expect(result.valid).toBe(true);
      
      // Should deny unlisted collection even with permission
      result = validation.validateAddBlock('main', 'content_image', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Collection "content_image" is not allowed');
    });

    it('should validate link permissions', () => {
      const options = computed(() => ({
        allowedCollections: ['content_text']
      }));
      
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'read', role: 1 }
      ];
      
      const { validation } = useBlockPermissions(options);
      
      const result = validation.validateLinkItem('content_text', 1);
      expect(result.valid).toBe(true);
    });

    it('should validate duplicate permissions', () => {
      const options = computed(() => ({
        allowedCollections: ['content_text']
      }));
      
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'read', role: 1 },
        { collection: 'content_text', action: 'create', role: 1 }
      ];
      
      const { validation } = useBlockPermissions(options);
      
      const result = validation.validateDuplicateItem('content_text');
      expect(result.valid).toBe(true);
    });

    it('should deny duplicate without both permissions', () => {
      const options = computed(() => ({
        allowedCollections: ['content_text']
      }));
      
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'read', role: 1 }
        // Missing create permission
      ];
      
      const { validation } = useBlockPermissions(options);
      
      const result = validation.validateDuplicateItem('content_text');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('do not have permission to duplicate');
    });

    it('should validate move permissions', () => {
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'update', role: 1 }
      ];
      
      const { validation } = useBlockPermissions();
      
      let result = validation.validateMoveBlock('main', 'sidebar', 'content_text');
      expect(result.valid).toBe(true);
      
      // Without update permission
      result = validation.validateMoveBlock('main', 'sidebar', 'content_image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('do not have permission to move');
    });

    it('should validate delete permissions', () => {
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'delete', role: 1 }
      ];
      
      const { validation } = useBlockPermissions();
      
      let result = validation.validateDeleteBlock('content_text');
      expect(result.valid).toBe(true);
      
      // Without delete permission
      result = validation.validateDeleteBlock('content_image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('do not have permission to delete');
    });
  });

  describe('Computed Rules', () => {
    it('should compute validation rules from options', () => {
      const options = computed(() => ({
        maxItemsPerArea: 10,
        maxTotalBlocks: 50,
        allowCircularReferences: false,
        allowedCollections: ['content_text', 'content_image']
      }));
      
      const { rules } = useBlockPermissions(options);
      
      expect(rules.value.maxBlocksPerArea).toBe(10);
      expect(rules.value.maxTotalBlocks).toBe(50);
      expect(rules.value.allowCircularReferences).toBe(false);
      expect(rules.value.allowedCollections).toEqual(['content_text', 'content_image']);
    });

    it('should use default values when options are not provided', () => {
      const { rules } = useBlockPermissions();
      
      expect(rules.value.maxBlocksPerArea).toBe(null);
      expect(rules.value.maxTotalBlocks).toBe(null);
      expect(rules.value.allowCircularReferences).toBe(true);
      expect(rules.value.allowedCollections).toEqual([]);
    });
  });

  describe('hasAnyPermission', () => {
    it('should check if user has any permission for a collection', () => {
      mockPermissionsStore.permissions = [
        { collection: 'content_text', action: 'read', role: 1 },
        { collection: 'content_image', action: 'update', role: 1 }
      ];
      
      const { permissions } = useBlockPermissions();
      
      expect(permissions.hasAnyPermission('content_text')).toBe(true);
      expect(permissions.hasAnyPermission('content_image')).toBe(true);
      expect(permissions.hasAnyPermission('content_video')).toBe(false);
    });
  });
});