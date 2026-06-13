import { describe, it, expect } from 'vitest';
import { normalizeAreaIds } from '../../src/utils/helpers';

describe('normalizeAreaIds', () => {
  it('leaves areas that already have an id unchanged', () => {
    const areas = [{ id: 'main', label: 'Main' }, { id: 'footer', label: 'Footer' }];
    const result = normalizeAreaIds(areas);
    expect(result.map(a => a.id)).toEqual(['main', 'footer']);
    // Identity is preserved when nothing changes (avoids needless re-renders).
    expect(result[0]).toBe(areas[0]);
  });

  it('defaults a single area without an id to the default area id', () => {
    const result = normalizeAreaIds([{ width: 100 } as any]);
    expect(result[0].id).toBe('main');
  });

  it('respects a custom default area id', () => {
    const result = normalizeAreaIds([{ width: 100 } as any], 'content');
    expect(result[0].id).toBe('content');
  });

  it('derives an id from the label when present', () => {
    const result = normalizeAreaIds([{ label: 'Right Sidebar' } as any]);
    expect(result[0].id).toBe('right-sidebar');
  });

  it('falls back to an indexed id for additional unlabeled areas', () => {
    const result = normalizeAreaIds([{ width: 100 } as any, { width: 50 } as any]);
    expect(result.map(a => a.id)).toEqual(['main', 'area-2']);
  });

  it('guarantees unique ids when labels collide', () => {
    const result = normalizeAreaIds([{ label: 'Main' } as any, { label: 'Main' } as any]);
    expect(result.map(a => a.id)).toEqual(['main', 'main-2']);
  });
});
