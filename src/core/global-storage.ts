/**
 * Global Storage - ustawienia użytkownika
 * 
 * Przechowuje globalne ustawienia użytkownika (nie per-moduł).
 * Głównie: lista widocznych modułów.
 */

import type { GlobalUserSettings } from '../types';

const DEFAULT_SETTINGS: GlobalUserSettings = {
  visibleModules: null, // null = użyj installedByDefault z manifestów
  showMoreSection: false,
  hasSeenModuleManager: false
};

const STORAGE_KEY = 'user.settings';

/**
 * Pobiera globalne ustawienia użytkownika
 */
export async function getUserSettings(): Promise<GlobalUserSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    
    if (!stored) {
      // Pierwsze uruchomienie - zwróć domyślne
      return { ...DEFAULT_SETTINGS };
    }
    
    // Merge z domyślnymi (na wypadek nowych pól)
    return {
      ...DEFAULT_SETTINGS,
      ...stored
    };
  } catch (error) {
    console.error('[GlobalStorage] Failed to get settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Zapisuje globalne ustawienia użytkownika
 */
export async function saveUserSettings(settings: GlobalUserSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error('[GlobalStorage] Failed to save settings:', error);
    throw error;
  }
}

/**
 * Pokazuje moduł (dodaje do visibleModules)
 */
export async function showModule(moduleId: string): Promise<void> {
  const settings = await getUserSettings();
  
  if (!settings.visibleModules) {
    // Inicjalizacja - pobierz wszystkie moduły które są widoczne domyślnie
    // Ta logika powinna być wywoływana raz przy pierwszym uruchomieniu
    settings.visibleModules = [];
  }
  
  if (!settings.visibleModules.includes(moduleId)) {
    settings.visibleModules.push(moduleId);
    await saveUserSettings(settings);
    console.log('[GlobalStorage] Module shown:', moduleId);
  }
}

/**
 * Ukrywa moduł (usuwa z visibleModules)
 */
export async function hideModule(moduleId: string): Promise<void> {
  const settings = await getUserSettings();
  
  if (settings.visibleModules) {
    settings.visibleModules = settings.visibleModules.filter(id => id !== moduleId);
    await saveUserSettings(settings);
    console.log('[GlobalStorage] Module hidden:', moduleId);
  }
}

/**
 * Sprawdza czy moduł jest widoczny
 */
export async function isModuleVisible(
  moduleId: string, 
  installedByDefault: boolean = false
): Promise<boolean> {
  const settings = await getUserSettings();
  
  // Jeśli użytkownik skonfigurował visibleModules - użyj tej listy
  if (settings.visibleModules !== null) {
    return settings.visibleModules.includes(moduleId);
  }
  
  // Pierwsze uruchomienie - użyj installedByDefault z manifestu
  return installedByDefault;
}

/**
 * Inicjalizuje visibleModules przy pierwszym uruchomieniu
 * Wywoływana raz - pobiera wszystkie moduły z installedByDefault: true
 */
export async function initializeVisibleModules(allModuleIds: Array<{ id: string; installedByDefault?: boolean }>): Promise<void> {
  const settings = await getUserSettings();
  
  // Inicjalizuj tylko jeśli visibleModules jest null (pierwsze uruchomienie)
  if (settings.visibleModules === null) {
    settings.visibleModules = allModuleIds
      .filter(m => m.installedByDefault === true)
      .map(m => m.id);
    
    await saveUserSettings(settings);
    console.log('[GlobalStorage] Initialized visible modules:', settings.visibleModules);
  }
}

/**
 * Resetuje ustawienia do domyślnych (przywraca installedByDefault)
 */
export async function resetToDefaults(allModuleIds: Array<{ id: string; installedByDefault?: boolean }>): Promise<void> {
  const settings: GlobalUserSettings = {
    visibleModules: allModuleIds
      .filter(m => m.installedByDefault === true)
      .map(m => m.id),
    showMoreSection: false,
    hasSeenModuleManager: false
  };
  
  await saveUserSettings(settings);
  console.log('[GlobalStorage] Reset to defaults');
}
