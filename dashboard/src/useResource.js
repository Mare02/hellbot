import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, data: null, loading: true, error: null });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [path, revision]);
  return state.key === key
    ? { data: state.data, loading: state.loading, error: state.error, refresh }
    : { data: null, loading: true, error: null, refresh };
}
