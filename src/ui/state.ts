/** state.ts — Application state management for the Cartulary wizard.
 *
 * exports:
 *   AppState — Singleton state object with reactive update callback
 *   resetState() — Clear all state (new file)
 *   updateState(partial) — Merge partial state and trigger render
 *   getState() — Current state snapshot
 *   onStateChange(cb) — Register render callback
 *
 * used_by: all ui/ step modules
 * rules:   Only one state update per user action. State is the source of truth.
 * agent:   deepseek-v4-flash | 2026-06-07 | Created wizard state management
 */

import type {
  ParsedRow,
  PresetConfig,
  HierarchyMode,
  ControlFormData,
  ValidationError,
} from '../types';
import { PRESETS } from '../lib/presets/config';

export interface AppState {
  currentStep: 1 | 2 | 3;
  fileName: string | null;
  parsedRows: ParsedRow[] | null;
  columns: string[];
  presetName: string;
  preset: PresetConfig;
  mappings: Record<string, string | null>;
  hierarchyMode: HierarchyMode;
  controlData: ControlFormData;
  validationErrors: ValidationError[];
  treeWarnings: { rowIndex: number; message: string }[];
  treeErrors: { rowIndex: number; message: string }[];
}

let state: AppState = defaultState();
let renderCallback: ((s: AppState) => void) | null = null;

function defaultState(): AppState {
  const preset = PRESETS.archivesspace;
  return {
    currentStep: 1,
    fileName: null,
    parsedRows: null,
    columns: [],
    presetName: 'archivesspace',
    preset,
    mappings: {},
    hierarchyMode: 'level-column',
    controlData: {
      agencyName: '',
      recordId: crypto.randomUUID(),
      findingAidTitle: '',
      languageCode: 'eng',
      scriptCode: 'Latn',
    },
    validationErrors: [],
    treeWarnings: [],
    treeErrors: [],
  };
}

export function resetState(): void {
  state = defaultState();
  notify();
}

export function updateState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  notify();
}

export function getState(): AppState {
  return state;
}

export function onStateChange(cb: (s: AppState) => void): void {
  renderCallback = cb;
  // Immediate render with current state
  cb(state);
}

function notify(): void {
  if (renderCallback) renderCallback(state);
}
