# Komunikacja Między Modułami - Propozycja Implementacji

## Status
⏸️ Zawieszone - do wdrożenia po ujednoliceniu działania modułów

## Problem
Jak umożliwić modułom komunikację bez naruszania zasady separacji (moduły nie mogą się bezpośrednio importować).

Konkretny przypadek:
- Moduł `dark-mode` zmienia motyw Jiry
- Moduł `jitrack` chce dostosować kolory przycisku do motywu
- Oba moduły mają być niezależne

---

## Rozwiązania

### 1. Event Bus / Pub-Sub (Rekomendowane)

Core dostarcza szynę zdarzeń. Moduły publikują/subskrybują bez wzajemnej znajomości.

```typescript
// src/core/event-bus.ts
class EventBus {
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  
  emit(event: string, data?: unknown) {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }
  
  on(event: string, fn: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn); // unsubscribe
  }
}

// W ModuleContext dodajemy:
interface ModuleContext {
  storage: Storage;
  moduleId: string;
  notify: (message: string, type?: 'info' | 'success' | 'error') => void;
  events: {
    emit: (event: string, data?: unknown) => void;
    on: (event: string, fn: (data: unknown) => void) => () => void;
  };
}
```

**Użycie:**
```typescript
// Dark Mode - publikuje zmianę
enable() {
  darkMode.inject();
  document.body.setAttribute('data-devbuddy-theme', 'dark');
  this.context.events.emit('devbuddy:theme:changed', { theme: 'dark' });
}

// JITRACK - subskrybuje zmianę
init(context) {
  context.events.on('devbuddy:theme:changed', ({ theme }) => {
    if (theme === 'dark') {
      this.button.classList.add('jitrack-dark');
    } else {
      this.button.classList.remove('jitrack-dark');
    }
  });
}
```

---

### 2. CSS Custom Properties (Dla styli)

Dark mode ustawia zmienne CSS, JITRACK z nich korzysta:

```css
/* Dark Mode Module - ustawia zmienne */
:root {
  --devbuddy-bg-primary: white;
  --devbuddy-text-primary: #1f2937;
  --devbuddy-accent: #f97316;
}

[data-devbuddy-theme="dark"] {
  --devbuddy-bg-primary: #1e2937;
  --devbuddy-text-primary: #f9fafb;
  --devbuddy-accent: #fb923c;
}

/* JITRACK - używa zmiennych */
.jitrack-export-button {
  background: var(--devbuddy-bg-primary);
  border-color: var(--devbuddy-accent);
  color: var(--devbuddy-accent);
}
```

**Zalety:** Zero JavaScript, instant działanie, moduły nadal niezależne.

---

### 3. Data Attributes na body (Najszybsze)

Najprostsze rozwiązanie dla konkretnego przypadku styli:

```typescript
// Dark Mode Module
enable() {
  document.body.setAttribute('data-devbuddy-theme', 'dark');
}
disable() {
  document.body.setAttribute('data-devbuddy-theme', 'light');
}
```

```css
/* JITRACK styles.css */
.jitrack-export-button {
  background: white;
  border-color: #f97316;
}

[data-devbuddy-theme="dark"] .jitrack-export-button {
  background: #1e293b;
  border-color: #fb923c;
}
```

---

## Konwencja Nazewnictwa Eventów

Hierarchiczna struktura (namespace:action:detail):

```typescript
// Globalne eventy systemowe
'devbuddy:theme:changed'        // zmiana motywu
devbuddy:module:enabled'        // moduł włączony
devbuddy:module:disabled'       // moduł wyłączony

// Eventy specyficzne dla modułu (inne mogą słuchać)
'jitrack:export:success'        // jitrack wyeksportował
'jitrack:export:error'          // jitrack błąd
'kuce-quotes:quote:inserted'    // cytat wstawiony
```

**Dlaczego nie `dark_mode_theme_changed`?**
- Bo jutro dodasz `blue-mode` moduł i będziesz musiał zmieniać JITRACK
- Uniwersalne `theme:changed` pozwala każdemu modułowi reagować

---

## Kto Decyduje o Kolorze?

**JITRACK decyduje jak ma wyglądać JITRACK**, dark mode tylko mówi "jest ciemno":

```typescript
// ❌ ZLE: Dark mode wysyła kolory JITRACK
context.events.emit('theme:changed', { 
  jitrackColor: '#1e293b'  // JITRACK zależny od Dark Mode!
});

// ✅ DOBRZE: Dark mode mówi CO się stało
context.events.emit('theme:changed', { theme: 'dark' });

// JITRACK sam decyduje o sobie
context.events.on('theme:changed', ({ theme }) => {
  if (theme === 'dark') {
    this.button.style.background = '#1e293b'; // JITRACK wie co robić
  }
});
```

| Kto decyduje | Dlaczego to złe |
|--------------|-----------------|
| Dark Mode wysyła kolory JITRACK | Sprzęgnięcie - dark mode musi znać kolory innych modułów |
| JITRACK pyta Dark Mode "jaki mam kolor?" | Zależność - JITRACK nie działa bez Dark Mode |
| **JITRACK sam decyduje** ✅ | Niezależność - JITRACK ma swoją paletę, reaguje na stan |

---

## Rekomendacja

**Kombinacja strategii 1 + 3:**

1. **Event Bus** jako infrastruktura w Core (do zdarzeń JS)
2. **Data Attributes** lub **CSS Variables** dla styli (najszybsze, zero JS)

### Implementacja Event Bus Light:

```typescript
// src/core/event-bus.ts
export const eventBus = {
  listeners: new Map<string, Set<(data: unknown) => void>>(),
  
  emit(event: string, data?: unknown) {
    this.listeners.get(event)?.forEach(fn => fn(data));
  },
  
  on(event: string, fn: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }
};
```

### Dla styli JITRACK (CSS):

```css
.jitrack-export-button {
  background: white;
  color: #f97316;
  border: 2px solid #f97316;
}

[data-devbuddy-theme="dark"] .jitrack-export-button {
  background: #1e293b;
  color: #fb923c;
  border-color: #fb923c;
  box-shadow: 0 2px 8px rgba(251, 146, 60, 0.3);
}
```

---

## Architektura Końcowa

```
Dark Mode (źródło prawdy o motywie)
    ↓ emituje 'devbuddy:theme:changed' { theme: 'dark' }
    ↓ ustawia document.body.setAttribute('data-devbuddy-theme', 'dark')
    
Core Event Bus (przekazuje)
    ↓
    
JITRACK (decyduje jak się dostosować)
    - Słucha eventu (opcjonalnie, dla logiki JS)
    - CSS reaguje na [data-devbuddy-theme] (dla styli)
    
[Inne moduły mogą też słuchać tego samego eventu]
```

---

## Pliki do Modyfikacji

1. `src/types/index.ts` - dodać `events` do `ModuleContext`
2. `src/core/event-bus.ts` - nowy plik z implementacją
3. `src/core/module-system.ts` - przekazać `events` do kontekstu
4. `src/modules/dark-mode/index.ts` - emitować event przy zmianie
5. `src/modules/jitrack/index.ts` - słuchać eventu (opcjonalnie) lub użyć CSS
6. `src/modules/jitrack/styles.css` - dodać style dla dark mode

---

## Decyzje do Podjęcia

- [ ] Czy implementować Event Bus teraz czy poczekać?
- [ ] Czy używać CSS Variables czy Data Attributes?
- [ ] Czy eventy powinny być persistowane (localStorage) przy restarcie?
- [ ] Czy dodać `events.off()` (obecnie tylko unsubscriber z `events.on()`)?
