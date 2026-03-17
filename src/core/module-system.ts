import type { Module, ModuleContext, ModuleUI } from '../types';
import { ModuleStorage } from './storage';

/**
 * System zarządzania modułami
 * Rejestruje i inicjalizuje wszystkie moduły
 */
export class ModuleSystem {
  private modules = new Map<string, Module>();
  private contexts = new Map<string, ModuleContext>();

  /**
   * Rejestruje moduł w systemie
   */
  register(moduleDef: Module): void {
    if (!moduleDef.id) {
      throw new Error('Module must have an id');
    }
    if (!moduleDef.init) {
      throw new Error('Module must have init function');
    }

    console.log(`[DevBuddy] Registering module: ${moduleDef.id}`);
    this.modules.set(moduleDef.id, moduleDef);
  }

  /**
   * Inicjalizuje wszystkie zarejestrowane moduły
   */
  async initAll(): Promise<void> {
    for (const [id, moduleDef] of this.modules) {
      try {
        const context = this.createContext(id);
        this.contexts.set(id, context);
        
        await moduleDef.init(context);
        console.log(`[DevBuddy] Module ${id} initialized`);
      } catch (error) {
        console.error(`[DevBuddy] Failed to initialize module ${id}:`, error);
      }
    }
  }

  /**
   * Pobiera moduł po ID
   */
  get(moduleId: string): Module | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Zwraca wszystkie moduły
   */
  getAll(): Module[] {
    return Array.from(this.modules.values());
  }

  /**
   * Zwraca wszystkie konfiguracje UI
   */
  getAllUI(): Array<ModuleUI & { 
    moduleId: string; 
    moduleName: string; 
    moduleIcon: string;
    moduleDescription: string;
    moduleAuthor: string;
  }> {
    const uiConfigs: Array<ModuleUI & { 
      moduleId: string; 
      moduleName: string; 
      moduleIcon: string;
      moduleDescription: string;
      moduleAuthor: string;
    }> = [];

    for (const [id, moduleDef] of this.modules) {
      if (moduleDef.getUI) {
        try {
          const ui = moduleDef.getUI();
          uiConfigs.push({
            moduleId: id,
            moduleName: moduleDef.name,
            moduleIcon: moduleDef.icon,
            moduleDescription: moduleDef.description,
            moduleAuthor: moduleDef.author,
            ...ui
          });
        } catch (error) {
          console.error(`[DevBuddy] Failed to get UI for ${id}:`, error);
        }
      }
    }

    return uiConfigs;
  }

  /**
   * Włącza moduł
   */
  enable(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module?.enable) {
      module.enable();
    }
  }

  /**
   * Wyłącza moduł
   */
  disable(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module?.disable) {
      module.disable();
    }
  }

  /**
   * Tworzy kontekst dla modułu
   */
  private createContext(moduleId: string): ModuleContext {
    return {
      storage: new ModuleStorage(moduleId),
      moduleId,
      notify: this.notify.bind(this)
    };
  }

  /**
   * Pokazuje powiadomienie
   */
  private notify(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const event = new CustomEvent('devbuddy-notify', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }
}

// Singleton
export const moduleSystem = new ModuleSystem();
