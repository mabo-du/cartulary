/** main.ts — Cartulary application entry point.
 *
 * Bootstraps the three-step wizard plus light/dark theme toggle.
 *
 * exports: none (side-effect module)
 * rules:   No accounts, no server, no data stored anywhere.
 *          All operations happen in-browser.
 *          Theme preference persisted in localStorage.
 * agent:   deepseek-v4-flash | 2026-06-07 | Created app entry point with wizard
 */

import './style.css';
import { mountWizard } from './ui/wizard';

const APP_TITLE = 'Cartulary';
const APP_SUBTITLE = 'Spreadsheet → EAD3 XML Finding Aid Converter';
const THEME_STORAGE_KEY = 'cartulary-theme';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  restoreTheme();
  renderApp(app);
});

function renderApp(container: HTMLElement): void {
  const isLight = document.body.classList.contains('theme-light');

  container.innerHTML = `
    <header class="app-header">
      <div class="header-top">
        <div>
          <h1>${APP_TITLE}</h1>
          <p class="subtitle">${APP_SUBTITLE}</p>
        </div>
        <button type="button" class="theme-toggle" id="theme-toggle"
          aria-label="${isLight ? 'Switch to dark theme' : 'Switch to light theme'}"
          title="${isLight ? 'Switch to dark theme' : 'Switch to light theme'}">
          ${isLight ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
    <main class="wizard" id="wizard-container">
      <!-- Wizard rendered by mountWizard() -->
    </main>
    <footer class="app-footer">
      <p>All processing happens in your browser. No data is uploaded to any server.</p>
    </footer>
  `;

  const wizardContainer = document.getElementById('wizard-container');
  if (wizardContainer) {
    mountWizard(wizardContainer);
  }

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

function restoreTheme(): void {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light') {
    document.body.classList.add('theme-light');
  }
}

function toggleTheme(): void {
  const isLight = document.body.classList.toggle('theme-light');
  localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');

  // Update button icon without full re-render
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = isLight ? '🌙' : '☀️';
    btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('title', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }
}
