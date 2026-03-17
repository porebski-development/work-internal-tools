/**
 * DevBuddy Content Script - TypeScript
 * Główny plik inicjalizujący wszystkie moduły
 * 
 * WAŻNE: Ten plik nie importuje statycznie żadnych modułów!
 * Wszystkie moduły są ładowane dynamicznie przez ModuleLoader.
 */

import { moduleSystem } from '../core/module-system';
import { loadAllModules } from '../core/module-loader';
import type { CoreMessage } from '../types';

// Prevent duplicate injection
if (window.__devBuddyLoaded) {
  console.log('[DevBuddy] Already loaded, skipping...');
} else {
  window.__devBuddyLoaded = true;
  
  console.log('[DevBuddy] Initializing with auto-discovery...');

  // Auto-discovery i ładowanie wszystkich modułów
  loadAllModules().then(modules => {
    console.log(`[DevBuddy] Discovered ${modules.length} modules`);
    
    // Rejestracja wszystkich modułów
    for (const module of modules) {
      moduleSystem.register(module);
    }
    
    // Inicjalizacja
    return moduleSystem.initAll();
  }).then(() => {
    console.log('[DevBuddy] All modules initialized');
  }).catch(error => {
    console.error('[DevBuddy] Failed to initialize modules:', error);
  });

  // Nasłuchiwanie na zmiany z popupu
  chrome.runtime.onMessage.addListener(
    (request: CoreMessage, _sender, sendResponse) => {
      if (request.action === 'toggleModule') {
        if (request.enabled) {
          moduleSystem.enable(request.moduleId);
        } else {
          moduleSystem.disable(request.moduleId);
        }
        sendResponse({ success: true });
      }
      
      if (request.action === 'getModulesUI') {
        const uiConfigs = moduleSystem.getAllUI();
        sendResponse({ modules: uiConfigs });
      }
      
      if (request.action === 'executeModuleAction') {
        const module = moduleSystem.get(request.moduleId);
        if (module?.getUI?.().action) {
          module.getUI()!.action!().then((result) => {
            sendResponse(result);
          });
          return true; // Async response
        }
        sendResponse({ success: false, message: 'Action not found' });
      }
      
      return true;
    }
  );
}

// Deklaracja globalna dla TypeScript
declare global {
  interface Window {
    __devBuddyLoaded?: boolean;
  }
}
