# System Widoczności Modułów (Hard OFF / Soft OFF)

## Status
📝 Zaprojektowane - gotowe do implementacji

## Problem
Przy rozroście ilości modułów (15+), użytkownik nie chce widzieć wszystkich w popupie. Niektóre moduły są przydatne tylko dla konkretnych grup (DevOps, Frontend, QA).

## Cel
Umożliwić użytkownikowi:
1. **Ukrycie** modułów których nie używa (Hard OFF - moduł niewidoczny)
2. **Włączenie/Wyłączenie** widocznych modułów (Soft OFF - moduł widoczny ale nieaktywny)

---

## Architektura

### Dwa Poziomy Kontroli

| Poziom | Nazwa | Efekt | Użytkownik widzi w popupie | Storage |
|--------|-------|-------|----------------------------|---------|
| 1 | **Hard OFF** | Moduł niewidoczny, nie załadowany | ❌ Nie | `user.settings.hiddenModules` |
| 2 | **Soft OFF** | Moduł widoczny, ale wyłączony | ✅ Tak (szary) | `{moduleId}_enabled: false` |

### Flow Użytkownika

```
Pierwsza instalacja:
  └─ Widzi moduły "domyślne" (dark-mode, jitrack)
  └─ Kuce-quotes ukryty (nie zaśmieca na start)
  └─ Wchodzi w "Zarządzaj modułami"
  └─ Włącza widoczność "kuce-quotes" i "kubernetes-dashboard"
  └─ W popupie widzi teraz 4 moduły
  └─ JITRACK wyłącza (Soft OFF) - widać ale nie działa
```

---

## Zmiany w Kodzie

### 1. Rozszerzenie ModuleManifest

```typescript
// src/types/index.ts
export interface ModuleManifest {
  id: string;
  name: string;
  icon: string;
  description: string;
  author: string;
  version: string;
  
  // NOWE: Czy widoczny domyślnie przy pierwszej instalacji
  // true = nowy użytkownik widzi od razu
  // false/brak = ukryty, trzeba włączyć w ustawieniach
  installedByDefault?: boolean;
  
  // NOWE: Tagi dla wyszukiwania/filtrowania (opcjonalne)
  tags?: string[];
}
```

### 2. Ustawienia Manifestów Modułów

```json
// dark-mode/module.json
{
  "id": "dark-mode",
  "name": "Jira Dark Mode",
  "installedByDefault": true
}

// jitrack/module.json
{
  "id": "jitrack",
  "name": "JITRACK Export",
  "installedByDefault": true
}

// kuce-quotes/module.json
{
  "id": "kuce-quotes",
  "name": "Kuce Quotes",
  "installedByDefault": false
}

// kubernetes-dashboard/module.json (przyszły)
{
  "id": "kubernetes-dashboard",
  "name": "K8s Dashboard",
  "installedByDefault": false,
  "tags": ["devops", "kubernetes", "infra"]
}
```

**Uwaga:** Brak `installedByDefault` = `false` (domyślnie ukryty).

---

## Storage Schema

```typescript
// chrome.storage.local

{
  // Globalne ustawienia użytkownika
  "user.settings": {
    // Lista ID modułów które użytkownik CHCE widzieć
    // Jeśli null/undefined - użyj installedByDefault
    "visibleModules": [
      "dark-mode",
      "jitrack",
      "kuce-quotes"  // użytkownik dodał ręcznie
    ],
    
    // Czy pokazywać sekcję "więcej modułów" w popupie
    "showMoreSection": false,
    
    // Czy okno zarządzania było już otwierane
    "hasSeenModuleManager": false
  },
  
  // Stan per moduł (soft on/off)
  "dark-mode_enabled": true,
  "jitrack_enabled": false,
  "kuce-quotes_enabled": true
}
```

### Logika Widoczności

```typescript
function isModuleVisible(module: ModuleManifest, userSettings: UserSettings): boolean {
  // Jeśli użytkownik już konfigurował - użyj jego wyboru
  if (userSettings.visibleModules !== null) {
    return userSettings.visibleModules.includes(module.id);
  }
  
  // Pierwsza instalacja - użyj installedByDefault
  return module.installedByDefault === true;
}
```

---

## Interfejs Użytkownika

### Popup Główny

```
┌─ DevBuddy ───────────────┐
│ [⚙️]           [v] v2.0.0│
├──────────────────────────┤
│                           │
│ 🎨 Jira Dark Mode        │
│ [🌙 Włączony]            │
│                           │
│ ⏱️ JITRACK Export        │
│ [🔴 Wyłączony]           │
│                           │
│ ── Więcej modułów (3) ── │
│ [Kuce Quotes] [K8s] ...  │
│ [Zarządzaj modułami ↗]   │
└──────────────────────────┘
```

### Okno Zarządzania Modułami

