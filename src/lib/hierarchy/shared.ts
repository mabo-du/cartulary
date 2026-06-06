/** shared.ts — Shared hierarchy utilities and the EADNode interface re-export.
 *
 * exports:
 *   EADNode (re-export)
 *   TAXONOMY_RANK — Map of level names to numeric rank
 *
 * used_by: level-column.ts, dotted-ids.ts, parent-id.ts, cycle-detect.ts
 * rules:   RANK values must be positive ints; unknown levels get rank 99.
 * agent:   deepseek-v4-flash | 2026-06-07 | Extracted shared hierarchy constants
 */

import type { EADNode } from '../../types';

export type { EADNode };

/** Rank map for stack-based level inference (lower = higher in tree). */
export const TAXONOMY_RANK: Record<string, number> = {
  collection: 1,
  recordgrp: 1,
  fonds: 1,
  series: 2,
  subseries: 3,
  subfonds: 3,
  file: 4,
  item: 5,
};
