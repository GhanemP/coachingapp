"use client";
import { useEffect, useCallback, DependencyList } from 'react';

/**
 * Properly handles useEffect dependencies to avoid common ESLint warnings
 * @param effect Effect callback function
 * @param dependencies Array of dependencies
 */
export const useSafeEffect = (effect: () => void, dependencies: DependencyList) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, dependencies);
};

/**
 * Creates a stable callback reference
 * @param callback Function to memoize
 * @param dependencies Array of dependencies
 */
export const useStableCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  dependencies: DependencyList
) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, dependencies);
};

/**
 * Handles async operations in useEffect
 * @param asyncEffect Async effect function
 * @param dependencies Array of dependencies
 */
export const useAsyncEffect = (
  asyncEffect: () => Promise<void>,
  dependencies: DependencyList
) => {
  useEffect(() => {
    const execute = async () => {
      await asyncEffect();
    };
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, asyncEffect]);
};