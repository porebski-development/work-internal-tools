import type { Module, ModuleContext, ModuleUI } from '../../types';
import { JiraExtractor } from './extractor';
import { DEFAULT_CONFIG } from './types';

/**
 * JITRACK Module - TypeScript v2
 * Eksportuje taski Jiry do JITRACK
 * 
 * WAŻNE: Ten moduł jest całkowicie niezależny!
 * Nie importuje niczego z innych modułów ani z core poza typami.
 */

// Import metadanych z manifestu - jedno źródło prawdy!
import manifest from './module.json';

// Import CSS jako string (inline) - działa identycznie w dev i build
import jitrackStyles from './styles.css?inline';

// Configuration
const AUTH_TOKEN_KEY = 'jitrack_auth_token';

/**
 * Get auth token from server
 */
async function getAuthToken(port: number): Promise<string | null> {
  try {
    const response = await fetch(`http://localhost:${port}/api/config`, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json() as { token: string };
      const token = data.token;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      return token;
    }
  } catch (e) {
    console.error('[JITRACK] Failed to get auth token:', e);
  }
  return null;
}

/**
 * Show notification toast
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const existing = document.getElementById('jitrack-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'jitrack-notification';
  notification.className = type;
  notification.textContent = message;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    color: white;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: jitrack-slide-in 0.3s ease-out;
    max-width: 400px;
    word-wrap: break-word;
    background: ${type === 'success' ? '#36b37e' : type === 'error' ? '#de350b' : '#0052cc'};
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'jitrack-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

/**
 * Check if JITRACK server is available
 */
async function findJitrackServer(): Promise<number | null> {
  for (const port of DEFAULT_CONFIG.ports) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`http://localhost:${port}/health`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          return port;
        }
      }
    } catch {
      // Server not available on this port
    }
  }
  return null;
}

/**
 * Send import request to server
 */
async function sendImportRequest(
  port: number, 
  issueData: ReturnType<typeof JiraExtractor.extractAll>,
  authToken: string | null
): Promise<Response> {
  const response = await fetch(`http://localhost:${port}/api/import`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Jitrack-Token': authToken || 'development'
    },
    body: JSON.stringify({
      issueKey: issueData!.issueKey,
      summary: issueData!.summary,
      project: issueData!.project,
      url: issueData!.url,
      estimatedHours: issueData!.estimatedHours
    })
  });
  return response;
}

/**
 * Export task to JITRACK
 */
async function exportToJitrack(
  issueData: ReturnType<typeof JiraExtractor.extractAll>, 
  button: HTMLButtonElement
): Promise<void> {
  const originalHTML = button.innerHTML;
  button.innerHTML = '⏳ Exporting...';
  button.disabled = true;

  try {
    const port = await findJitrackServer();

    if (!port) {
      showNotification('❌ JITRACK not running. Start jitrack in terminal first.', 'error');
      button.innerHTML = originalHTML;
      button.disabled = false;
      return;
    }

    // Get auth token
    let authToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authToken) {
      authToken = await getAuthToken(port);
    }

    // Try to send request
    let response = await sendImportRequest(port, issueData, authToken);

    // If unauthorized, get new token and retry
    if (response.status === 401) {
      console.log('[JITRACK] Token expired, fetching new one...');
      authToken = await getAuthToken(port);
      
      if (authToken) {
        response = await sendImportRequest(port, issueData, authToken);
      } else {
        showNotification('❌ Failed to get auth token', 'error');
        button.innerHTML = originalHTML;
        button.disabled = false;
        return;
      }
    }

    if (response.ok) {
      const estimateInfo = issueData!.estimatedHours ? ` (${issueData!.estimatedHours}h)` : '';
      showNotification(`✅ Exported ${issueData!.issueKey}${estimateInfo} to JITRACK!`, 'success');
      button.innerHTML = '✓ Exported';
      button.style.backgroundColor = '#36b37e';

      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.disabled = false;
        button.style.backgroundColor = '';
      }, 3000);
    } else {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      showNotification(`❌ Export failed: ${error.error}`, 'error');
      button.innerHTML = originalHTML;
      button.disabled = false;
    }
  } catch (error) {
    showNotification(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    button.innerHTML = originalHTML;
    button.disabled = false;
  }
}

