/** wizard.ts — Three-step wizard controller.
 *
 * Mounts the wizard container, manages step transitions, and delegates
 * rendering to step-specific modules.
 *
 * exports:
 *   mountWizard(container): void
 *
 * used_by: main.ts → app bootstrap
 * rules:   Step navigation updates state.currentStep and re-renders.
 *          Step 1 → 2 requires parsed data; Step 2 → 3 requires mappings.
 * agent:   deepseek-v4-flash | 2026-06-07 | Created wizard controller
 */

import { getState, updateState, onStateChange, resetState, type AppState } from './state';
import { PRESETS } from '../lib/presets/config';
import { renderStep1 } from './step-upload';
import { renderStep2 } from './step-map';
import { renderStep3 } from './step-export';

export function mountWizard(container: HTMLElement): void {
  // Register render callback
  onStateChange((state) => {
    renderWizard(container, state);
  });
}

function renderWizard(container: HTMLElement, state: AppState): void {
  container.innerHTML = `
    <nav class="step-indicator" aria-label="Wizard steps">
      <ol>
        <li class="step ${stepClass(state, 1)}" data-step="1">
          ${stepIcon(1, state)} Upload
        </li>
        <li class="step ${stepClass(state, 2)}" data-step="2">
          ${stepIcon(2, state)} Map
        </li>
        <li class="step ${stepClass(state, 3)}" data-step="3">
          ${stepIcon(3, state)} Validate &amp; Export
        </li>
      </ol>
    </nav>
    <section class="step-content" role="region" aria-live="polite">
      ${renderActiveStep(state)}
    </section>
  `;

  // Mount active step's event listeners
  bindStepListeners(state);
}

function stepClass(state: AppState, step: number): string {
  const curr = state.currentStep;
  if (curr === step) return 'active';
  if (curr > step) return 'completed';
  return '';
}

function stepIcon(step: number, state: AppState): string {
  const curr = state.currentStep;
  if (curr > step) return '✓';
  if (curr === step) return '●';
  return '○';
}

function renderActiveStep(state: AppState): string {
  switch (state.currentStep) {
    case 1:
      return renderStep1(state);
    case 2:
      return renderStep2(state);
    case 3:
      return renderStep3(state);
    default:
      return '<p>Unknown step</p>';
  }
}

function bindStepListeners(state: AppState): void {
  switch (state.currentStep) {
    case 1:
      bindStep1Actions();
      break;
    case 2:
      bindStep2Actions();
      break;
    case 3:
      bindStep3Actions();
      break;
  }
}

function bindStep1Actions(): void {
  const dropZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (!dropZone || !fileInput) return;

  // Click to browse
  dropZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await handleFileUpload(file);
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) await handleFileUpload(file);
  });

  // Step 1 → 2 next button
  const nextBtn = document.getElementById('step1-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      updateState({ currentStep: 2 });
    });
  }

  // Step 1 reset (choose different file)
  const resetBtn = document.getElementById('step1-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetState();
    });
  }
}

function bindStep2Actions(): void {
  // Hierarchy mode radio change
  document.querySelectorAll('input[name="hierarchy-mode"]').forEach((el) => {
    el.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      updateState({
        hierarchyMode: val as AppState['hierarchyMode'],
      });
    });
  });

  // Preset selector change
  const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const name = (e.target as HTMLSelectElement).value;
      updatePreset(name);
    });
  }

  // Numbered <c> toggle
  const numberedToggle = document.getElementById('numbered-cs-toggle') as HTMLInputElement;
  if (numberedToggle) {
    numberedToggle.addEventListener('change', () => {
      const state = getState();
      updateState({
        mappings: { ...state.mappings, _numberedCs: numberedToggle.checked ? 'true' : '' },
      });
    });
  }

  // Cache & Carry preset button
  const ccBtn = document.getElementById('cache-and-carry-preset') as HTMLInputElement;
  if (ccBtn) {
    ccBtn.addEventListener('change', () => {
      if (ccBtn.checked) {
        applyCacheAndCarryMapping();
      }
    });
  }

  // "Next: Validate & Export" button
  const nextBtn = document.getElementById('step2-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      updateState({ currentStep: 3 });
    });
  }

  // Control form inputs
  ['agency-name', 'record-id', 'finding-aid-title'].forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) {
      el.addEventListener('input', () => {
        updateState({
          controlData: {
            ...getState().controlData,
            [id.replace(/-./g, (s) => s[1].toUpperCase())]: el.value,
          },
        });
      });
    }
  });

  // Column mapping selects
  document.querySelectorAll('.field-mapping select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const field = (sel as HTMLSelectElement).dataset.eadField;
      const col = (e.target as HTMLSelectElement).value || null;
      if (field) {
        updateState({
          mappings: { ...getState().mappings, [field]: col },
        });
      }
    });
  });
}

