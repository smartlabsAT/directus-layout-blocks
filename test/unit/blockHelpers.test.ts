import { describe, it, expect, afterEach } from 'vitest';
import { createDragImage } from '../../src/utils/blockHelpers';
import type { BlockItem } from '../../src/types';

function makeBlock(overrides: Partial<BlockItem> = {}): BlockItem {
  return {
    id: 7,
    collection: 'content_headline',
    item: { title: 'Welcome Hero' },
    area: 'main',
    sort: 1,
    ...overrides,
  } as BlockItem;
}

afterEach(() => {
  // createDragImage appends its element to document.body — clean up between tests.
  document.querySelectorAll('body > div').forEach(el => el.remove());
});

describe('createDragImage', () => {
  it('appends a floating preview element to the document body and returns it', () => {
    const el = createDragImage(makeBlock());
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.parentElement).toBe(document.body);
  });

  it('renders the block title, including the heading fallback', () => {
    const el = createDragImage(makeBlock({ item: { heading: 'Only Heading' } }));
    expect(el.textContent).toContain('Only Heading');
  });

  it('renders the collection label as the meta line', () => {
    const el = createDragImage(makeBlock());
    expect(el.textContent).toContain('Headline');
  });

  it('clones the provided source icon node into the preview', () => {
    const icon = document.createElement('span');
    icon.className = 'v-icon';
    icon.setAttribute('data-test-icon', '1');
    const el = createDragImage(makeBlock(), icon);
    const cloned = el.querySelector('[data-test-icon]');
    expect(cloned).not.toBeNull();
    // It must be a clone, not the original node (which stays in its own place).
    expect(cloned).not.toBe(icon);
  });

  it('omits the icon when no source element is given', () => {
    const el = createDragImage(makeBlock(), null);
    expect(el.querySelector('.v-icon')).toBeNull();
  });
});
