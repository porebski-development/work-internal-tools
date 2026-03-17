/**
 * DevBuddy Background Service Worker
 * 
 * WAŻNE: Ten plik nie importuje statycznie żadnych modułów!
 * Wszystkie moduły background są ładowane dynamicznie.
 */

import { loadAllBackgroundModules } from '../core/module-loader';

// Mapa handlerów wiadomości
const messageHandlers = new Map<string, (
  request: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void>();

/**
 * Inicjalizacja wszystkich modułów background
 */
async function initBackgroundModules(): Promise<void> {
  console.log('[Background] Initializing modules with auto-discovery...');
  console.log('[Background] Starting background module loading...');

  const bgModules = await loadAllBackgroundModules();
  console.log(`[Background] Found ${bgModules.length} background modules`);

  for (const bg of bgModules) {
    try {
      // Inicjalizacja modułu
      if (bg.init) {
        bg.init();
        console.log(`[Background] Module ${bg.id} initialized`);
      }

      // Rejestracja handlerów wiadomości
      if (bg.handlers) {
        for (const [action, handler] of Object.entries(bg.handlers)) {
          messageHandlers.set(action, handler as (
            request: unknown,
            sender: chrome.runtime.MessageSender,
            sendResponse: (response?: unknown) => void
          ) => boolean | void);
          console.log(`[Background] Registered handler: ${action}`);
        }
      }
    } catch (error) {
      console.error(`[Background] Failed to initialize module ${bg.id}:`, error);
    }
  }
}

/**
 * Globalna obsługa wiadomości z content scripts i popupu
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (typeof request !== 'object' || request === null) {
    return false;
  }

  const { action } = request as { action?: string };
  
  if (!action) {
    return false;
  }

  // Sprawdź czy jest zarejestrowany handler dla tej akcji
  const handler = messageHandlers.get(action);
  if (handler) {
    return handler(request, sender, sendResponse);
  }

  // Domyślne odpowiedzi dla core messages
  switch (action) {
    case 'getModulesUI': {
      // Ta wiadomość powinna być obsługiwana przez content script
      sendResponse({ modules: [] });
      return true;
    }

    case 'reloadExtension': {
      console.log('[Background] Reloading extension...');
      sendResponse({ success: true });
      chrome.runtime.reload();
      return true;
    }

    default:
      console.log('[Background] Unknown action:', action);
      return false;
  }
});

// Inicjalizacja przy starcie rozszerzenia
initBackgroundModules().catch(error => {
  console.error('[Background] Failed to initialize:', error);
});

// Cleanup przy wyłączaniu - przechowujemy referencje do cleanup functions
const cleanupFunctions: Array<() => void> = [];

chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Extension suspending...');
  for (const cleanup of cleanupFunctions) {
    try {
      cleanup();
    } catch (error) {
      console.error('[Background] Cleanup error:', error);
    }
  }
});
