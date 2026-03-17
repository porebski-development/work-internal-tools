# System Walidacji Modułów - GitHub Workflow

## Cel
Wdrożenie procesu weryfikacji kodu przy dodawaniu nowych modułów przez społeczność, zapewniającego stabilność i jakość rozszerzenia.

## Architektura Workflow

```
┌─────────────┐     PR + testy      ┌──────────┐    PR (release)    ┌──────┐
│ feature/xyz │ ───────────────────►│ develop  │ ─────────────────►│ main │
│ (user fork) │                     │ (admin)  │                   │(prod)│
└─────────────┘                     └──────────┘                   └──────┘
                                           ▲
                                           │
                                    PR + testy
                                           │
                                    ┌──────────┐
                                    │ bugfix/* │
                                    │ hotfix/* │
                                    └──────────┘
```

## Flow Dla Użytkownika (Dodawanie Modułu)

1. Fork repozytorium (publiczne)
2. Stwórz branch: `feature/moj-modul`
3. Dodaj swój moduł w `src/modules/nazwa-modulu/`
4. Commit + Push do swojego forka
5. Utwórz Pull Request do `develop`
6. GitHub Actions uruchamia testy walidacyjne
7. Jeśli testy zielone → admin (reviewer) sprawdza kod
8. Admin approves PR i merge do `develop`
9. Z `develop` okresowo admin robi release do `main`

---

## Zadania Do Wykonania

### ✅ Faza 1: Konfiguracja GitHub (Manualna)

**Branch Protection Rules:**
- [ ] Ustawić ochronę dla `main`:
  - [ ] Require a pull request before merging
  - [ ] Require approvals: 1 (administratora)
  - [ ] Dismiss stale PR approvals when new commits are pushed
  - [ ] Require status checks to pass before merging
  - [ ] Require branches to be up to date before merging
  - [ ] Status checks: `validate`, `type-check`, `lint`, `build`
  - [ ] Restrict pushes that create files: TYLKO administratorzy
  
- [ ] Ustawić ochronę dla `develop`:
  - [ ] Require a pull request before merging
  - [ ] Require approvals: 1
  - [ ] Require status checks to pass
  - [ ] Status checks: `validate`, `type-check`, `lint`, `build`

**Repository Settings:**
- [ ] Ustawić domyślną branch na `develop` (dla nowych PR)
- [ ] Włączyć "Always suggest updating pull request branches"

---

### ✅ Faza 2: GitHub Actions Workflow

**Plik:** `.github/workflows/validate-pr.yml`

Zawiera joby:
1. **type-check** - TypeScript validation
2. **lint** - ESLint
3. **build** - Czy projekt się buduje
4. **validate-module** - Custom walidacja struktury modułu
5. **check-manifest** - Walidacja module.json

---

### ✅ Faza 3: Skrypty Walidacji

#### 3.1 `scripts/validate-module.js`
Sprawdza:
- [ ] Czy `module.json` istnieje w folderze modułu
- [ ] Czy wymagane pola są obecne:
  - `id` (string, kebab-case, bez spacji)
  - `name` (string, min 3 znaki)
  - `icon` (string, emoji lub URL)
  - `description` (string, min 10 znaków)
  - `author` (string, format: @username lub Imię Nazwisko)
  - `version` (string, semver format: x.y.z)
- [ ] Czy ID jest unikalne (nie istnieje w innych modułach)
- [ ] Czy `id` zawiera tylko dozwolone znaki: `a-z0-9-`
- [ ] Czy `id` nie zaczyna się od cyfry
- [ ] Czy plik `index.ts` istnieje
- [ ] Czy nazwa folderu === `id` z manifestu
- [ ] Czy brak zastrzeżonych słów w nazwie (core, system, internal)
- [ ] Czy `installedByDefault` jest boolean (opcjonalne)
- [ ] Czy `tags` jest array stringów (opcjonalne)

#### 3.2 `scripts/check-imports.js`
Sprawdza:
- [ ] Czy moduł nie importuje z innych modułów (tylko z core/types)
- [ ] Czy nie ma cyklicznych zależności
- [ ] Czy używa tylko dozwolonych importów z core

#### 3.3 `scripts/security-check.js` (opcjonalnie)
Sprawdza:
- [ ] Czy kod nie zawiera `eval()`, `innerHTML` z niezaufanych źródeł
- [ ] Czy nie ma hardcoded URLs do zewnętrznych API
- [ ] Czy nie ma console.log w kodzie produkcyjnym (warning)

---

### ✅ Faza 4: Szablony GitHub

#### 4.1 Pull Request Template
**Plik:** `.github/pull_request_template.md`

