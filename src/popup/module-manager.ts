/**
 * Module Manager - zarządzanie widocznością modułów
 * 
 * Otwierane z popupu przez przycisk ⚙️
 */

import { getAllDiscoveredModules } from '../core/module-loader';
import { getUserSettings, showModule, hideModule, resetToDefaults } from '../core/global-storage';
import type { ModuleManifest } from '../types';

/**
 * Restartuje service worker aby załadować nowe background moduły
 */
async function restartServiceWorker(): Promise<void> {
  try {
    // Poinformuj background o konieczności restartu
    await chrome.runtime.sendMessage({ action: 'reloadExtension' });
  } catch {
    // Jeśli background nie odpowiada, użyj bezpośredniego reload
    chrome.runtime.reload();
  }
}

interface ModuleItem {
  manifest: ModuleManifest;
  isVisible: boolean;
}

let allModules: ModuleItem[] = [];
let onCloseCallback: ((hasChanges: boolean) => void) | null = null;
let hasChanges = false;

/**
 * Renderuje listę modułów w module managerze
 */
function renderModuleList(container: HTMLElement, filter: string = ''): void {
  container.innerHTML = '';
  
  const filtered = allModules.filter(m => {
    const searchText = filter.toLowerCase();
    return m.manifest.name.toLowerCase().includes(searchText) ||
           m.manifest.description.toLowerCase().includes(searchText) ||
           m.manifest.tags?.some(tag => tag.toLowerCase().includes(searchText));
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="mm-empty">
        <p>Nie znaleziono modułów</p>
      </div>
    `;
    return;
  }
  
  // Grupuj na widoczne i ukryte
  const visible = filtered.filter(m => m.isVisible);
  const hidden = filtered.filter(m => !m.isVisible);
  
  // Sekcja widocznych
  if (visible.length > 0) {
    const visibleHeader = document.createElement('div');
    visibleHeader.className = 'mm-section-header';
    visibleHeader.textContent = `Widoczne (${visible.length})`;
    container.appendChild(visibleHeader);
    
    visible.forEach(module => {
      container.appendChild(createModuleItem(module));
    });
  }
  
  // Sekcja ukrytych
  if (hidden.length > 0) {
    const hiddenHeader = document.createElement('div');
    hiddenHeader.className = 'mm-section-header';
    hiddenHeader.textContent = `Ukryte (${hidden.length})`;
    container.appendChild(hiddenHeader);
    
    hidden.forEach(module => {
      container.appendChild(createModuleItem(module));
    });
  }
}

/**
 * Tworzy element pojedynczego modułu
 */
function createModuleItem(module: ModuleItem): HTMLElement {
  const item = document.createElement('div');
  item.className = `mm-item ${module.isVisible ? 'visible' : 'hidden'}`;
  
  // Ikona
  const icon = document.createElement('span');
  icon.className = 'mm-item-icon';
  icon.textContent = module.manifest.icon;
  
  // Informacje
  const info = document.createElement('div');
  info.className = 'mm-item-info';
  
  const name = document.createElement('div');
  name.className = 'mm-item-name';
  name.textContent = module.manifest.name;
  
  const desc = document.createElement('div');
  desc.className = 'mm-item-desc';
  desc.textContent = module.manifest.description;
  
  const author = document.createElement('div');
  author.className = 'mm-item-author';
  author.textContent = `by ${module.manifest.author}`;
  
  info.appendChild(name);
  info.appendChild(desc);
  info.appendChild(author);
  
  // Tagi (opcjonalnie)
  if (module.manifest.tags && module.manifest.tags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'mm-item-tags';
    tags.textContent = module.manifest.tags.join(' • ');
    info.appendChild(tags);
  }
  
  // Przycisk akcji
  const actionBtn = document.createElement('button');
  actionBtn.className = `mm-item-btn ${module.isVisible ? 'hide' : 'show'}`;
  actionBtn.textContent = module.isVisible ? 'Ukryj' : 'Pokaż';
  
  actionBtn.addEventListener('click', async () => {
    if (module.isVisible) {
      await hideModule(module.manifest.id);
      module.isVisible = false;
    } else {
      await showModule(module.manifest.id);
      module.isVisible = true;
    }
    
    hasChanges = true;
    
    // Odśwież listę
    const list = document.getElementById('mm-list');
    const searchInput = document.getElementById('mm-search') as HTMLInputElement;
    if (list) {
      renderModuleList(list, searchInput?.value || '');
    }
    
    // Powiadom o zmianie
    if (onCloseCallback) {
      onCloseCallback(false);
    }
  });
  
  item.appendChild(icon);
  item.appendChild(info);
  item.appendChild(actionBtn);
  
  return item;
}

/**
 * Inicjalizuje i pokazuje Module Manager
 */
export async function showModuleManager(onClose: (hasChanges: boolean) => void): Promise<void> {
  onCloseCallback = onClose;
  hasChanges = false;
  
  // Pobierz wszystkie moduły
  const discovered = getAllDiscoveredModules();
  const settings = await getUserSettings();
  
  allModules = discovered.map(d => ({
    manifest: d.manifest,
    isVisible: settings.visibleModules?.includes(d.manifest.id) ?? 
               (d.manifest.installedByDefault === true)
  }));
  
  // Znajdź lub utwórz container
  let manager = document.getElementById('module-manager');
  if (!manager) {
    manager = document.createElement('div');
    manager.id = 'module-manager';
    manager.className = 'module-manager';
    document.body.appendChild(manager);
  }
  
  // Wyczyść i zbuduj UI
  manager.innerHTML = '';
  manager.style.display = 'flex';
  
  // Header
  const header = document.createElement('div');
  header.className = 'mm-header';
  
  const title = document.createElement('h2');
  title.textContent = 'Zarządzaj modułami';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'mm-close';
  closeBtn.innerHTML = '✕';
  closeBtn.title = 'Zamknij';
  closeBtn.addEventListener('click', () => {
    manager!.style.display = 'none';
    onClose(hasChanges);
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Search
  const searchContainer = document.createElement('div');
  searchContainer.className = 'mm-search-container';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'mm-search';
  searchInput.placeholder = '🔍 Szukaj modułu...';
  searchInput.className = 'mm-search';
  
  searchInput.addEventListener('input', (e) => {
    const list = document.getElementById('mm-list');
    if (list) {
      renderModuleList(list, (e.target as HTMLInputElement).value);
    }
  });
  
  searchContainer.appendChild(searchInput);
  
  // Stats
  const stats = document.createElement('div');
  stats.className = 'mm-stats';
  const visibleCount = allModules.filter(m => m.isVisible).length;
  stats.textContent = `${visibleCount} z ${allModules.length} modułów widocznych`;
  
  // Lista
  const list = document.createElement('div');
  list.id = 'mm-list';
  list.className = 'mm-list';
  renderModuleList(list);
  
  // Footer z akcjami
  const footer = document.createElement('div');
  footer.className = 'mm-footer';
  
  const resetBtn = document.createElement('button');
  resetBtn.className = 'mm-btn-reset';
  resetBtn.textContent = 'Przywróć domyślne';
  resetBtn.addEventListener('click', async () => {
    if (confirm('Przywrócić domyślne ustawienia widoczności?')) {
      const discovered = getAllDiscoveredModules();
      await resetToDefaults(discovered.map(d => ({
        id: d.manifest.id,
        installedByDefault: d.manifest.installedByDefault
      })));
      
      hasChanges = true;
      
      // Odśwież
      showModuleManager(onClose);
    }
  });
  
  const doneBtn = document.createElement('button');
  doneBtn.className = 'mm-btn-done';
  doneBtn.textContent = 'Gotowe';
  doneBtn.addEventListener('click', async () => {
    manager!.style.display = 'none';
    
    // Jeśli były zmiany, restartuj service worker aby załadować nowe background moduły
    if (hasChanges) {
      await restartServiceWorker();
    }
    
    onClose(hasChanges);
  });
  
  footer.appendChild(resetBtn);
  footer.appendChild(doneBtn);
  
  // Złóż wszystko
  manager.appendChild(header);
  manager.appendChild(searchContainer);
  manager.appendChild(stats);
  manager.appendChild(list);
  manager.appendChild(footer);
}
