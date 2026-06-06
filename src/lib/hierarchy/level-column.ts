/** level-column.ts — Hierarchy construction from a level column.
 *
 * exports:
 *   buildTreeFromLevels(rows): EADNode[]
 *     Builds tree using a stack. Each row's level rank vs stack top rank
 *     determines nesting. Rows with unknown level rank become roots.
 *
 * used_by: ui/step-map.ts → hierarchy parser dispatch
 * rules:   Flag taxonomy gap when level rank delta > 1.
 *          Iterative stack, never recursive.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented level-column stack algorithm
 */

import type { EADNode, ParsedRow } from '../../types';
import { TAXONOMY_RANK } from './shared';

export interface LevelColumnResult {
  trees: EADNode[];
  warnings: { rowIndex: number; message: string }[];
}

export function buildTreeFromLevels(rows: ParsedRow[]): LevelColumnResult {
  const trees: EADNode[] = [];
  const stack: { node: EADNode; rank: number }[] = [];
  const warnings: LevelColumnResult['warnings'] = [];
  let lastRank: number | null = null;

  for (const row of rows) {
    const level = String(row.level ?? '').toLowerCase();
    const rank = TAXONOMY_RANK[level] ?? 99;
    const index = (row.__rowNum__ as number) ?? 0;

    const node: EADNode = {
      id: String(row.unitid ?? `row-${index}`),
      originalRowIndex: index,
      level,
      metadata: { ...row },
      children: [],
    };

    // Detect taxonomy gap (e.g. series → item without file)
    if (lastRank !== null && rank > lastRank && rank - lastRank > 1) {
      warnings.push({
        rowIndex: index,
        message: `Taxonomy gap: jumped from rank ${lastRank} to ${rank} (level="${level}")`,
      });
    }
    lastRank = rank;

    // Pop stack until we find a parent with lower rank
    while (stack.length > 0 && stack[stack.length - 1].rank >= rank) {
      stack.pop();
    }

    if (stack.length === 0) {
      trees.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, rank });
  }

  return { trees, warnings };
}
