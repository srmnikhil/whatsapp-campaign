import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useObjectUrl } from './useObjectUrl.js';

describe('useObjectUrl', () => {
  beforeEach(() => {
    let count = 0;
    URL.createObjectURL = vi.fn(() => `blob:${(count += 1)}`);
    URL.revokeObjectURL = vi.fn();
  });

  it('creates a URL per file and revokes the old one and the last on unmount', () => {
    const { result, unmount } = renderHook(() => useObjectUrl());
    expect(result.current[0]).toBe('');

    act(() => result.current[1](new File(['a'], 'a.png')));
    expect(result.current[0]).toBe('blob:1');

    act(() => result.current[1](new File(['b'], 'b.png')));
    expect(result.current[0]).toBe('blob:2');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');

    act(() => result.current[1](null));
    expect(result.current[0]).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2');

    act(() => result.current[1](new File(['c'], 'c.png')));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:3');
  });
});
