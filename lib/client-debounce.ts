/**
 * Client-side debounce and throttle utilities.
 *
 * All functions return a cancel function to abort pending executions.
 * The React hook auto-cancels on unmount via useEffect cleanup.
 */

import { useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Fn = (...args: any[]) => any;

interface DebounceOptions {
  /** Invoke on the leading edge instead of trailing (default: false) */
  leading?: boolean;
  /** Maximum time the function can be delayed (default: null = no max) */
  maxWait?: number;
}

interface ThrottleOptions {
  /** Invoke on the leading edge (default: true) */
  leading?: boolean;
  /** Invoke on the trailing edge (default: true) */
  trailing?: boolean;
}

/**
 * Create a debounced version of the provided function.
 *
 * The debounced function delays invoking `fn` until `ms` milliseconds have
 * elapsed since the last invocation. If `leading` is true, the function is
 * invoked on the leading edge instead.
 *
 * @param fn - The function to debounce
 * @param ms - Debounce delay in milliseconds
 * @param options - Additional options
 * @returns A tuple of [debouncedFn, cancelFn]
 */
export function debounce<T extends Fn>(
  fn: T,
  ms: number,
  options?: DebounceOptions
): { (...args: Parameters<T>): void; cancel: () => void; flush: () => void } {
  const { leading = false, maxWait } = options ?? {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastContext: ThisType<any> | null = null;
  let lastCallTime: number | null = null;

  function invoke(): void {
    if (lastArgs) {
      fn.apply(lastContext, lastArgs);
      lastArgs = null;
      lastContext = null;
    }
  }

  function startTimer(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      maxTimer = null;
      if (!leading) invoke();
    }, ms);
  }

  function debounced(this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    lastArgs = args;
    lastContext = this;

    if (leading && lastCallTime === null) {
      // First call with leading – invoke immediately
      lastCallTime = now;
      invoke();
      startTimer();
      return;
    }

    lastCallTime = now;

    if (maxWait && !maxTimer) {
      maxTimer = setTimeout(() => {
        maxTimer = null;
        timer = null;
        invoke();
      }, maxWait);
    }

    startTimer();
  }

  debounced.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
    lastArgs = null;
    lastContext = null;
    lastCallTime = null;
  };

  debounced.flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
    invoke();
  };

  return debounced;
}

/**
 * Create a throttled version of the provided function.
 *
 * The throttled function invokes `fn` at most once every `ms` milliseconds.
 * By default, it invokes on the leading edge and captures the trailing call.
 *
 * @param fn - The function to throttle
 * @param ms - Throttle interval in milliseconds
 * @param options - Additional options
 * @returns A tuple of [throttledFn, cancelFn]
 */
export function throttle<T extends Fn>(
  fn: T,
  ms: number,
  options?: ThrottleOptions
): { (...args: Parameters<T>): void; cancel: () => void; flush: () => void } {
  const { leading = true, trailing = true } = options ?? {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastContext: ThisType<any> | null = null;
  let lastInvokeTime = 0;

  function invoke(): void {
    if (lastArgs) {
      fn.apply(lastContext, lastArgs);
      lastArgs = null;
      lastContext = null;
      lastInvokeTime = Date.now();
    }
  }

  function throttled(this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    const elapsed = now - lastInvokeTime;

    lastArgs = args;
    lastContext = this;

    if (leading && elapsed >= ms) {
      // Leading edge and enough time has passed
      invoke();
      return;
    }

    if (trailing && !timer) {
      // Schedule trailing invocation
      const wait = Math.max(0, ms - elapsed);
      timer = setTimeout(() => {
        timer = null;
        invoke();
      }, wait);
    }
  }

  throttled.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    lastContext = null;
  };

  throttled.flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    invoke();
  };

  return throttled;
}

// ─── React Hook ──────────────────────────────────────────────────────────────

/**
 * React hook that returns a debounced version of the provided callback.
 *
 * The returned callback is stable across renders as long as `deps` don't
 * change. The debounce is automatically cancelled when the component unmounts.
 *
 * @param callback - The callback to debounce
 * @param deps - Dependencies array (like useEffect)
 * @param ms - Debounce delay in milliseconds
 * @param options - Additional debounce options
 * @returns A debounced version of the callback with .cancel() and .flush()
 */
export function useDebouncedCallback<T extends Fn>(
  callback: T,
  deps: any[],
  ms: number,
  options?: DebounceOptions
): { (...args: Parameters<T>): void; cancel: () => void; flush: () => void } {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFn = useCallback(
    debounce(
      ((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }) as T,
      ms,
      options
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ms, JSON.stringify(options), ...deps]
  );

  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);

  return debouncedFn;
}

/**
 * React hook that returns a throttled version of the provided callback.
 *
 * The returned callback is stable across renders as long as `deps` don't
 * change. The throttle is automatically cancelled when the component unmounts.
 *
 * @param callback - The callback to throttle
 * @param deps - Dependencies array (like useEffect)
 * @param ms - Throttle interval in milliseconds
 * @param options - Additional throttle options
 * @returns A throttled version of the callback with .cancel() and .flush()
 */
export function useThrottledCallback<T extends Fn>(
  callback: T,
  deps: any[],
  ms: number,
  options?: ThrottleOptions
): { (...args: Parameters<T>): void; cancel: () => void; flush: () => void } {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledFn = useCallback(
    throttle(
      ((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }) as T,
      ms,
      options
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ms, JSON.stringify(options), ...deps]
  );

  useEffect(() => {
    return () => {
      throttledFn.cancel();
    };
  }, [throttledFn]);

  return throttledFn;
}
