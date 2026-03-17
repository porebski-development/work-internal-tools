# DevBuddy - Szybki start

**Dla nowych osób w zespole** - minimalne kroki żeby zacząć pracę.

---

## 1. Sprawdź wymagania

```bash
node --version    # >= 18
npm --version     # >= 10
```

Jeśli nie masz - pobierz z https://nodejs.org/ (LTS)

---

## 2. Instalacja

```bash
cd devbuddy-extension-ts
npm install       # ~1-2 minuty
```

---

## 3. Uruchom dev server

```bash
npm run dev
```

To uruchomi Vite w trybie watch. Poczekaj aż zobaczysz:
```
VITE v5.x.x  ready in xxx ms

➜  CRXJS: Load dist as unpacked extension
➜  press h + enter to show help
```

**Ważne:** Po pierwszym uruchomieniu folder `dist/` zostanie utworzony automatycznie.

---

## 4. Załaduj wtyczkę w Chrome

### Krok po kroku:

1. **Otwórz Chrome** i wpisz w pasku adresu:
   ```
   chrome://extensions
   ```

2. **Włącz Developer mode** - przełącznik w prawym górnym rogu:
   ```
   Developer mode [ON]
   ```

3. **Kliknij "Load unpacked"** (lewy górny róg, przycisk z ikoną folderu)

4. **Wybierz folder** - przejdź do:
   ```
   /ścieżka/do/projektu/devbuddy-extension-ts/dist/
   ```
   **Uwaga:** Wybierz folder `dist/`, nie root projektu!

5. **Gotowe!** Wtyczka pojawi się na liście i na pasku narzędzi Chrome (ikona puzzle lub obok paska adresu)

---

## 5. Testuj zmiany

### Edycja kodu:

| Plik | Efekt | Co zrobić w Chrome |
|------|-------|-------------------|
| `src/popup/*` | Popup auto-odświeża | Zamknij i otwórz popup |
| `src/content/*` | Content script przebudowany | F5 na stronie |
| `src/background/*` | Service Worker restartuje | Automatycznie |

### Przykładowy flow:

```bash
# 1. Edytuj src/popup/popup.ts
# 2. Zapisz (Ctrl+S)
# 3. Zobacz zmiany od razu w popupie
```

---

## 6. Przydatne komendy

```bash
# Sprawdź typy TypeScript
npm run type-check

# Build produkcyjny (ręczny)
npm run build

# Stwórz ZIP do release
npm run build:zip

# Sprawdź kod ESLintem
npm run lint
```

---

## ❌ Rozwiązywanie problemów

### "Cannot load extension" / brak folderu dist

Upewnij się że `npm run dev` jest uruchomione i folder `dist/` istnieje:
```bash
ls -la dist/
```

### Wtyczka nie reaguje na zmiany

1. Sprawdź czy Vite działa (terminal nie pokazuje błędów)
2. Kliknij 🔄 (reload) przy wtyczce na `chrome://extensions`
3. Sprawdź konsolę (F12) w popupie lub na stronie

### Port 5173 zajęty

```bash
# Zabij procesy
ps aux | grep -E "(npm|node).*devbuddy" | grep -v grep | awk '{print $2}' | xargs kill -9
```

---

## 📚 Więcej info

Pełna dokumentacja: [README.md](./README.md)

Pytania? Slack: #dev-internal-tools
