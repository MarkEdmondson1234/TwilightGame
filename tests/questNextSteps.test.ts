import { describe, expect, it } from 'vitest';
import {
  cookingNextStep,
  gardeningNextStep,
  altheaNextStep,
  type GardenGuideState,
  type ChoresGuideState,
} from '../utils/questNextSteps';
const garden: GardenGuideState = {
  offered: false,
  season: 'spring',
  task: 'spring',
  completed: [],
  cropCount: 0,
  honeyCount: 0,
};
const chores: ChoresGuideState = {
  done: false,
  cobwebsRemaining: 5,
  teaDelivered: false,
  cookiesDelivered: false,
  teaCount: 0,
  cookiesCount: 0,
  cookiesUnlocked: false,
};
describe('personal quest directions', () => {
  it('distinguishes the tea lesson, ingredients, mastery and returning to Mum', () => {
    expect(cookingNextStep({ teaComplete: false, recipes: [] }).action).toBe('Make your first tea');
    const recipe = { name: 'Bread', timesCooked: 2, mastered: false, missing: ['2 Flour'] };
    const step = cookingNextStep({ teaComplete: true, recipes: [recipe] });
    expect(step.action).toContain('Gather');
    expect(step.details.join(' ')).toContain('2/3');
    expect(step.details.join(' ')).toContain('2 Flour');
    expect(
      cookingNextStep({ teaComplete: true, recipes: [{ ...recipe, missing: [] }] }).action
    ).toBe('Cook Bread');
    expect(
      cookingNextStep({ teaComplete: true, recipes: [{ ...recipe, mastered: true }] }).action
    ).toContain('Ask Mum');
  });
  it('shows held crops as ready to deliver, never as already completed', () => {
    const input = { ...garden, cropCount: 8 };
    const before = structuredClone(input);
    const step = gardeningNextStep(input);
    expect(step.action).toBe('Deliver 1 crop to Elias');
    expect(step.details.join(' ')).toContain('Seasons finished: 0/3');
    expect(step.details.join(' ')).toContain('1/1 crop');
    expect(input).toEqual(before);
  });
  it('requires honey rather than crops for autumn', () => {
    const input = { ...garden, season: 'autumn', task: 'autumn' as const, cropCount: 20 };
    expect(gardeningNextStep(input).action).toBe('Find honey for Elias');
    expect(gardeningNextStep({ ...input, honeyCount: 1 }).action).toBe('Deliver 1 Honey to Elias');
  });
  it('preserves an old task across seasons and allows a held item to be delivered in winter', () => {
    const step = gardeningNextStep({ ...garden, season: 'winter', cropCount: 1 });
    expect(step.action).toContain('Deliver');
    expect(step.details.join(' ')).toContain('spring task is still active');
    expect(gardeningNextStep({ ...garden, season: 'winter', task: null }).action).toContain(
      'another activity'
    );
  });
  it('distinguishes an offer, a new task and waiting after a finished season', () => {
    expect(gardeningNextStep({ ...garden, offered: true }).action).toContain('Accept');
    expect(gardeningNextStep({ ...garden, task: null }).action).toContain('Ask Elias');
    expect(gardeningNextStep({ ...garden, task: null, completed: ['spring'] }).action).toContain(
      'another activity'
    );
  });
  it('prioritises a ready chore delivery while keeping the other chores visible', () => {
    const step = altheaNextStep({ ...chores, teaCount: 1 });
    expect(step.action).toBe('Give Althea your tea');
    expect(step.details.join(' ')).toContain('not yet delivered');
    expect(step.details.join(' ')).toContain('Cobwebs cleaned: 0/5');
  });
  it('never asks for an already-delivered cup, even when the bag is empty', () => {
    const step = altheaNextStep({ ...chores, teaDelivered: true, cobwebsRemaining: 0 });
    expect(step.action).toBe('Ask Mum about learning cookies');
    expect(step.details).toContain('Tea: delivered.');
    expect(
      altheaNextStep({ ...chores, teaDelivered: true, cobwebsRemaining: 0, cookiesUnlocked: true })
        .action
    ).toBe('Bake cookies for Althea');
  });
  it('offers dusting independently and waits for the final conversation after all chores', () => {
    expect(altheaNextStep(chores).action).toBe('Dust Althea’s cobwebs');
    expect(
      altheaNextStep({
        ...chores,
        done: true,
        teaDelivered: true,
        cookiesDelivered: true,
        cobwebsRemaining: 0,
      }).action
    ).toBe('Return to Althea to hear her story');
  });
});
