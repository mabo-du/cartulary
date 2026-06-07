/** main.ts — Cartulary application entry point.
 *
 * Bootstraps the three-step wizard, light/dark theme toggle,
 * and inline help panel.
 *
 * exports: none (side-effect module)
 * rules:   No accounts, no server, no data stored anywhere.
 *          All operations happen in-browser.
 *          Theme preference persisted in localStorage.
 * agent:   deepseek-v4-flash | 2026-06-07 | Added inline help panel
 */

import './style.css';
import { mountWizard } from './ui/wizard';
import { HELP_SECTIONS } from './ui/help-content';

const APP_TITLE = 'Cartulary';
const APP_SUBTITLE = 'Spreadsheet → EAD3 / EAD 2002 XML Finding Aid Converter';
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
        <div class="header-actions">
          <button type="button" class="icon-btn help-btn" id="help-toggle"
            aria-label="Open help panel" title="Help &amp; guidance">
            ?
          </button>
          <button type="button" class="icon-btn theme-toggle" id="theme-toggle"
            aria-label="${isLight ? 'Switch to dark theme' : 'Switch to light theme'}"
            title="${isLight ? 'Switch to dark theme' : 'Switch to light theme'}">
            ${isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
    <main class="wizard" id="wizard-container">
      <!-- Wizard rendered by mountWizard() -->
    </main>
    <footer class="app-footer">
      <p>All processing happens in your browser. No data is uploaded to any server.</p>
    </footer>

    <!-- Help panel (slide-out) -->
    <aside class="help-panel" id="help-panel" role="dialog" aria-label="Help and guidance" aria-hidden="true">
      <div class="help-panel-header">
        <h2>Help &amp; Guidance</h2>
        <button type="button" class="icon-btn help-close" id="help-close"
          aria-label="Close help panel">✕</button>
      </div>
      <nav class="help-nav" aria-label="Help topics">
        ${Object.entries(HELP_SECTIONS).map(([id, section]) =>
          `<button class="help-nav-btn" data-help-id="${id}">${section.title}</button>`
        ).join('')}
      </nav>
      <div class="help-content" id="help-content">
        ${HELP_SECTIONS.overview.content}
      </div>
    </aside>
    <div class="help-overlay" id="help-overlay" aria-hidden="true"></div>
  `;

  const wizardContainer = document.getElementById('wizard-container');
  if (wizardContainer) {
    mountWizard(wizardContainer);
  }

  // Theme toggle
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // Help panel
  const helpToggle = document.getElementById('help-toggle');
  const helpPanel = document.getElementById('help-panel');
  const helpClose = document.getElementById('help-close');
  const helpOverlay = document.getElementById('help-overlay');
  const helpContent = document.getElementById('help-content');

  if (helpToggle && helpPanel && helpOverlay) {
    helpToggle.addEventListener('click', () => {
      helpPanel.setAttribute('aria-hidden', 'false');
      helpOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('help-open');
    });

    const closeHelp = () => {
      helpPanel.setAttribute('aria-hidden', 'true');
      helpOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('help-open');
    };

    if (helpClose) helpClose.addEventListener('click', closeHelp);
    helpOverlay.addEventListener('click', closeHelp);

    // Topic navigation
    document.querySelectorAll('.help-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.helpId;
        if (id && helpContent && HELP_SECTIONS[id]) {
          helpContent.innerHTML = HELP_SECTIONS[id].content;
          // Highlight active topic
          document.querySelectorAll('.help-nav-btn').forEach((b) =>
            b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
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

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = isLight ? '🌙' : '☀️';
    btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('title', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }
}
