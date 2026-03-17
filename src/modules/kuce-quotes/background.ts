/**
 * Kuce Quotes - Background Module
 * Obsługa context menu i background tasks
 * 
 * WAŻNE: Ten plik jest całkowicie niezależny od content script!
 * Importuje tylko service.ts, który jest współdzielony.
 */

import { kuceQuotesService } from './service';

const MODULE_ID = 'kuce-quotes';
const STORAGE_KEY_ENABLED = `${MODULE_ID}_enabled`;

/**
 * Sprawdza czy moduł jest włączony (soft ON/OFF)
 */
async function isModuleEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_ENABLED);
    // Domyślnie włączony jeśli nie ma wartości
    return result[STORAGE_KEY_ENABLED] !== false;
  } catch {
    return true;
  }
}

/**
 * Wstawia cytat do aktywnego elementu w podanej zakładce
 */
async function insertQuoteIntoTab(tabId: number, quote: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (text: string) => {
        const activeElement = document.activeElement;
        const isTextInput = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA'
        );
        const isContentEditable = (activeElement as HTMLElement)?.isContentEditable;

        if (isTextInput && activeElement) {
          (activeElement as HTMLInputElement).value = text;
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (isContentEditable && activeElement) {
          activeElement.textContent = text;
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      args: [quote]
    });
  } catch (error) {
    console.error('[KuceQuotes] Failed to insert quote:', error);
    throw error;
  }
}

/**
 * Inicjalizacja modułu background
 */
export function init(): void {
  console.log('[KuceQuotes] Background module initializing...');

  // Rejestracja context menu (najpierw usuń stare, potem utwórz nowe)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'kuce-quotes-insert',
      title: '🐴 Wstaw losowy cytat z Kucy',
      contexts: ['editable']
    });
    console.log('[KuceQuotes] Context menu registered');
  });

  // Obsługa kliknięcia w context menu
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'kuce-quotes-insert') {
      // Sprawdź czy moduł jest włączony
      const enabled = await isModuleEnabled();
      if (!enabled) {
        console.log('[KuceQuotes] Module disabled, skipping');
        return;
      }
      
      const quote = kuceQuotesService.getRandomQuote();
      
      if (tab?.id) {
        await insertQuoteIntoTab(tab.id, quote);
      }
    }
  });

  // Załaduj cytaty przy starcie
  kuceQuotesService.loadQuotes().then(() => {
    console.log('[KuceQuotes] Quotes loaded in background');
  });
}

/**
 * Handlery wiadomości rejestrowane w background router
 */
export const messageHandlers = {
  /**
   * Pobiera losowy cytat
   */
  getRandomQuote: async (
    _request: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { quote: string }) => void
  ): Promise<boolean> => {
    // Sprawdź czy moduł jest włączony
    const enabled = await isModuleEnabled();
    if (!enabled) {
      sendResponse({ quote: '' });
      return true;
    }
    
    const quote = kuceQuotesService.getRandomQuote();
    sendResponse({ quote });
    return true;
  }
};

/**
 * Cleanup przy wyłączaniu rozszerzenia
 */
export function destroy(): void {
  chrome.contextMenus.removeAll();
}
