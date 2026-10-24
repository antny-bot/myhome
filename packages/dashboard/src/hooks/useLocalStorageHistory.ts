import { useState, useCallback } from "react";

export function useLocalStorageHistory<T = string>(
  key: string,
  maxItems: number = 10,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b
) {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(`Failed to load history for key "${key}":`, e);
      return [];
    }
  });

  const addItem = useCallback(
    (item: T) => {
      setItems((prev) => {
        try {
          const filtered = prev.filter((x) => !isEqual(x, item));
          const updated = [item, ...filtered].slice(0, maxItems);
          localStorage.setItem(key, JSON.stringify(updated));
          return updated;
        } catch (e) {
          console.error(`Failed to add item to history "${key}":`, e);
          return prev;
        }
      });
    },
    [key, maxItems, isEqual]
  );

  const removeItem = useCallback(
    (item: T) => {
      setItems((prev) => {
        try {
          const updated = prev.filter((x) => !isEqual(x, item));
          localStorage.setItem(key, JSON.stringify(updated));
          return updated;
        } catch (e) {
          console.error(`Failed to remove item from history "${key}":`, e);
          return prev;
        }
      });
    },
    [key, isEqual]
  );

  const clearItems = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setItems([]);
    } catch (e) {
      console.error(`Failed to clear history for "${key}":`, e);
    }
  }, [key]);

  return { items, addItem, removeItem, clearItems };
}
