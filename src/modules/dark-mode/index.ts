import type { Module, ModuleContext, ModuleUI } from '../../types';

/**
 * Dark Mode Module - TypeScript
 * Wstrzykuje ciemny motyw CSS do Jiry
 * 
 * WAŻNE: Ten moduł jest całkowicie niezależny!
 * Nie importuje niczego z innych modułów ani z core poza typami.
 */

// Import metadanych z manifestu - jedno źródło prawdy!
import manifest from './module.json';

// Import CSS jako string (inline) - działa identycznie w dev i build
import darkModeStyles from './styles.css?inline';

class DarkModeHandler {
  private styleElement: HTMLStyleElement | null = null;

  inject(): void {
    if (this.styleElement) {
      console.log('[DarkMode] Already injected');
      return;
    }
    if (document.getElementById('devbuddy-dark-mode')) {
      console.log('[DarkMode] Element already exists in DOM');
      return;
    }

    // Sprawdź czy document.head istnieje
    if (!document.head) {
      console.error('[DarkMode] document.head not available, retrying...');
      setTimeout(() => this.inject(), 100);
      return;
    }

    console.log('[DarkMode] Injecting inline stylesheet');

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'devbuddy-dark-mode';
    this.styleElement.textContent = darkModeStyles;
    
    document.head.appendChild(this.styleElement);
    console.log('[DarkMode] Stylesheet injected, length:', darkModeStyles.length);
  }

  remove(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
      console.log('[DarkMode] Stylesheet removed');
    }
    // Usuń też ewentualne pozostałości
    const existing = document.getElementById('devbuddy-dark-mode');
    if (existing) {
      existing.remove();
      console.log('[DarkMode] Orphan stylesheet removed');
    }
  }

  isActive(): boolean {
    return !!document.getElementById('devbuddy-dark-mode');
  }
}

// Singleton
const darkMode = new DarkModeHandler();

// Eksport modułu - rozwija metadane z manifest.json i dodaje logikę
const DarkModeModule: Module = {
  ...manifest,  // ← id, name, icon, description, author, version

  async init(context: ModuleContext): Promise<void> {
    console.log('[DarkMode] Module init');
    const enabled = await context.storage.get('enabled', true);
    console.log('[DarkMode] Enabled:', enabled);
    if (enabled) {
      darkMode.inject();
    }
  },

  getUI(): ModuleUI {
    return {
      type: 'toggle',
      label: 'Włącz dark mode',
      storageKey: 'enabled',
      defaultValue: true
    };
  },

  enable(): void {
    console.log('[DarkMode] enable() called');
    darkMode.inject();
  },

  disable(): void {
    console.log('[DarkMode] disable() called');
    darkMode.remove();
  },

  toggle(): void {
    console.log('[DarkMode] toggle() called');
    if (darkMode.isActive()) {
      darkMode.remove();
    } else {
      darkMode.inject();
    }
  }
};

export default DarkModeModule;
