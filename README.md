# DevBuddy Extension (TypeScript + Vite)

Modularny toolkit deweloperski dla NNV - wersja TypeScript z Vite. Auto-discovery modułów, system widoczności (Hard/Soft OFF) i nowoczesna architektura.

## 🚀 Funkcjonalności

| Moduł | Opis | Domyślnie widoczny |
|-------|------|-------------------|
| **🎨 Jira Dark Mode** | Ciemny motyw dla Jiry z przełącznikiem | ✅ Tak |
| **⏱️ JITRACK Export** | Eksport tasków do JITRACK | ✅ Tak |
| **🐴 Kuce Quotes** | Losowe cytaty z Kucy z Bronksu + menu kontekstowe | ❌ Nie (włącz w Module Managerze) |

### Kluczowe cechy

- **🔍 Auto-discovery modułów** - Moduły są automatycznie wykrywane, nie trzeba ich ręcznie rejestrować
- **👁️ System widoczności (Hard OFF / Soft OFF)** - Ukryj nieużywane moduły lub tymczasowo wyłącz
- **⚙️ Module Manager** - Zarządzaj widocznością modułów z poziomu popupu (przycisk ⚙️)
- **🔄 HMR w dev** - Hot Module Replacement dla szybkiego developmentu

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

### 3. Załaduj wtyczkę w Chrome

1. **Otwórz** w Chrome: `chrome://extensions`
2. **Włącz Developer mode** (przełącznik w prawym górnym rogu)
3. **Kliknij "Load unpacked"** (przycisk z ikoną folderu)
4. **Wybierz folder** `devbuddy-extension-ts/dist/`  
   ⚠️ **Ważne:** Wybierz `dist/`, nie root projektu!
5. **Gotowe!** Wtyczka pojawi się na pasku narzędzi.

---

## 👁️ System Widoczności Modułów

Każdy moduł ma dwa poziomy kontroli:

### Hard OFF (ukrywanie modułu)
Moduł jest całkowicie niewidoczny w popupie i nie jest ładowany. Zarządzaj tym przez **Module Manager** (przycisk ⚙️ w popupie).

**Flow:**
1. Kliknij ⚙️ w popupie
2. Znajdź moduł na liście
3. Kliknij "Ukryj" / "Pokaż"
4. Kliknij "Gotowe" - strona zostanie przeładowana

### Soft OFF (wyłączanie)
Moduł jest widoczny w popupie, ale wyłączony (szary). Przełączaj przyciskiem w popupie.

### `installedByDefault` - pierwsza instalacja
W `module.json` każdego modułu można ustawić:
```json
{
  "id": "my-module",
  "installedByDefault": true   // true = widoczny od razu, false = ukryty
}
```

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
# Terminal 1 - Vite dev server
npm run dev

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

**Module Manager:**
- Otwórz popup → kliknij ⚙️ → prawy przycisk myszy → "Inspect"

---

## 📦 Skrypty npm

```bash
npm run dev           # Start dev server (Vite watch)
npm run build         # Build produkcyjny → dist/
npm run build:zip     # Build + ZIP do release
cd dist && zip -r ../devbuddy-extension-v2.0.0.zip .
npm run type-check    # Sprawdź typy TypeScript
npm run lint          # ESLint
```

---

## 📁 Struktura projektu

