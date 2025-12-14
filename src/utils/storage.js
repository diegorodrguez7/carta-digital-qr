const PREFIX = 'qarta__';

const canPersist = typeof window !== 'undefined' && window?.localStorage;

export function loadState(key, fallback) {
  if (!canPersist) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function saveState(key, value) {
  if (!canPersist) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    // ignore persist errors on demo mode
  }
}

export function clearState(key) {
  if (!canPersist) return;
  window.localStorage.removeItem(PREFIX + key);
}
