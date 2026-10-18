import { useCallback, useEffect, useRef, useState } from 'react';
import { ASYNC_STATUS } from '../constants/asyncStatus.js';

const IDLE_STATE = Object.freeze({ status: ASYNC_STATUS.IDLE, data: null, error: null });

/**
 * Runs an async action with loading/success/error state. The action receives an
 * AbortSignal as its last argument; a new run or unmount aborts the previous one.
 * @param {(...args: any[]) => Promise<any>} action keep it stable (useCallback)
 */
export function useAsyncAction(action) {
  const [state, setState] = useState(IDLE_STATE);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(
    async (...args) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ status: ASYNC_STATUS.LOADING, data: null, error: null });

      try {
        const data = await action(...args, controller.signal);
        if (controller.signal.aborted) return undefined;
        setState({ status: ASYNC_STATUS.SUCCESS, data, error: null });
        return data;
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: ASYNC_STATUS.ERROR, data: null, error });
      }
    },
    [action],
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState(IDLE_STATE);
  }, []);

  return { ...state, isLoading: state.status === ASYNC_STATUS.LOADING, run, reset };
}
