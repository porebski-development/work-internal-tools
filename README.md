# DevBuddy Extension (TypeScript + Vite)

Modularny toolkit deweloperski dla NNV - wersja TypeScript z Vite.

## 🚀 Funkcjonalności

- **🎨 Jira Dark Mode** - Ciemny motyw dla Jiry z przełącznikiem
- **⏱️ JITRACK Export** - Eksport tasków do JITRACK  
- **🐴 Kuce Quotes** - Losowe cytaty z Kucy z Bronksu (działa na każdej stronie!)

---

## 📋 Wymagania wstępne

- **Node.js** w wersji 18+ (zalecana: 20 LTS)
- **npm** 10+ lub **yarn** lub **pnpm**
- **Google Chrome** lub **Chromium-based browser**

Sprawdź wersję:
```bash
node --version  # >= 18.0.0
npm --version   # >= 10.0.0
```

---

## 🏁 Szybki start

### 1. Instalacja

```bash
cd devbuddy-extension-ts
npm install
```

### 2. Uruchom dev server

```bash
npm run dev
```

Poczekaj na komunikat:
```
VITE v5.x.x  ready in xxx ms
➜  CRXJS: Load dist as unpacked extension
```

Folder `dist/` zostanie utworzony automatycznie.

### 3. Załaduj wtyczkę w Chrome (krok po kroku)

1. **Otwórz** w Chrome: `chrome://extensions`

2. **Włącz Developer mode** (przełącznik w prawym górnym rogu)

3. **Kliknij "Load unpacked"** (przycisk z ikoną folderu, lewy górny róg)

4. **Wybierz folder** `devbuddy-extension-ts/dist/`  
   ⚠️ **Ważne:** Wybierz `dist/`, nie root projektu!

5. **Gotowe!** Wtyczka pojawi się na pasku narzędzi.

---

## 🔧 Development

### HMR (Hot Module Replacement)

| Element | Zmiana kodu | Co się dzieje | Wymaga reload? |
|---------|-------------|---------------|----------------|
| **Popup** | HTML/CSS/TS | 🔄 Auto-update | ❌ Nie |
| **Popup CSS** | popup.css | 🔄 Hot update | ❌ Nie |
| **Content Script CSS** | styles.css | 🔄 Hot update | ❌ Nie |
| **Content Script JS** | index.ts | 🔄 Przebudowanie | ✅ Strona (F5) |
| **Background** | index.ts | 🔄 Restart SW | ❌ Auto |

### Workflow deweloperski

```bash
# Terminal 1 - Vite dev server (zostaw otwarty)
npm run dev

# Chrome - załaduj dist/ jako unpacked extension
# Edytuj kod w src/ - zmiany widoczne natychmiast lub po F5
```

### Debugowanie w Chrome

**Popup:**
- Kliknij prawym na ikonę wtyczki → "Inspect popup"

**Content Script (na stronie Jiry):**
- F12 → Sources → Content scripts
- Console pokazuje logi z `content/index.ts`

**Background:**
- `chrome://extensions` → znajdź wtyczkę → "service worker"

---

## 📦 Skrypty npm

```bash
npm run dev           # Start dev server (Vite watch)
npm run build         # Build produkcyjny → dist/
npm run build:zip     # Build + ZIP do release
npm run type-check    # Sprawdź typy TypeScript
npm run lint          # ESLint
```

---

## 📁 Struktura projektu

```
devbuddy-extension-ts/
├── src/
│   ├── types/              # Definicje typów TypeScript
│   ├── core/               # Storage, ModuleSystem
│   ├── modules/            # Moduły rozszerzenia
│   │   ├── dark-mode/      # Content-only moduł
│   │   │   ├── index.ts
│   │   │   └── styles.css
│   │   ├── jitrack/        # Content-only moduł
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   └── extractor.ts
│   │   └── kuce-quotes/    # Content + Background moduł
│   │       ├── index.ts    # Logika content script
│   │       └── background.ts # Context menu (background)
│   ├── background/         # Service Worker - router
│   │   └── index.ts        # Orchestruje moduły background
│   ├── content/            # Content Script
│   │   └── index.ts        # Rejestruje moduły content
│   └── popup/              # Popup UI
│       ├── popup.ts
│       ├── popup.html
│       └── popup.css
├── public/                 # Zasoby statyczne
│   ├── icons/
│   ├── data/
│   └── modules/            # CSS modułów
├── dist/                   # Build output
├── MODULES.md              # 📖 Dokumentacja modułów
└── ...config files
```

### Architektura modułowa

Każdy moduł to osobny byt z własną odpowiedzialnością:

- **Content-only moduły** (np. dark-mode, jitrack): Tylko w folderze `modules/`
- **Content + Background** (np. kuce-quotes): Ma `index.ts` (content) + `background.ts` (background tasks)
- **background/index.ts** - router który importuje i inicjalizuje wszystkie moduły background

Szczegóły: zobacz `MODULES.md`

---

## 🧩 Dodawanie nowego modułu

1. Stwórz folder `src/modules/nazwa-modulu/`
2. Stwórz `index.ts` implementujący interfejs `Module`
3. Zarejestruj moduł w `src/content/index.ts`

Przykład minimalnego modułu:

```typescript
import type { Module, ModuleContext, ModuleUI } from '../../types';

const MyModule: Module = {
  id: 'my-module',
  name: 'My Module',
  icon: '🚀',
  description: 'Opis modułu',

  async init(context: ModuleContext): Promise<void> {
    const enabled = await context.storage.get('enabled', true);
    if (enabled) {
      // Inicjalizacja
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

---

## 🚀 Release

```bash
# 1. Zmień wersję w package.json i manifest.json
# 2. Commit i tag
git add .
git commit -m "feat: nowa funkcjonalność"
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin main --tags

# GitHub Actions automatycznie:
# - Zbuduje rozszerzenie
# - Stworzy ZIP  
# - Opublikuje Release na GitHub
```

---

## 🐛 Rozwiązywanie problemów

### Port 5173 jest zajęty / Procesy wiszą w tle

```bash
# Zabij wszystkie procesy npm/node dla tego projektu
ps aux | grep -E "(npm|node).*devbuddy-extension-ts" | grep -v grep | awk '{print $2}' | xargs kill -9

# Lub po porcie
lsof -ti:5173 | xargs kill -9
```

### "Cannot find module" przy imporcie

```bash
rm -rf node_modules package-lock.json
npm install
```

### Wtyczka nie pojawia się w Chrome

1. Upewnij się że wybrałeś folder `dist/` a nie root projektu
2. Sprawdź czy w `dist/` są pliki (manifest.json, content.js, itp.)
3. Kliknij 🔄 reload przy wtyczce w `chrome://extensions`

### Zmiany nie są widoczne w Chrome

- **Popup:** Zamknij i otwórz popup ponownie
- **Content Script:** Odśwież stronę (F5)
- **Background:** Kliknij 🔄 reload w `chrome://extensions`

---

## 📄 Różnice względem wersji vanilla JS

| Cecha | Vanilla JS | TypeScript + Vite |
|-------|-----------|-------------------|
| Typowanie | ❌ Brak | ✅ Pełne typowanie |
| ES Modules | ⚠️ Ograniczone | ✅ Pełne wsparcie |
| HMR | ❌ Brak | ✅ Dostępne |
| Autouzupełnianie | ❌ Ograniczone | ✅ Pełne IDE support |
| Build | Ręczny | ✅ Automatyczny (CI/CD) |

---

## 📝 Licencja

Internal - DEV BUDDY


