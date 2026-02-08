/**
 * Event Chain Loader
 *
 * Loads and validates YAML event chain files from data/eventChains/.
 * Uses Vite's glob import to discover files and the `yaml` package to parse them.
 */

import { parse } from 'yaml';
import type { EventChainDefinition, LoadedEventChain } from './eventChainTypes';

// ============================================
// YAML File Discovery (Vite glob import)
// ============================================

// Import all YAML files from data/eventChains/ as raw strings
const yamlModules = import.meta.glob('/data/eventChains/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// ============================================
// Validation
// ============================================

const VALID_EVENT_TYPES = new Set(['discovery', 'achievement', 'seasonal', 'community', 'mystery']);
const VALID_TRIGGER_TYPES = new Set([
  'manual',
  'event_count',
  'quest_complete',
  'seasonal',
  'friendship',
  'tile',
]);

function validateChain(chain: EventChainDefinition, filename: string): string[] {
  const errors: string[] = [];

  if (!chain.id) errors.push(`${filename}: missing 'id'`);
  if (!chain.title) errors.push(`${filename}: missing 'title'`);
  if (!chain.type || !VALID_EVENT_TYPES.has(chain.type)) {
    errors.push(
      `${filename}: invalid 'type' — must be one of: ${[...VALID_EVENT_TYPES].join(', ')}`
    );
  }
  if (!chain.trigger?.type || !VALID_TRIGGER_TYPES.has(chain.trigger.type)) {
    errors.push(
      `${filename}: invalid 'trigger.type' — must be one of: ${[...VALID_TRIGGER_TYPES].join(', ')}`
    );
  }
  // Validate tile trigger has required fields
  if (chain.trigger?.type === 'tile') {
    if (!chain.trigger.mapId) errors.push(`${filename}: tile trigger missing 'mapId'`);
    if (chain.trigger.tileX == null) errors.push(`${filename}: tile trigger missing 'tileX'`);
    if (chain.trigger.tileY == null) errors.push(`${filename}: tile trigger missing 'tileY'`);
  }

  if (!chain.stages || chain.stages.length === 0) {
    errors.push(`${filename}: must have at least one stage`);
  }

  // Validate stages
  const stageIds = new Set<string>();
  for (const stage of chain.stages || []) {
    if (!stage.id) {
      errors.push(`${filename}: stage missing 'id'`);
      continue;
    }
    if (stageIds.has(stage.id)) {
      errors.push(`${filename}: duplicate stage id '${stage.id}'`);
    }
    stageIds.add(stage.id);

    if (!stage.text) {
      errors.push(`${filename}: stage '${stage.id}' missing 'text'`);
    }

    // Validate objective fields
    if (stage.objective) {
      if (stage.objective.type !== 'go_to') {
        errors.push(
          `${filename}: stage '${stage.id}' objective has invalid type '${stage.objective.type}'`
        );
      }
      if (!stage.objective.mapId) {
        errors.push(`${filename}: stage '${stage.id}' objective missing 'mapId'`);
      }
      if (stage.objective.tileX == null || stage.objective.tileY == null) {
        errors.push(`${filename}: stage '${stage.id}' objective missing 'tileX' or 'tileY'`);
      }
    }
  }

  // Validate stage references (next, choices.next)
  for (const stage of chain.stages || []) {
    if (stage.next && !stageIds.has(stage.next)) {
      errors.push(`${filename}: stage '${stage.id}' references unknown next stage '${stage.next}'`);
    }
    for (const choice of stage.choices || []) {
      if (choice.next && !stageIds.has(choice.next)) {
        errors.push(
          `${filename}: stage '${stage.id}' choice references unknown stage '${choice.next}'`
        );
      }
    }
  }

  return errors;
}

// ============================================
// Loading
// ============================================

/** Load and validate all event chain YAML files */
export function loadAllEventChains(): LoadedEventChain[] {
  const chains: LoadedEventChain[] = [];
  const allErrors: string[] = [];

  for (const [path, rawYaml] of Object.entries(yamlModules)) {
    const filename = path.split('/').pop() || path;

    try {
      const parsed = parse(rawYaml) as EventChainDefinition;
      const errors = validateChain(parsed, filename);

      if (errors.length > 0) {
        allErrors.push(...errors);
        continue;
      }

      // Build stage lookup map
      const stageMap = new Map(parsed.stages.map((s) => [s.id, s]));

      chains.push({ definition: parsed, stageMap });
    } catch (err) {
      allErrors.push(`${filename}: YAML parse error — ${err}`);
    }
  }

  if (allErrors.length > 0) {
    console.warn('[EventChainLoader] Validation errors:');
    for (const err of allErrors) {
      console.warn(`  - ${err}`);
    }
  }

  if (chains.length > 0) {
    console.log(`[EventChainLoader] Loaded ${chains.length} event chain(s)`);
  }

  return chains;
}

/** Get the number of YAML files discovered (for diagnostics) */
export function getYamlFileCount(): number {
  return Object.keys(yamlModules).length;
}
