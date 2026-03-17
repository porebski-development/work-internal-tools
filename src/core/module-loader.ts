/**
 * Module Loader - Auto-discovery system
 * 
 * Odpowiedzialny za:
 * 1. Skanowanie dostępnych modułów (via import.meta.glob)
 * 2. Ładowanie manifestów modułów
 * 3. Dynamiczne importowanie kodu modułów (tylko widocznych)
 * 
 * WAŻNE: Ten plik jest częścią core i nie importuje żadnych konkretnych modułów!
 */

import type { Module, ModuleManifest } from '../types';
import { getUserSettings, initializeVisibleModules } from './global-storage';

// Vite glob import - wykrywa wszystkie module.json w folderze modules
// Eager: true = ładujemy natychmiast przy starcie (są małe)
const manifestModules = import.meta.glob<ModuleManifest>(
  '../modules/*/module.json',
  { eager: true }
);

// Lazy import dla kodu modułów - ładujemy tylko gdy potrzebne
const contentModules = import.meta.glob<{ default: Module }>(
  '../modules/*/index.ts'
);

const backgroundModules = import.meta.glob<{
  init: () => void;
  destroy?: () => void;
  messageHandlers?: Record<string, unknown>;
}>(
  '../modules/*/background.ts',
  { eager: true }
);

export interface DiscoveredModule {
  manifest: ModuleManifest;
  loadContent: () => Promise<Module>;
  loadBackground?: () => Promise<{
    init: () => void;
    destroy?: () => void;
    messageHandlers?: Record<string, unknown>;
  }>;
}

/**
 * Skanuje folder modules/ i zwraca listę dostępnych modułów
 * (wszystkich, bez filtrowania widocznością)
 */
export function discoverModules(): DiscoveredModule[] {
  const modules: DiscoveredModule[] = [];

  for (const [path, manifest] of Object.entries(manifestModules)) {
    // Wyciągnij nazwę folderu modułu ze ścieżki
    // ../modules/dark-mode/module.json -> dark-mode
    const match = path.match(/\/modules\/([^/]+)\/module\.json$/);
    if (!match) continue;

    const moduleId = match[1];
    const contentPath = `../modules/${moduleId}/index.ts`;
    const backgroundPath = `../modules/${moduleId}/background.ts`;

    // Sprawdź czy ma część content
    const loadContent = contentModules[contentPath];
    if (!loadContent) {
      console.warn(`[ModuleLoader] Module ${moduleId} has manifest but no index.ts`);
      continue;
    }

    const discovered: DiscoveredModule = {
      manifest,
      loadContent: async () => {
        const module = await loadContent();
        return module.default;
      }
    };

    // Sprawdź czy ma część background (eager loaded)
    const bgModule = backgroundModules[backgroundPath];
    if (bgModule) {
      discovered.loadBackground = async () => bgModule;
      console.log(`[ModuleLoader] Module ${moduleId} has background script`);
    }

    modules.push(discovered);
    console.log(`[ModuleLoader] Discovered module: ${moduleId}`);
  }

  return modules;
}

/**
 * Zwraca WSZYSTKIE odkryte moduły (do zarządzania)
 */
export function getAllDiscoveredModules(): DiscoveredModule[] {
  return discoverModules();
}

/**
 * Ładuje widoczne moduły content i zwraca ich instancje
 */
export async function loadAllModules(): Promise<Module[]> {
  const discovered = discoverModules();
  
  // Inicjalizuj visibleModules przy pierwszym uruchomieniu
  const moduleInfos = discovered.map(d => ({
    id: d.manifest.id,
    installedByDefault: d.manifest.installedByDefault
  }));
  await initializeVisibleModules(moduleInfos);
  
  // Pobierz ustawienia
  const settings = await getUserSettings();
  
  const modules: Module[] = [];

  for (const disc of discovered) {
    // Sprawdź czy moduł jest widoczny
    const isVisible = settings.visibleModules?.includes(disc.manifest.id) ?? 
                      (disc.manifest.installedByDefault === true);
    
    if (!isVisible) {
      console.log(`[ModuleLoader] Skipping hidden module: ${disc.manifest.id}`);
      continue;
    }
    
    try {
      const module = await disc.loadContent();
      modules.push(module);
    } catch (error) {
      console.error(`[ModuleLoader] Failed to load module ${disc.manifest.id}:`, error);
    }
  }

  return modules;
}

/**
 * Ładuje wszystkie moduły background (tylko widoczne)
 */
export async function loadAllBackgroundModules(): Promise<
  Array<{ id: string; handlers?: Record<string, unknown> } & ({ init: () => void; destroy?: () => void } | { init?: () => void; destroy?: () => void })>
> {
  const discovered = discoverModules();
  const settings = await getUserSettings();
  
  const bgModules: Array<{ id: string; init?: () => void; destroy?: () => void; handlers?: Record<string, unknown> }> = [];

  for (const disc of discovered) {
    // Sprawdź czy moduł jest widoczny
    const isVisible = settings.visibleModules?.includes(disc.manifest.id) ?? 
                      (disc.manifest.installedByDefault === true);
    
    if (!isVisible) {
      continue;
    }
    
    if (disc.loadBackground) {
      try {
        const bg = await disc.loadBackground();
        bgModules.push({
          id: disc.manifest.id,
          init: bg.init,
          destroy: bg.destroy,
          handlers: bg.messageHandlers
        });
        console.log(`[ModuleLoader] Loaded background for: ${disc.manifest.id}`);
      } catch (error) {
        console.error(`[ModuleLoader] Failed to load background for ${disc.manifest.id}:`, error);
      }
    }
  }

  return bgModules;
}
