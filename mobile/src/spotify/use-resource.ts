import { useCallback, useEffect, useRef, useState } from 'react';
import { client } from './client';
import { nextPath } from './data';
import type { Page } from './types';

export function usePage<T>(path: string | null, revision = 0) {
  const [data, setData] = useState<T[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const paging = useRef(false);
  const current = useRef(path); current.current = path;
  useEffect(() => {
    const id = ++generation.current; let active = true;
    setData([]); setNext(null); setError(''); paging.current = false;
    if (!path) { setLoading(false); return; }
    setLoading(true);
    client.request<Page<T>>(path).then(page => { if (active && id === generation.current) { setData(page.items ?? []); setNext(page.next); } }).catch(e => { if (active && id === generation.current) setError(e.message); }).finally(() => { if (active && id === generation.current) setLoading(false); });
    return () => { active = false; generation.current++; };
  }, [path, revision, retry]);
  const loadMore = useCallback(async () => {
    if (!next || paging.current || loading || current.current !== path) return;
    const id = generation.current; paging.current = true; setLoading(true); setError('');
    try {
      const page = await client.request<Page<T>>(nextPath(next));
      if (id === generation.current) { setData(previous => [...previous, ...(page.items ?? [])]); setNext(page.next); }
    } catch (e) { if (id === generation.current) setError((e as Error).message); }
    finally { if (id === generation.current) { paging.current = false; setLoading(false); } }
  }, [next, loading, path]);
  return { data, next, loading, error, loadMore, retry: () => setRetry(n => n + 1) };
}
