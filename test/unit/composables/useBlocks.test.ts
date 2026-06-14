import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, nextTick } from 'vue';

// First set up all mocks before importing the module that uses them
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
};

const mockStores = {
  useFieldsStore: () => ({
    getFieldsForCollection: vi.fn()
  }),
  usePermissionsStore: () => ({
    permissions: []
  }),
  useUserStore: () => ({
    currentUser: { id: 1, role: { id: 1 } }
  })
};

const mockM2AHelper = {
  loadM2AData: vi.fn().mockResolvedValue([])
};

// Mock the logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock Directus API
vi.mock('@directus/extensions-sdk', () => ({
  useApi: () => mockApi,
  useStores: () => mockStores
}));

// Mock M2AHelper
vi.mock('../../../src/utils/m2a-helper', () => ({
  M2AHelper: vi.fn().mockImplementation(() => mockM2AHelper)
}));

// Now import the module after mocks are set up
import { useBlocks } from '../../../src/composables/useBlocks';
import { M2AHelper } from '../../../src/utils/m2a-helper';
import { isTempId, isExistingLink } from '../../../src/utils/helpers';

describe('useBlocks Composable (global-save / state-based)', () => {
  let junctionInfo: any;
  let options: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // The vitest config enables mockReset/restoreMocks, which wipes mock
    // implementations before each test — re-establish the M2AHelper constructor
    // so `new M2AHelper()` keeps returning our stub.
    (M2AHelper as unknown as { mockImplementation: (fn: () => any) => void })
      .mockImplementation(() => mockM2AHelper);
    mockM2AHelper.loadM2AData.mockResolvedValue([]);

    junctionInfo = computed(() => ({
      collection: 'page_blocks',
      primaryKeyField: 'id',
      foreignKeyField: 'page_id',
      itemField: 'item',
      collectionField: 'collection',
      hasAreaField: true,
      hasSortField: true,
      allowedCollections: ['content_text', 'content_image']
    }));

    options = computed(() => ({
      areaField: 'area',
      sortField: 'sort'
    }));
  });

  function setup(primaryKeyValue: string | number = 1) {
    return useBlocks('pages', 'blocks', computed(() => primaryKeyValue), junctionInfo, options);
  }

  /**
   * Seed the composable's internal `blocks` via loadBlocks() + the mocked
   * M2AHelper, then await the flush so state is populated.
   */
  async function seed(blocks: any[]) {
    mockM2AHelper.loadM2AData.mockResolvedValue(blocks);
    const api = setup(1);
    await api.loadBlocks();
    await nextTick();
    return api;
  }

  const baseRecord = (over: Partial<any> = {}) => ({
    id: 10,
    area: 'main',
    sort: 0,
    collection: 'content_text',
    item: { id: 5, title: 'A' },
    ...over
  });

  describe('addBlock (staged, no API write)', () => {
    it('stages a new block with a temporary id and inline content', async () => {
      const { addBlock, blocks } = setup(1);

      await addBlock('main', 'content_text', { title: 'New' });

      expect(mockApi.post).not.toHaveBeenCalled();
      expect(blocks.value).toHaveLength(1);
      const block = blocks.value[0];
      expect(isTempId(block.id)).toBe(true);
      expect(block.area).toBe('main');
      expect(block.collection).toBe('content_text');
      expect(block.item).toEqual({ title: 'New' });
    });
  });

  describe('linkExistingItem (staged, read-only fetch)', () => {
    it('fetches the item read-only and stages an existing-link block', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: { id: 7, title: 'Linked' } } });
      const { linkExistingItem, blocks } = setup(1);

      await linkExistingItem('main', 'content_text', 7);

      expect(mockApi.post).not.toHaveBeenCalled();
      expect(mockApi.get).toHaveBeenCalledWith('/items/content_text/7');
      expect(blocks.value).toHaveLength(1);
      expect(isExistingLink(blocks.value[0].id)).toBe(true);
      expect(blocks.value[0].item).toEqual({ id: 7, title: 'Linked' });
    });
  });

  describe('duplicateExistingItem (staged, no API write)', () => {
    it('strips metadata and adds a (Copy) suffix without writing', async () => {
      const { duplicateExistingItem, blocks } = setup(1);
      const itemData = {
        id: 1,
        title: 'Original',
        content: 'body',
        user_created: 'u1',
        date_created: '2024-01-01'
      };

      await duplicateExistingItem('main', 'content_text', itemData);

      expect(mockApi.post).not.toHaveBeenCalled();
      expect(blocks.value).toHaveLength(1);
      const item = blocks.value[0].item;
      expect(item.title).toBe('Original (Copy)');
      expect(item.content).toBe('body');
      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('user_created');
      expect(item).not.toHaveProperty('date_created');
    });

    it.each(['title', 'name', 'headline', 'label', 'heading'])(
      'adds the (Copy) suffix to the %s field',
      async (field) => {
        const { duplicateExistingItem, blocks } = setup(1);
        await duplicateExistingItem('main', 'content_text', { id: 1, [field]: 'Test' });
        expect(blocks.value[0].item[field]).toBe('Test (Copy)');
      }
    );
  });

  describe('updateBlock / reorderBlocks / moveBlock (state only)', () => {
    it('updateBlock mutates area/sort and marks dirty', async () => {
      const { updateBlock, blocks } = await seed([baseRecord()]);
      await updateBlock(10, { area: 'sidebar', sort: 3 });
      expect(mockApi.patch).not.toHaveBeenCalled();
      expect(blocks.value[0].area).toBe('sidebar');
      expect(blocks.value[0].sort).toBe(3);
    });

    it('reorderBlocks assigns sequential integer sorts (fix #42)', async () => {
      const { reorderBlocks, blocks } = await seed([
        baseRecord({ id: 10, sort: 0 }),
        baseRecord({ id: 11, sort: 1, item: { id: 6, title: 'B' } })
      ]);
      await reorderBlocks('main', [11, 10]);
      expect(mockApi.patch).not.toHaveBeenCalled();
      expect(blocks.value.find(b => b.id === 11)!.sort).toBe(0);
      expect(blocks.value.find(b => b.id === 10)!.sort).toBe(1);
    });

    it('moveBlock changes the area and keeps integer sorts', async () => {
      const { moveBlock, blocks } = await seed([baseRecord({ id: 10, area: 'main', sort: 0 })]);
      await moveBlock(10, 'sidebar', 0);
      expect(mockApi.patch).not.toHaveBeenCalled();
      const moved = blocks.value.find(b => b.id === 10)!;
      expect(moved.area).toBe('sidebar');
      expect(Number.isInteger(moved.sort)).toBe(true);
    });
  });

  describe('unlinkBlock / deleteBlock', () => {
    it('unlinkBlock removes the block from state without an API call', async () => {
      const { unlinkBlock, blocks } = await seed([baseRecord()]);
      await unlinkBlock(10);
      expect(mockApi.delete).not.toHaveBeenCalled();
      expect(blocks.value).toHaveLength(0);
    });

    it('deleteBlock(deleteItem=true) deletes the content item immediately, junction deferred', async () => {
      mockApi.delete.mockResolvedValueOnce({});
      const { deleteBlock, blocks } = await seed([baseRecord()]);
      await deleteBlock(10, true);
      expect(mockApi.delete).toHaveBeenCalledWith('/items/content_text/5');
      expect(blocks.value).toHaveLength(0);
    });

    it('deleteBlock throws when the block is not found', async () => {
      const { deleteBlock } = setup(1);
      await expect(deleteBlock(999, true)).rejects.toThrow('Block not found');
    });
  });

  describe('loadBlocks', () => {
    it('skips loading for new (unsaved) items', async () => {
      const { loadBlocks, blocks } = setup('+');
      await loadBlocks();
      expect(blocks.value).toEqual([]);
    });
  });

  describe('prepareItemsForEmit (Directus M2A value shape)', () => {
    it('emits a bare id for a clean, persisted block', async () => {
      const { prepareItemsForEmit } = await seed([baseRecord()]);
      expect(prepareItemsForEmit()).toEqual([10]);
    });

    it('emits a full junction object (with nested item + area + sort) for a dirty block', async () => {
      const { prepareItemsForEmit, markBlockDirty } = await seed([baseRecord()]);
      markBlockDirty(10, true);
      const out = prepareItemsForEmit();
      expect(out[0]).toEqual({
        id: 10,
        collection: 'content_text',
        area: 'main',
        sort: 0,
        item: { id: 5, title: 'A' }
      });
    });

    it('emits a nested item WITHOUT id for a brand-new block', async () => {
      const { prepareItemsForEmit, addBlock } = await seed([]);
      await addBlock('main', 'content_text', { title: 'New' });
      const out = prepareItemsForEmit();
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({
        collection: 'content_text',
        area: 'main',
        item: { title: 'New' }
      });
      expect(out[0]).not.toHaveProperty('id');
      expect(out[0].item).not.toHaveProperty('id');
    });

    it('emits the bare item PK for a linked existing item (source not mutated)', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: { id: 7, title: 'Linked' } } });
      const { prepareItemsForEmit, linkExistingItem } = await seed([]);
      await linkExistingItem('main', 'content_text', 7);
      const out = prepareItemsForEmit();
      expect(out[0]).toMatchObject({ collection: 'content_text', area: 'main', item: 7 });
      expect(out[0]).not.toHaveProperty('id');
    });

    it('omits a deleted/unlinked block from the emitted value', async () => {
      const { prepareItemsForEmit, unlinkBlock } = await seed([baseRecord()]);
      await unlinkBlock(10);
      expect(prepareItemsForEmit()).toEqual([]);
    });

    it('emits integer sort values after a reorder (fix #42 guard)', async () => {
      const { prepareItemsForEmit, reorderBlocks } = await seed([
        baseRecord({ id: 10, sort: 0 }),
        baseRecord({ id: 11, sort: 1, item: { id: 6, title: 'B' } })
      ]);
      await reorderBlocks('main', [11, 10]);
      const out = prepareItemsForEmit() as any[];
      for (const entry of out) {
        expect(Number.isInteger(entry.sort)).toBe(true);
      }
    });
  });
});
