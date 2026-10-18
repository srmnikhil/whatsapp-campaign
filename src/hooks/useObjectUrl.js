import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A blob: URL for a local file. The previous URL is revoked when the file changes,
 * and the last one on unmount.
 * @returns {[string, (file: File | null) => void]}
 */
export function useObjectUrl() {
  const [url, setUrl] = useState('');
  const urlRef = useRef('');

  const revoke = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
  }, []);

  useEffect(() => revoke, [revoke]);

  const setFile = useCallback(
    (file) => {
      revoke();
      if (file) urlRef.current = URL.createObjectURL(file);
      setUrl(urlRef.current);
    },
    [revoke],
  );

  return [url, setFile];
}
