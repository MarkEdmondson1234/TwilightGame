/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { runProviders } from '../utils/interactions/index';
import { INTERACTION_PROVIDERS } from '../utils/interactions/registry';
import type {
  AvailableInteraction,
  InteractionContext,
  InteractionProvider,
} from '../utils/interactions/types';

/**
 * Guards the contract that the provider registry relies on. The providers themselves need a
 * live map and save file to exercise, so these tests cover the wiring around them — the part
 * a future agent adding a provider is most likely to get wrong.
 */

const fakeCtx = {} as InteractionContext;

function stub(type: string): AvailableInteraction {
  return { type: type as AvailableInteraction['type'], label: type, execute: () => {} };
}

describe('runProviders', () => {
  it('concatenates interactions in registry order', () => {
    const providers: InteractionProvider[] = [() => [stub('a')], () => [stub('b')]];
    expect(runProviders(providers, fakeCtx).map((i) => i.type)).toEqual(['a', 'b']);
  });

  it('accepts both a bare array and a ProviderResult', () => {
    const providers: InteractionProvider[] = [
      () => [stub('array')],
      () => ({ interactions: [stub('result')] }),
    ];
    expect(runProviders(providers, fakeCtx).map((i) => i.type)).toEqual(['array', 'result']);
  });

  it("keeps an exclusive provider's interactions but skips every provider after it", () => {
    const providers: InteractionProvider[] = [
      () => [stub('before')],
      () => ({ interactions: [stub('exclusive')], exclusive: true }),
      () => [stub('never')],
    ];
    expect(runProviders(providers, fakeCtx).map((i) => i.type)).toEqual(['before', 'exclusive']);
  });

  it('does not short-circuit when exclusive is absent or false', () => {
    const providers: InteractionProvider[] = [
      () => ({ interactions: [stub('a')], exclusive: false }),
      () => [stub('b')],
    ];
    expect(runProviders(providers, fakeCtx).map((i) => i.type)).toEqual(['a', 'b']);
  });

  it('skips providers that offer nothing', () => {
    const providers: InteractionProvider[] = [
      () => [],
      () => ({ interactions: [] }),
      () => [stub('only')],
    ];
    expect(runProviders(providers, fakeCtx).map((i) => i.type)).toEqual(['only']);
  });
});

describe('INTERACTION_PROVIDERS registry', () => {
  it('contains only callable providers', () => {
    expect(INTERACTION_PROVIDERS.length).toBeGreaterThan(0);
    for (const provider of INTERACTION_PROVIDERS) {
      expect(typeof provider).toBe('function');
    }
  });

  it('registers each provider exactly once', () => {
    expect(new Set(INTERACTION_PROVIDERS).size).toBe(INTERACTION_PROVIDERS.length);
  });
});
