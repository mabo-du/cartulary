/** main.ts — Cartulary application entry point.
 *
 * Bootstraps the three-step wizard (Upload → Map → Validate & Export).
 *
 * exports: none (side-effect module)
 * rules:   No accounts, no server, no data stored anywhere.
 *          All operations happen in-browser.
 * agent:   deepseek-v4-flash | 2026-06-07 | Created app entry point with wizard
 */

import './style.css';
import { mountWizard } from './ui/wizard';

const APP_TITLE = 'Cartulary';
const APP_SUBTITLE = 'Spreadsheet → EAD3 XML Finding Aid Converter';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  renderApp(app);
});

function renderApp(container: HTMLElement): void {
  container.innerHTML = `
    <header class="app-header">
      <h1>${APP_TITLE}</h1>
      <p class="subtitle">${APP_SUBTITLE}</p>
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
}