```
devbuddy-extension-ts/
├── src/
│   ├── types/              # Definicje typów TypeScript
│   │   └── index.ts        # Core types: Module, ModuleManifest, GlobalUserSettings
│   ├── core/               # System core
│   │   ├── storage.ts      # ModuleStorage per moduł
│   │   ├── global-storage.ts  # Globalne ustawienia użytkownika (widoczność modułów)
│   │   ├── module-system.ts   # Rejestracja i lifecycle modułów
│   │   └── module-loader.ts   # Auto-discovery modułów (Vite glob imports)
│   ├── modules/            # Moduły rozszerzenia
│   │   ├── dark-mode/      # Content-only moduł
│   │   │   ├── index.ts
│   │   │   ├── styles.css
│   │   │   └── module.json # Manifest: id, name, installedByDefault, tags...
│   │   ├── jitrack/        # Content-only moduł
│   │   │   ├── index.ts
│   │   │   ├── styles.css
│   │   │   ├── extractor.ts
│   │   │   ├── types.ts
│   │   │   └── module.json
│   │   └── kuce-quotes/    # Content + Background moduł
│   │       ├── index.ts    # Logika content script
│   │       ├── background.ts  # Context menu (background)
│   │       ├── service.ts
│   │       ├── quotes-data.ts
│   │       └── module.json
│   ├── background/         # Service Worker
│   │   └── index.ts        # Router - ładuje moduły background
│   ├── content/            # Content Script
│   │   └── index.ts        # Auto-discovery i rejestracja modułów
│   └── popup/              # Popup UI
│       ├── popup.ts        # Główna logika popupu
│       ├── popup.html
│       ├── popup.css
│       └── module-manager.ts  # Okno zarządzania modułami (⚙️)
├── public/                 # Zasoby statyczne
│   ├── icons/
│   └── data/
├── dist/                   # Build output
├── todos/                  # Plany funkcjonalności
│   ├── module-visibility-system.md
│   └── inter-module-communication.md
├── MODULES.md              # 📖 Dokumentacja tworzenia modułów
└── ...config files
```

### Architektura modułowa

Każdy moduł to osobny byt z własną odpowiedzialnością:

- **Content-only moduły** (np. dark-mode, jitrack): Tylko w folderze `modules/`
- **Content + Background** (np. kuce-quotes): Ma `index.ts` (content) + `background.ts` (background)
- **Auto-discovery** - moduły są wykrywane automatycznie przez `module-loader.ts`, nie trzeba ich ręcznie rejestrować
- **Manifest (`module.json`)** - deklaruje metadane, w tym `installedByDefault` i `tags`

Szczegóły: zobacz `MODULES.md`

---

## 🧩 Dodawanie nowego modułu

### 1. Stwórz strukturę folderów

```bash
mkdir -p src/modules/my-module
touch src/modules/my-module/module.json
touch src/modules/my-module/index.ts
```

### 2. Zdefiniuj manifest (`module.json`)

```json
{
  "id": "my-module",
  "name": "My Module",
  "icon": "🚀",
  "description": "Opis co robi moduł",
  "author": "Twoje Imię",
  "version": "1.0.0",
  "installedByDefault": false,
  "tags": ["productivity", "jira"]
}
```

### 3. Zaimplementuj moduł (`index.ts`)

```typescript
import type { Module, ModuleContext, ModuleUI } from '../../types';
import manifest from './module.json';

const MyModule: Module = {
  ...manifest,  // Rozwija id, name, icon, description, author, version

  async init(context: ModuleContext): Promise<void> {
    const enabled = await context.storage.get('enabled', true);
    if (enabled) {
      this.enable?.();
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

  enable(): void {
    console.log('[MyModule] Enabled');
  },

  disable(): void {
    console.log('[MyModule] Disabled');
  }
};

export default MyModule;
```

### 4. Gotowe!

Moduł zostanie automatycznie wykryty przez `module-loader.ts`. Nie musisz nic rejestrować ręcznie.

---

## 🚀 Release

```bash
# 1. Zmień wersję w package.json i manifest.json
# 2. Build i ZIP
npm run build:zip

# 3. Commit i tag
git add .
git commit -m "feat: nowa funkcjonalność"
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin main --tags
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

### "Content script not ready" w popupie

To normalne po restarcie rozszerzenia. Content script musi zostać przeładowany na stronie (F5).

---

## 📄 Różnice względem wersji vanilla JS

| Cecha | Vanilla JS | TypeScript + Vite |
|-------|-----------|-------------------|
| Typowanie | ❌ Brak | ✅ Pełne typowanie |
| Auto-discovery modułów | ❌ Ręczna rejestracja | ✅ Automatyczna |
| System widoczności | ❌ Brak | ✅ Hard/Soft OFF |
| Module Manager | ❌ Brak | ✅ Zarządzanie z popupu |
| HMR | ❌ Brak | ✅ Dostępne |
| Build | Ręczny | ✅ Automatyczny (CI/CD) |

---

## 📖 Dokumentacja dodatkowa

- `MODULES.md` - Szczegółowa dokumentacja tworzenia modułów
- `todos/module-visibility-system.md` - Specyfikacja systemu widoczności
- `todos/inter-module-communication.md` - Planowana komunikacja między modułami

---

## 📝 Licencja

Internal - DEV BUDDY