function bindStep3Actions(): void {
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const state = getState();
      if (!state.parsedRows || state.parsedRows.length === 0) return;

      // Build tree
      const { buildTreeFromLevels } = await import(
        '../lib/hierarchy/level-column'
      );
      const { trees, warnings } = buildTreeFromLevels(state.parsedRows);

      // Run validation
      const { validateTree } = await import('../lib/validator/rules');
      const errors = validateTree(state.parsedRows, state.preset);

      if (errors.some((e) => e.severity === 'error')) {
        updateState({ validationErrors: errors, treeWarnings: warnings });
        return;
      }

      // Determine component convention from toggle
      const numberedCs = state.mappings['_numberedCs'] === 'true';
      const presetWithConvention = {
        ...state.preset,
        componentConvention: numberedCs ? 'numbered-c' as const : 'generic-c' as const,
      };

      // Generate XML — dispatch to correct serializer per preset
      let xml: string;
      if (state.presetName === 'atom') {
        const { generateEAD2002 } = await import('../lib/generator/ead2002');
        xml = generateEAD2002(trees, presetWithConvention, state.controlData);
      } else {
        const { generateEAD3 } = await import('../lib/generator/ead3');
        xml = generateEAD3(trees, presetWithConvention, state.controlData);
      }

      // Trigger download
      downloadXml(xml, `${state.controlData.recordId || 'finding-aid'}.xml`);

      updateState({
        validationErrors: errors,
        treeWarnings: warnings,
      });
    });
  }

  // "Back to mapping" button
  const backBtn = document.getElementById('step3-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      updateState({ currentStep: 2 });
    });
  }
}

async function handleFileUpload(file: File): Promise<void> {
  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!validExts.includes(ext)) {
    alert(`Unsupported file type "${ext}". Use .xlsx, .xls, or .csv.`);
    return;
  }

  const content = document.getElementById('step-content');
  if (content) {
    content.innerHTML = `<p class="processing">Parsing <strong>${file.name}</strong>...</p>`;
  }

  // Yield to UI thread before starting potentially heavy parse
  await new Promise((r) => setTimeout(r, 50));

  try {
    let rows: Record<string, unknown>[];
    let columns: string[];

    // Try Web Worker for large files (>500 rows), fall back to main thread
    if (file.size > 50_000 && typeof Worker !== 'undefined') {
      try {
        const result = await parseInWorker(file);
        rows = result.rows;
        columns = result.columns;
      } catch {
        // Worker failed — fall back to main-thread parsing
        const { parseSpreadsheet } = await import('../lib/parser/spreadsheet');
        rows = await parseSpreadsheet(file) as unknown as Record<string, unknown>[];
        columns = rows.length > 0
          ? Object.keys(rows[0]).filter((k) => k !== '__rowNum__')
          : [];
      }
    } else {
      const { parseSpreadsheet } = await import('../lib/parser/spreadsheet');
      rows = await parseSpreadsheet(file) as unknown as Record<string, unknown>[];
      columns = rows.length > 0
        ? Object.keys(rows[0]).filter((k) => k !== '__rowNum__')
        : [];
    }

    updateState({
      fileName: file.name,
      parsedRows: rows as any[],
      columns,
      currentStep: 2,
      mappings: {},
      validationErrors: [],
    });
  } catch (err) {
    console.error('Parse failed:', err);
    if (content) {
      content.innerHTML = `<p class="error">Failed to parse file: ${(err as Error).message}</p>`;
    }
  }
}

/** Parse a file in a Web Worker to keep the UI responsive. */
function parseInWorker(
  file: File,
): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../lib/parser/parse-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent) => {
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data);
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    file.arrayBuffer().then((buffer) => {
      worker.postMessage({ file: buffer, fileName: file.name }, [buffer]);
    });
  });
}

/** Pre-fill mappings for Cache & Carry CSV exports. */
function applyCacheAndCarryMapping(): void {
  const state = getState();
  const cols = state.columns;
  if (cols.length === 0) return;

  // Cache & Carry field → EAD field mapping
  const ccMapping: Record<string, string> = {
    accession_number: 'unitid',
    object_name_aat_uri: 'unittitle',
    type_of_object: 'unittitle',
    description: 'scopecontent',
    materials_techniques: 'physdesc',
    measurements: 'physdesc',
    created_at: 'unitdate',
    nagpra_flagged: 'accessrestrict',
    secret_sacred_flag: 'accessrestrict',
    exhibition_consent_granted: 'userestrict',
    research_consent_granted: 'userestrict',
  };

  const mappings: Record<string, string | null> = {};

  for (const [eadField, ccField] of Object.entries(ccMapping)) {
    // Find the column that matches (case-insensitive, partial match)
    const match = cols.find(
      (c) => c.toLowerCase().includes(ccField.toLowerCase()),
    );
    mappings[eadField] = match || null;
  }

  // Auto-detect hierarchy mode from columns
  const hasLevelCol = cols.some((c) => c.toLowerCase() === 'level');
  const hasParentId = cols.some((c) => c.toLowerCase() === 'parent_id');
  const hasDottedId = cols.some((c) => c.toLowerCase() === 'id' && !hasParentId);

  let hierarchyMode = state.hierarchyMode;
  if (hasParentId) hierarchyMode = 'parent-id';
  else if (hasDottedId) hierarchyMode = 'dotted-ids';
  else if (hasLevelCol) hierarchyMode = 'level-column';

  updateState({ mappings, hierarchyMode });
}

function updatePreset(name: string): void {
  const preset = PRESETS[name] || PRESETS.archivesspace;
  updateState({ presetName: name, preset });
}

function downloadXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
