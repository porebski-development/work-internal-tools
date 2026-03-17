# DevBuddy - Jak tworzyć moduły

## Struktura modułu

Każdy moduł to osobny katalog w `src/modules/`:

```
modules/
└── nazwa-modulu/
    ├── index.ts          # Główny plik modułu (content script)
    ├── background.ts     # Opcjonalnie - background tasks
    ├── styles.css        # Opcjonalnie - style CSS
    └── config.ts         # Opcjonalnie - konfiguracja
```

## Interfejs modułu (content script)

Każdy moduł MUSI eksportować obiekt zgodny z interfejsem `Module`:

```typescript
// modules/nazwa-modulu/index.ts
import type { Module, ModuleContext, ModuleUI } from '../../types';

const MyModule: Module = {
  id: 'nazwa-modulu',
  name: 'Nazwa Modułu',
  icon: '🚀',
  description: 'Opis modułu',
  author: '@twoj-nick',  // 🆕 Autor widoczny w popupie

  async init(context: ModuleContext): Promise<void> {
    const enabled = await context.storage.get('enabled', true);
    if (enabled) {
      this.enable();
    }
  },

  getUI(): ModuleUI {
    return {
      type: 'toggle',
      label: 'Włącz moduł',
      storageKey: 'enabled',
      defaultValue: true
    };
  },

  enable(): void { /* ... */ },
  disable(): void { /* ... */ }
};

export default MyModule;
```

### Pole `author`

Pole `author` jest wymagane i wyświetlane w popupie wtyczki jako "by @nick":

```typescript
author: '@twoj-nick'
```

To świetny sposób żeby:
- Podpisać się pod swoim modułem
- Pokazać kto jest autorem
- Budować rozpoznawalność w zespole

## Moduł z background (np. context menu)

Jeśli moduł potrzebuje funkcji background (np. context menu, alarmy, przetwarzanie w tle):

### 1. Stwórz plik `background.ts` w module

```typescript
// modules/moj-modul/background.ts

/**
 * Inicjalizacja modułu background
 */
export function init(): void {
  console.log('[MojModul] Background initialized');
  
  // Rejestracja context menu
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'moj-modul-action',
      title: '🚀 Moja akcja',
      contexts: ['all']
    });
  });
  
  // Obsługa kliknięcia
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'moj-modul-action') {
      // Logika tutaj
    }
  });
}

/**
 * Cleanup przy wyłączaniu
 */
export function destroy(): void {
  chrome.contextMenus.removeAll();
}
```

### 2. Zarejestruj moduł w background/index.ts

```typescript
// background/index.ts
import * as mojModulBackground from '../modules/moj-modul/background';

backgroundModules.set('moj-modul', mojModulBackground);
```

## Komunikacja między modułami

### Z popupu/content do background:

```typescript
// W popup lub content script
chrome.runtime.sendMessage({
  action: 'mojaAkcja',
  data: { ... }
});
```

### W background/index.ts dodaj handler:

```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'mojaAkcja') {
    // Delegacja do odpowiedniego modułu
    const result = mojModulBackground.handleAction(request.data);
    sendResponse({ result });
    return true; // Keep channel open for async
  }
});
```

## Storage

Każdy moduł ma własny namespace w storage:

```typescript
async init(context: ModuleContext) {
  // Klucz: "moj-modul_enabled"
  const enabled = await context.storage.get('enabled', true);
  
  // Zapisz
  await context.storage.set('mojKlucz', 'wartość');
}
```

## Dodawanie nowego modułu - checklist

- [ ] Stwórz folder `src/modules/nazwa-modulu/`
- [ ] Stwórz `index.ts` eksportujący moduł (interfejs `Module`)
- [ ] Opcjonalnie: stwórz `background.ts` dla funkcji background
- [ ] Jeśli ma background: zarejestruj w `background/index.ts`
- [ ] Zarejestruj moduł w `content/index.ts`:
  ```typescript
  import mojModul from './modules/nazwa-modulu';
  moduleSystem.register(mojModul);
  ```
- [ ] Dodaj testy/typy jeśli potrzebne

## Przykłady

### Minimalny moduł (tylko content script):
```typescript
export default {
  id: 'minimal',
  name: 'Minimalny',
  icon: '📦',
  description: 'Najprostszy moduł',
  author: '@minimalista',
  
  async init(context) {
    console.log('Init!');
  }
};
```

### Moduł z background (context menu):
Zobacz `modules/kuce-quotes/` - przykład kompletny.

## Powiadomienia

```typescript
async init(context) {
  context.notify('Moduł załadowany!', 'success');
  // type: 'info' | 'success' | 'error'
}
```
