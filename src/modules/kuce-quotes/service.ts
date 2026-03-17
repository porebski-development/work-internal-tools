/**
 * Kuce Quotes Service
 * 
 * WAŻNE: Ten plik jest współdzielony między content script (index.ts) 
 * a background script (background.ts). Nie importuj tutaj niczego 
 * co jest specyficzne dla content script lub background!
 */

import { KUCE_QUOTES } from './quotes-data';

/** Interfejs serwisu cytatów */
export interface QuoteService {
  getRandomQuote(): string;
  loadQuotes(): Promise<void>;
}

/** Serwis losowych cytatów z Kucy z Bronksu */
export class KuceQuotesService implements QuoteService {
  private quotes: string[] = [];
  private loaded = false;

  async loadQuotes(): Promise<void> {
    if (this.loaded) return;
    
    // Dane wbudowane w kod - natychmiastowo dostępne
    this.quotes = KUCE_QUOTES;
    this.loaded = true;
    console.log('[KuceQuotes] Loaded', this.quotes.length, 'quotes');
  }

  getRandomQuote(): string {
    if (!this.loaded || this.quotes.length === 0) {
      return "Ładowanie cytatów...";
    }
    return this.quotes[Math.floor(Math.random() * this.quotes.length)];
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getQuotesCount(): number {
    return this.quotes.length;
  }
}

/** Singleton instance */
export const kuceQuotesService = new KuceQuotesService();
