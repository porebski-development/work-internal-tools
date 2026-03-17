import type { Storage as IStorage } from '../types';

/**
 * Implementacja storage z namespace'owaniem per moduł
 */
export class ModuleStorage implements IStorage {
  private prefix: string;

  constructor(moduleId: string = 'core') {
    this.prefix = `${moduleId}_`;
  }

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    const fullKey = this.prefix + key;
    const result = await chrome.storage.local.get(fullKey);
    return result[fullKey] !== undefined ? (result[fullKey] as T) : (defaultValue as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const fullKey = this.prefix + key;
    await chrome.storage.local.set({ [fullKey]: value });
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await chrome.storage.local.remove(fullKey);
  }

  async getAll(): Promise<Record<string, unknown>> {
    const all = await chrome.storage.local.get(null);
    const moduleData: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(this.prefix)) {
        moduleData[key.slice(this.prefix.length)] = value;
      }
    }
    
    return moduleData;
  }
}

// Global storage dla popupu/background
export const globalStorage = {
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? (result[key] as T) : (defaultValue as T);
  },
  
  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
};