```
┌─ Zarządzaj Modułami ─────┐
│                           │
│ 🔍 Szukaj modułu...      │
│                           │
│ 📦 Twoje moduły          │
│ ☑️ Dark Mode             │
│ ☐  JITRACK (wył.)        │
│ ☑️ Kuce Quotes           │
│ ☐  Kubernetes Dashboard  │
│ ☐  AWS Logs              │
│ ☐  React DevTools        │
│ ☐  API Tester            │
│                           │
│ [Zaznacz wszystkie]      │
│ [Odznacz wszystkie]      │
│                           │
│ [Zamknij]                │
└──────────────────────────┘
```

---

## Filozofia: Brak "Core"

**Nie ma modułów "ważniejszych".**

- `dark-mode` i `jitrack` są domyślnie widoczne, bo to najpopularniejsze funkcje
- `kuce-quotes` jest ukryty na start, bo to "nice to have"
- Każdy użytkownik może ukryć JITRACK i pokazać Kuce Quotes
- Nie ma hierarchii - tylko domyślne ustawienia dla nowych użytkowników

### Dlaczego nie "Core"?

| Podejście "Core" | Problem |
|------------------|---------|
| Core = zawsze widoczne | Użytkownik nie może ukryć JITRACK jeśli nie używa |
| Core = ważniejsze | Sugeruje że inne są gorsze |
| Core = nie można odinstalować | Ogranicza kontrolę użytkownika |

**Podejście `installedByDefault`:**
- JITRACK widoczny na start (bo większość używa)
- Można ukryć (bo ktoś może nie używać)
- Żadnych wartościowań

---

## Edge Cases

### 1. Użytkownik ukryje wszystkie moduły
**Rozwiązanie:** Pokazać komunikat "Włącz przynajmniej jeden moduł w ⚙️" zamiast pustego popupu.

### 2. Nowy moduł dodany przez kolegę
**Rozwiązanie:** 
- Jeśli `installedByDefault: true` → pojawia się u wszystkich
- Jeśli `installedByDefault: false` → pojawia się w "Więcej modułów", ma badge "Nowy"

### 3. Aktualizacja modułu zmienia `installedByDefault`
**Rozwiązanie:** Nie zmieniać nic u istniejących użytkowników (respektujemy `visibleModules`).

### 4. Eksport/import ustawień
**Rozwiązanie:** `visibleModules` jest eksportowane, użytkownik może przenieść konfigurację.

---

## Pliki do Modyfikacji

### Nowe pliki:
1. `src/core/global-storage.ts` - globalne ustawienia użytkownika
2. `src/popup/module-manager.ts` - logika okna zarządzania
3. `src/popup/module-manager.html` - UI okna zarządzania
4. `src/popup/module-manager.css` - style okna zarządzania

### Modyfikacje:
1. `src/types/index.ts` - dodać `installedByDefault`, `tags` do ModuleManifest
2. `src/core/module-loader.ts` - filtrowanie po `visibleModules`
3. `src/popup/popup.ts` - sekcja "Więcej modułów", przycisk zarządzania
4. `src/popup/popup.html` - przycisk "⚙️"
5. `src/popup/popup.css` - style sekcji dodatkowych modułów
6. `src/modules/dark-mode/module.json` - `"installedByDefault": true`
7. `src/modules/jitrack/module.json` - `"installedByDefault": true`
8. `src/modules/kuce-quotes/module.json` - `"installedByDefault": false`

---

## Decyzje do Podjęcia

- [ ] Czy pokazywać badge "Nowy" dla świeżo dodanych modułów?
- [ ] Czy dodać "Ostatnio używane" na górze listy?
- [ ] Czy włączać moduł automatycznie gdy użytkownik go uwidacznia?
- [ ] Czy dodać drag&drop do zmiany kolejności?
- [ ] Czy okno zarządzania to osobny popup czy rozwijana sekcja?

---

## Implementacja Krok po Kroku

### Krok 1: Typy i Manifesty
- Dodać `installedByDefault` do `ModuleManifest`
- Uaktualnić `module.json` wszystkich modułów
- Dodać `GlobalUserSettings` interface

### Krok 2: Global Storage
- Utworzyć `global-storage.ts`
- Metody: `getUserSettings()`, `showModule()`, `hideModule()`
- Logika: pierwsze uruchomienie = użyj `installedByDefault`

### Krok 3: Module Loader
- Odczytaj `visibleModules` z ustawień
- Jeśli `null` - użyj `installedByDefault` z manifestów
- Zapisz wyliczoną listę jako `visibleModules` (inicjalizacja)

### Krok 4: Popup
- Podziel listę na "Widoczne" i "Więcej modułów"
- Dodaj przycisk "⚙️ Zarządzaj"
- Pokaż badge z liczbą ukrytych modułów

### Krok 5: Module Manager
- Lista wszystkich modułów z checkboxami
- Wyszukiwanie (opcjonalnie)
- "Zaznacz wszystkie" / "Odznacz wszystkie"