/**
 * Wstrzykuje style modułu do strony
 */
function injectStyles(): void {
  if (document.getElementById('jitrack-styles')) {
    return;
  }
  
  if (!document.head) {
    setTimeout(() => injectStyles(), 100);
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'jitrack-styles';
  style.textContent = jitrackStyles;
  
  document.head.appendChild(style);
}

class JitrackUI {
  private button: HTMLButtonElement | null = null;

  inject(onExportCallback: (button: HTMLButtonElement) => void): boolean {
    this.remove();

    const containerSelectors = [
      '#stalker .aui-page-header-actions',
      '.command-bar .ops-cont',
      '#viewissuesidebar',
      'body'
    ];

    let container: Element | null = null;
    for (const selector of containerSelectors) {
      container = document.querySelector(selector);
      if (container) break;
    }

    if (!container) return false;

    this.button = document.createElement('button');
    this.button.id = 'jitrack-export-btn';
    this.button.className = 'jitrack-export-button';
    
    // Logo + text
    const logoUrl = chrome.runtime.getURL('logo.png');
    this.button.innerHTML = `<img src="${logoUrl}" alt="JITRACK" style="width:36px;height:36px;margin-right:10px;object-fit:contain;"> Export to JITRACK`;

    this.button.addEventListener('click', async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.button) {
        await onExportCallback(this.button);
      }
    });

    if (container.tagName === 'BODY') {
      this.button.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999;';
    }

    container.appendChild(this.button);
    return true;
  }

  remove(): void {
    if (this.button) {
      this.button.remove();
      this.button = null;
    }
    const existing = document.getElementById('jitrack-export-btn');
    if (existing) existing.remove();
  }
}

// Singleton
const jitrackUI = new JitrackUI();

// Eksport modułu - rozwija metadane z manifest.json i dodaje logikę
const JitrackModule: Module = {
  ...manifest,

  async init(context: ModuleContext): Promise<void> {
    console.log('[JITRACK] Module init v2');
    const enabled = await context.storage.get('enabled', true);
    console.log('[JITRACK] Enabled:', enabled, 'Issue key:', JiraExtractor.extractIssueKey());

    // Wstrzyknij style
    injectStyles();

    if (enabled && JiraExtractor.extractIssueKey()) {
      const issueData = JiraExtractor.extractAll();
      if (issueData) {
        const injected = jitrackUI.inject((btn) => exportToJitrack(issueData, btn));
        console.log('[JITRACK] Button injected:', injected);
      }
    } else {
      console.log('[JITRACK] Button not injected - disabled or no issue key');
    }

    // Watch for navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        jitrackUI.remove();
        setTimeout(() => {
          const newIssueData = JiraExtractor.extractAll();
          if (newIssueData) {
            jitrackUI.inject((btn) => exportToJitrack(newIssueData, btn));
          }
        }, 1000);
      }
    }).observe(document, { subtree: true, childList: true });

    // Periodic check
    setInterval(() => {
      if (!document.getElementById('jitrack-export-btn')) {
        const checkIssueData = JiraExtractor.extractAll();
        if (checkIssueData) {
          jitrackUI.inject((btn) => exportToJitrack(checkIssueData, btn));
        }
      }
    }, 5000);
  },

  getUI(): ModuleUI {
    return {
      type: 'toggle',
      label: 'Pokaż przycisk eksportu',
      storageKey: 'enabled',
      defaultValue: true
    };
  },

  enable(): void {
    const issueData = JiraExtractor.extractAll();
    if (issueData) {
      jitrackUI.inject((btn) => exportToJitrack(issueData, btn));
    }
  },

  disable(): void {
    jitrackUI.remove();
  }
};

export default JitrackModule;
