// Storage abstraction: uses Capacitor Preferences on device, localStorage in browser

const isCapacitor = () => typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

async function getCapPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

export async function storageGet(key) {
  try {
    if (isCapacitor()) {
      const Pref = await getCapPreferences();
      const { value } = await Pref.get({ key });
      return value ? JSON.parse(value) : null;
    }
  } catch {}
  // Fallback localStorage
  try {
    const val = localStorage.getItem('atcRoster_' + key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function storageSet(key, value) {
  try {
    if (isCapacitor()) {
      const Pref = await getCapPreferences();
      await Pref.set({ key, value: JSON.stringify(value) });
      return;
    }
  } catch {}
  // Fallback localStorage
  try {
    localStorage.setItem('atcRoster_' + key, JSON.stringify(value));
  } catch {}
}

export async function storageRemove(key) {
  try {
    if (isCapacitor()) {
      const Pref = await getCapPreferences();
      await Pref.remove({ key });
      return;
    }
  } catch {}
  localStorage.removeItem('atcRoster_' + key);
}

// Convenience sync wrappers (for React state)
export function storageSyncSet(key, value) {
  storageSet(key, value).catch(() => {});
}

// Export full app data as JSON string (for sync)
export function exportAllData(controllers, history, settings) {
  return JSON.stringify({
    version: '3.0',
    exportedAt: new Date().toISOString(),
    controllers,
    history,
    settings,
  }, null, 2);
}

// Import and validate
export function importAllData(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.controllers) {
    throw new Error('Format de données invalide');
  }
  return data;
}

// Share via native share (Capacitor) or clipboard (web)
export async function shareExport(jsonString) {
  try {
    if (isCapacitor()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Roster DCCC — Données de synchronisation',
        text: jsonString,
        dialogTitle: 'Partager les données du roster',
      });
      return true;
    }
  } catch {}
  // Web fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(jsonString);
    return 'clipboard';
  } catch {
    return false;
  }
}
