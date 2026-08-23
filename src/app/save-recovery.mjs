export function restoreFirstValidSave({ storage, keys, restore }) {
  const damagedKeys = [];
  for (const key of keys) {
    if (!storage.has(key)) continue;
    try {
      return {
        session: restore(storage.read(key)),
        sourceKey: key,
        damagedKeys,
      };
    } catch {
      damagedKeys.push(key);
      storage.remove(key);
    }
  }
  return { session: null, sourceKey: null, damagedKeys };
}

export function rotateRecoverableSave({
  storage,
  primaryKey,
  backupKey,
  nextValue,
  restore,
}) {
  if (storage.has(primaryKey)) {
    try {
      const previous = restore(storage.read(primaryKey));
      storage.write(backupKey, previous);
    } catch {
      storage.remove(primaryKey);
    }
  }
  storage.write(primaryKey, nextValue);
  return nextValue;
}
