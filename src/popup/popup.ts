/**
 * DevBuddy Popup - TypeScript
 * Dynamicznie buduje UI z modułów
 */

import { globalStorage } from '../core/storage';
import { getUserSettings, showModule } from '../core/global-storage';
import { getAllDiscoveredModules } from '../core/module-loader';
import { showModuleManager } from './module-manager';
import type { ModuleUI, ModuleManifest } from '../types';

// Container na moduły
const container = document.getElementById('modules-container');
if (!container) {
  throw new Error('Container not found');
}

interface ModuleUIConfig extends ModuleUI {
  moduleId: string;
  moduleName: string;
  moduleIcon: string;
  moduleDescription: string;
  moduleAuthor: string;
  installedByDefault?: boolean;
}

interface ModuleInfo {
  manifest: ModuleManifest;
  isVisible: boolean;
}

/**
 * Pobiera konfigurację UI od wszystkich widocznych modułów
 */
async function getModulesUI(): Promise<ModuleUIConfig[]> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return [];
    
    // Sprawdź czy strona obsługuje content scripts (tylko http/https)
    const url = tab.url || '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return [];
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getModulesUI' });
    return response?.modules || [];
  } catch (error) {
    // Content script nie jest załadowany (normalne po restarcie lub na nowej karcie)
    console.log('[DevBuddy] Content script not ready, modules will load after page refresh');
    return [];
  }
}

/**
 * Pobiera informacje o wszystkich modułach (widocznych i ukrytych)
 */
async function getAllModulesInfo(): Promise<ModuleInfo[]> {
  try {
    const discovered = getAllDiscoveredModules();
    const settings = await getUserSettings();
    
    return discovered.map(d => ({
      manifest: d.manifest,
      isVisible: settings.visibleModules?.includes(d.manifest.id) ?? 
                 (d.manifest.installedByDefault === true)
    }));
  } catch (error) {
    console.error('[DevBuddy] Failed to get all modules:', error);
    return [];
  }
}

/**
 * Tworzy element toggle
 */
function createToggle(moduleConfig: ModuleUIConfig, currentValue: boolean): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section';

  const header = document.createElement('div');
  header.className = 'module-header';

  const icon = document.createElement('span');
  icon.className = 'module-icon';
  icon.textContent = moduleConfig.moduleIcon;

  const title = document.createElement('h2');
  title.textContent = moduleConfig.moduleName;

  header.appendChild(icon);
  header.appendChild(title);

  const description = document.createElement('p');
  description.className = 'hint';
  description.textContent = moduleConfig.moduleDescription;

  const author = document.createElement('p');
  author.className = 'module-author';
  author.textContent = `by ${moduleConfig.moduleAuthor}`;

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'toggle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = currentValue;

  const slider = document.createElement('span');
  slider.className = 'slider';

  const labelText = document.createElement('span');
  labelText.className = 'label-text';
  labelText.textContent = currentValue ? 'Włączony' : 'Wyłączony';

  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(slider);
  toggleLabel.appendChild(labelText);

  // Obsługa zmiany
  checkbox.addEventListener('change', async () => {
    labelText.textContent = checkbox.checked ? 'Włączony' : 'Wyłączony';
    
    const storageKey = `${moduleConfig.moduleId}_${moduleConfig.storageKey || 'enabled'}`;
    await globalStorage.set(storageKey, checkbox.checked);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleModule',
        moduleId: moduleConfig.moduleId,
        enabled: checkbox.checked
      });
    }
  });

  section.appendChild(header);
  section.appendChild(description);
  section.appendChild(author);
  section.appendChild(toggleLabel);

  return section;
}

/**
 * Tworzy element przycisku
 */
function createButton(moduleConfig: ModuleUIConfig): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section';

  const header = document.createElement('div');
  header.className = 'module-header';

  const icon = document.createElement('span');
  icon.className = 'module-icon';
  icon.textContent = moduleConfig.moduleIcon;

  const title = document.createElement('h2');
  title.textContent = moduleConfig.moduleName;

  header.appendChild(icon);
  header.appendChild(title);

  const description = document.createElement('p');
  description.className = 'hint';
  description.textContent = moduleConfig.moduleDescription;

  const author = document.createElement('p');
  author.className = 'module-author';
  author.textContent = `by ${moduleConfig.moduleAuthor}`;

  const button = document.createElement('button');
  button.className = 'btn-primary';
  button.textContent = moduleConfig.label;

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '⏳ ...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('No active tab');
      }

      // Generyczne wywołanie akcji modułu przez content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'executeModuleAction',
        moduleId: moduleConfig.moduleId
      }) as { success: boolean; message?: string };

      if (response?.success) {
        button.textContent = '✅ ' + (response.message || 'Gotowe!');
        setTimeout(() => window.close(), 500);
      } else {
        throw new Error(response?.message || 'Błąd');
      }
    } catch (error) {
      console.error('[Popup] Action failed:', error);
      button.textContent = '❌ Błąd';
    }

    setTimeout(() => {
      button.textContent = moduleConfig.label;
      button.disabled = false;
    }, 2000);
  });

  section.appendChild(header);
  section.appendChild(description);
  section.appendChild(author);
  section.appendChild(button);

  return section;
}

