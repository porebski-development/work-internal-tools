/**
 * Core Types dla DevBuddy
 * 
 * WAŻNE: Ten plik zawiera TYLKO podstawowe interfejsy systemu modułów.
 * Żadne typy specyficzne dla konkretnych modułów nie powinny tu trafiać!
 * Każdy moduł definiuje swoje własne typy wewnątrz swojego folderu.
 */

/** Kontekst modułu przekazywany do każdego modułu przez core */
export interface ModuleContext {
  storage: Storage;
  moduleId: string;
  notify: (message: string, type?: 'info' | 'success' | 'error') => void;
}

/** Interfejs storage per moduł - izolacja danych */
export interface Storage {
  get<T>(key: string, defaultValue?: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
}

/** Konfiguracja UI dla popupu */
export interface ModuleUI {
  type: 'toggle' | 'button' | 'info';
  label: string;
  description?: string;
  storageKey?: string;
  defaultValue?: boolean;
  currentValue?: boolean;
  action?: () => Promise<{ success: boolean; message?: string }>;
}

// ============================================
// MODULE MANIFEST - Deklaracja modułu (module.json)
// ============================================

/** Manifest modułu - deklaruje metadane modułu */
export interface ModuleManifest {
  /** Unikalny identyfikator modułu */
  id: string;
  /** Nazwa wyświetlana */
  name: string;
  /** Ikona (emoji lub URL) */
  icon: string;
  /** Opis funkcjonalności */
  description: string;
  /** Autor modułu */
  author: string;
  /** Wersja modułu */
  version: string;
  
  /** Czy widoczny domyślnie przy pierwszej instalacji (true = widoczny) */
  installedByDefault?: boolean;
  
  /** Tagi dla wyszukiwania/filtrowania (opcjonalne) */
  tags?: string[];
}

// ============================================
// GLOBAL USER SETTINGS
// ============================================

/** Globalne ustawienia użytkownika */
export interface GlobalUserSettings {
  /** Lista ID modułów które użytkownik chce widzieć (null = użyj installedByDefault) */
  visibleModules: string[] | null;
  
  /** Czy pokazywać sekcję "Więcej modułów" w popupie */
  showMoreSection: boolean;
  
  /** Czy okno zarządzania było już otwierane */
  hasSeenModuleManager: boolean;
}

/** Definicja modułu - rozszerza manifest o logikę */
export interface Module extends ModuleManifest {
  /** Inicjalizacja modułu - wymagana */
  init(context: ModuleContext): Promise<void> | void;
  
  /** Opcjonalne metody lifecycle */
  getUI?(): ModuleUI;
  enable?(): void;
  disable?(): void;
  toggle?(): void;
  destroy?(): void;
}

/** Stan modułu w storage */
export interface ModuleState {
  enabled: boolean;
  initialized: boolean;
}



// ============================================
// MESSAGES - Core komunikacja między skryptami
// ============================================

/** 
 * Wiadomości wymagane przez core system - to jest jedyny "protokół"
 * który muszą wspierać moduły. Moduły mogą definiować własne wiadomości
 * lokalnie w swoich typach.
 */
export type CoreMessage =
  | { action: 'toggleModule'; moduleId: string; enabled: boolean }
  | { action: 'getModulesUI' }
  | { action: 'executeModuleAction'; moduleId: string; moduleAction: string };

/** 
 * Ogólny typ wiadomości - moduły mogą rozszerzać ten typ lokalnie
 * @deprecated Używaj CoreMessage dla wiadomości core lub definiuj własne w module
 */
export type ChromeRuntimeMessage = CoreMessage;
