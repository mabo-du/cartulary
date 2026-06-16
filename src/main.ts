/** main.ts — Cartulary application entry point.
 *
 * Bootstraps the three-step wizard, theme toggle, help panel,
 * and first-run onboarding overlay.
 *
 * rules:   No accounts, no server, no data stored anywhere.
 *          Theme and onboarding preference persisted in localStorage.
 */

import './style.css';
import { mountWizard } from './ui/wizard';
import { HELP_SECTIONS } from './ui/help-content';

const APP_TITLE = 'Cartulary';
const APP_SUBTITLE = 'Spreadsheet → EAD3 / EAD 2002 XML Finding Aid Converter';
const THEME_KEY = 'cartulary-theme';
const ONBOARDING_KEY = 'cartulary-onboarded';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  restoreTheme();
  renderApp(app);
  showOnboarding();
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
            aria-label="Open help panel" title="Help &amp; guidance">?</button>
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
      <p class="footer-feedback"><a href="https://github.com/mabo-du/cartulary/issues/new">👋 Questions? Open an issue</a></p>
    </footer>

    <!-- Help panel -->
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
      <div class="help-footer">
        <a href="https://github.com/mabo-du/cartulary/issues/new">👋 Questions? Open an issue</a>
      </div>
    </aside>
    <div class="help-overlay" id="help-overlay" aria-hidden="true"></div>

    <!-- Onboarding overlay -->
    <div class="onboarding-overlay" id="onboarding-overlay" role="dialog" aria-label="Welcome to Cartulary">
      <div class="onboarding-card">
        <h2>Welcome to Cartulary</h2>
        <p class="onboarding-sub">Convert your archival spreadsheets to EAD XML in three steps.</p>
        <div class="onboarding-steps">
          <div class="onboarding-step">
            <span class="onboarding-num">1</span>
            <div>
              <strong>Upload</strong>
              <span>Drop your .xlsx or .csv file — or download the example template to get started.</span>
            </div>
          </div>
          <div class="onboarding-step">
            <span class="onboarding-num">2</span>
            <div>
              <strong>Map</strong>
              <span>Match your spreadsheet columns to EAD fields. Presets for ArchivesSpace, AtoM, and CONTENTdm handle the defaults.</span>
            </div>
          </div>
          <div class="onboarding-step">
            <span class="onboarding-num">3</span>
            <div>
              <strong>Export</strong>
              <span>Validate your data, fix any issues, and download a standards-compliant XML finding aid.</span>
            </div>
          </div>
        </div>
        <p class="onboarding-privacy">✓ Everything runs in your browser. No data leaves your computer.</p>
        <button class="btn btn-primary" id="onboarding-dismiss">Get started</button>
      </div>
    </div>
  `;

  const wizardContainer = document.getElementById('wizard-container');
  if (wizardContainer) mountWizard(wizardContainer);

  // Theme toggle
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

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

    document.querySelectorAll('.help-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.helpId;
        if (id && helpContent && HELP_SECTIONS[id]) {
          helpContent.innerHTML = HELP_SECTIONS[id].content;
          document.querySelectorAll('.help-nav-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }
}

function showOnboarding(): void {
  if (localStorage.getItem(ONBOARDING_KEY)) return;

  const overlay = document.getElementById('onboarding-overlay');
  const dismiss = document.getElementById('onboarding-dismiss');
  if (!overlay || !dismiss) return;

  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('onboarding-open');

  const close = () => {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('onboarding-open');
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  dismiss.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function restoreTheme(): void {
  if (localStorage.getItem(THEME_KEY) === 'light') {
    document.body.classList.add('theme-light');
  }
}

function toggleTheme(): void {
  const isLight = document.body.classList.toggle('theme-light');
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = isLight ? '🌙' : '☀️';
    btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('title', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }
}