/**
 * Tworzy element ukrytego modułu (do sekcji "Więcej modułów")
 */
function createHiddenModuleItem(moduleInfo: ModuleInfo): HTMLElement {
  const item = document.createElement('div');
  item.className = 'hidden-item';

  const name = document.createElement('span');
  name.className = 'hidden-item-name';
  name.textContent = `${moduleInfo.manifest.icon} ${moduleInfo.manifest.name}`;

  const btnShow = document.createElement('button');
  btnShow.className = 'btn-show-module';
  btnShow.textContent = 'Pokaż';
  
  btnShow.addEventListener('click', async () => {
    await showModule(moduleInfo.manifest.id);
    // Przeładuj popup
    renderModules();
  });

  item.appendChild(name);
  item.appendChild(btnShow);

  return item;
}

/**
 * Renderuje moduły
 */
async function renderModules(): Promise<void> {
  if (!container) {
    console.error('[Popup] Container not found!');
    return;
  }
  
  try {
    console.log('[Popup] Fetching modules...');
    const modules = await getModulesUI();
    const allModules = await getAllModulesInfo();
    const hiddenModules = allModules.filter(m => !m.isVisible);
    
    console.log('[Popup] Got modules:', modules);
    console.log('[Popup] Hidden modules:', hiddenModules);
    
    container.innerHTML = '';

    if (modules.length === 0 && hiddenModules.length === 0) {
      container.innerHTML = `
        <div class="section">
          <p class="hint" style="text-align: center; color: #999;">
            Brak dostępnych modułów
          </p>
        </div>
      `;
      return;
    }

    // Renderuj widoczne moduły
    if (modules.length > 0) {
      // Pobierz zapisane ustawienia
      for (const mod of modules) {
        const storageKey = `${mod.moduleId}_${mod.storageKey || 'enabled'}`;
        mod.currentValue = await globalStorage.get(storageKey, mod.defaultValue ?? true);
      }

      // Renderuj każdy moduł
      modules.forEach((mod, index) => {
        let element: HTMLElement;
        
        if (mod.type === 'toggle') {
          element = createToggle(mod, mod.currentValue as boolean);
        } else if (mod.type === 'button') {
          element = createButton(mod);
        } else {
          element = document.createElement('div');
          element.className = 'section';
          element.innerHTML = `<h2>${mod.moduleIcon} ${mod.moduleName}</h2><p class="hint">${mod.moduleDescription}</p>`;
        }

        container.appendChild(element);

        // Dodaj divider (oprócz ostatniego)
        if (index < modules.length - 1) {
          const divider = document.createElement('div');
          divider.className = 'divider';
          container.appendChild(divider);
        }
      });
    }

    // Renderuj sekcję ukrytych modułów
    const hiddenSection = document.getElementById('hidden-modules-section');
    const hiddenCount = document.getElementById('hidden-count');
    const hiddenList = document.getElementById('hidden-modules-list');
    
    if (hiddenSection && hiddenCount && hiddenList && hiddenModules.length > 0) {
      hiddenSection.style.display = 'block';
      hiddenCount.textContent = hiddenModules.length.toString();
      
      hiddenList.innerHTML = '';
      hiddenModules.forEach(mod => {
        hiddenList.appendChild(createHiddenModuleItem(mod));
      });
      
      // Obsługa przycisku "Pokaż"
      const toggleBtn = document.getElementById('toggle-hidden-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const isVisible = hiddenList.style.display !== 'none';
          hiddenList.style.display = isVisible ? 'none' : 'block';
          toggleBtn.textContent = isVisible ? 'Pokaż' : 'Ukryj';
        });
      }
    } else if (hiddenSection) {
      hiddenSection.style.display = 'none';
    }

  } catch (error) {
    console.error('[Popup] Error rendering modules:', error);
    container.innerHTML = `
      <div class="section">
        <p class="hint" style="text-align: center; color: #d32f2f;">
          ❌ Błąd ładowania modułów<br>
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    `;
  }
}

// Obsługa przycisku zarządzania modułami
const manageBtn = document.getElementById('manage-modules-btn');
if (manageBtn) {
  manageBtn.addEventListener('click', async () => {
    // Pokaż module manager overlay
    await showModuleManager((hasChanges) => {
      // Callback po zamknięciu - odśwież listę modułów
      renderModules();
      
      // Pokaż powiadomienie jeśli były zmiany
      if (hasChanges) {
        showNotification('Przeładuj stronę, aby zastosować zmiany', 'info');
      }
    });
  });
}

/**
 * Pokazuje powiadomienie (toast) w popupie
 */
function showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification-toast ${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Usuń po 4 sekundach
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';
    notification.style.transition = 'all 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Inicjalizacja
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Popup] DOM loaded, rendering modules...');
    renderModules();
  });
} else {
  console.log('[Popup] DOM already loaded, rendering modules...');
  renderModules();
}
