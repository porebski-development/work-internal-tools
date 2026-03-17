/**
 * Kuce Quotes Module - TypeScript
 * Losowe cytaty z Kucy z Bronksu
 * 
 * Content Script część modułu.
 * Background część jest w background.ts
 */

import type { Module, ModuleContext, ModuleUI } from '../../types';
import { kuceQuotesService } from './service';

// Import metadanych z manifestu - jedno źródło prawdy!
import manifest from './module.json';

// Re-export dla użycia w content/index.ts
export { kuceQuotesService } from './service';

/**
 * Wstawia tekst do aktywnego elementu na stronie
 */
export function insertTextIntoActiveElement(text: string): void {
  const activeElement = document.activeElement;
  const isTextInput = activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA'
  );
  const isContentEditable = activeElement && 
    (activeElement as HTMLElement).isContentEditable;

  if (!isTextInput && !isContentEditable) {
    // Spróbuj znaleźć ostatnie pole input
    const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[type="text"], textarea, [contenteditable="true"]'
    );
    if (inputs.length > 0) {
      const lastInput = inputs[inputs.length - 1];
      lastInput.focus();
      if (lastInput.tagName === 'INPUT' || lastInput.tagName === 'TEXTAREA') {
        lastInput.value = text;
        lastInput.dispatchEvent(new Event('input', { bubbles: true }));
        lastInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        lastInput.textContent = text;
        lastInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    return;
  }

  if (isTextInput && activeElement) {
    (activeElement as HTMLInputElement | HTMLTextAreaElement).value = text;
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    activeElement.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (isContentEditable && activeElement) {
    activeElement.textContent = text;
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Eksport modułu - rozwija metadane z manifest.json i dodaje logikę
const KuceQuotesModule: Module = {
  ...manifest,  // ← id, name, icon, description, author, version

  async init(_context: ModuleContext): Promise<void> {
    // Załaduj cytaty do pamięci
    await kuceQuotesService.loadQuotes();
  },

  getUI(): ModuleUI {
    return {
      type: 'button',
      label: '🎲 Wstaw losowy cytat',
      description: 'Wstawia cytat do aktywnego pola tekstowego',
      action: async () => {
        const quote = kuceQuotesService.getRandomQuote();
        insertTextIntoActiveElement(quote);
        return { success: true, message: 'Cytat wstawiony!' };
      }
    };
  }
};

export default KuceQuotesModule;