Zawiera checklistę:
- [ ] Moduł ma poprawny `module.json`
- [ ] Wszystkie wymagane pola są wypełnione
- [ ] Moduł ma własny folder w `src/modules/`
- [ ] Kod przeszedł `npm run type-check`
- [ ] Kod przeszedł `npm run lint`
- [ ] Projekt się buduje: `npm run build`
- [ ] Testowałem moduł lokalnie w Chrome
- [ ] Nie importuję kodu z innych modułów (tylko core/types)
- [ ] Rozumiem, że moduł będzie publiczny pod licencją MIT

#### 4.2 Issue Templates
**Plik:** `.github/ISSUE_TEMPLATE/bug_report.md` i `feature_request.md`

---

### ✅ Faza 5: Dokumentacja Dla Użytkowników

#### 5.1 CONTRIBUTING.md
**Plik:** `CONTRIBUTING.md`

Zawiera:
- Jak forkować repo
- Jak stworzyć branch
- Struktura nowego modułu
- Wymagania dla module.json
- Jak przetestować moduł lokalnie
- Jak utworzyć PR
- Co się dzieje po utworzeniu PR (testy)
- Kryteria akceptacji (review przez admina)

#### 5.2 Aktualizacja MODULES.md
Dodać sekcję "Jawny PR z nowym modułem" z linkiem do CONTRIBUTING.md

---

### ✅ Faza 6: Branch Develop

- [ ] Utworzyć branch `develop` z `main`
- [ ] Ustawić jako domyślną branch dla PR
- [ ] Przenieść aktualne zmiany z `main` do `develop` (jeśli trzeba)

---

## Kryteria Akceptacji (Dla Admina)

Przy review PR, admin sprawdza:

1. **Automatyczne testy:**
   - ✅ Wszystkie GitHub Actions są zielone
   - ✅ Brak błędów TypeScript
   - ✅ Brak błędów ESLint
   - ✅ Build przechodzi

2. **Manualne review kodu:**
   - Czy moduł robi to co deklaruje?
   - Czy kod jest czytelny?
   - Czy nie ma podejrzanych operacji (fetch do dziwnych URLi, eval)
   - Czy UI modułu jest spójne z resztą rozszerzenia

3. **Testy manualne (opcjonalnie):**
   - Checkout branch lokalnie
   - `npm run dev`
   - Test w Chrome czy moduł działa

---

## Skutki Odrzucenia PR

Jeśli testy nie przechodzą:
1. GitHub Actions oznacza PR jako ❌
2. Merge button jest zablokowany
3. Autor PR widzi logi z błędami w "Checks" tab
4. Autor musi naprawić błędy i pushować nowe commity
5. Testy uruchamiają się automatycznie ponownie

---

## Status

📝 **Planowane** - gotowe do implementacji

## Decyzje Do Podjęcia

- [ ] Czy wymagać 1 czy 2 approvals dla merge do main?
- [ ] Czy uruchamiać testy na każdym pushu do PR czy tylko przy otwarciu?
- [ ] Czy dodać auto-merge gdy testy zielone i admin da approve?
- [ ] Czy wymagać signed commits?
- [ ] Czy dodać CODEOWNERS (automatycznie assign admin do review)?

## Pliki Do Utworzenia

```
.github/
├── workflows/
│   └── validate-pr.yml          # Główny workflow CI
├── pull_request_template.md     # Szablon PR z checklistą
└── ISSUE_TEMPLATE/
    ├── bug_report.md
    └── feature_request.md

scripts/
├── validate-module.js           # Walidacja struktury modułu
├── check-manifests.js           # Walidacja module.json
├── check-imports.js             # Sprawdzenie zależności
└── security-check.js            # Podstawowe sprawdzenie bezpieczeństwa

CONTRIBUTING.md                   # Instrukcja dla użytkowników
```

## Przykładowy Output Walidacji

```
✅ Validating module: super-tool
   ✓ module.json exists
   ✓ Required fields: id, name, icon, description, author, version
   ✓ ID format: valid (kebab-case)
   ✓ ID uniqueness: OK (not found in other modules)
   ✓ index.ts exists
   ✓ Folder name matches ID
   ✓ installedByDefault: boolean (optional)
   ✓ tags: array of strings (optional)
   
✅ Validating imports...
   ✓ No forbidden imports detected
   ✓ Only imports from core/types
   
✅ All checks passed!
```

Lub przy błędach:

```
❌ Validating module: super_tool
   ✓ module.json exists
   ❌ ID format: INVALID
      - "super_tool" contains underscore
      - Use kebab-case: "super-tool"
   ❌ ID uniqueness: CONFLICT
      - ID "dark-mode" already exists in src/modules/dark-mode
   
❌ Validation failed!
```
