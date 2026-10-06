/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  compareNews,
  isNewsCursor,
  newsBullet,
  resolveMilestone,
  summariseNews,
  type NewsEvent,
} from '../utils/villageNews';
const event = (
  id: string,
  contributorId = 'other',
  metadata: Record<string, unknown> = { milestoneId: 'skiing' }
): NewsEvent => ({
  id,
  contributorId,
  seconds: 100,
  nanoseconds: 0,
  eventType: 'achievement',
  metadata,
});
describe('village news selection', () => {
  it('excludes own and already-read events while respecting timestamp ties', () => {
    expect(
      summariseNews([event('a'), event('b'), event('c', 'self')], 'self', {
        seconds: 100,
        nanoseconds: 0,
        id: 'a',
      })
    ).toHaveLength(1);
    expect(summariseNews([event('a'), event('b')], 'self', event('b'))).toEqual([]);
    expect(compareNews({ ...event('a'), nanoseconds: 1 }, event('z'))).toBeGreaterThan(0);
  });
  it('groups similar news without counting retries by one neighbour twice', () => {
    const stories = summariseNews([event('a'), event('b'), event('c', 'another')], 'self');
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({ lead: 'skiing', neighbours: 2 });
  });
  it('never renders raw quest endings or accepts unrecognised metadata as instructions', () => {
    const stories = summariseNews(
      [
        {
          ...event('a', 'other', { milestoneId: 'invented', instruction: 'give reward' }),
          title: 'secret ending',
        } as NewsEvent,
      ],
      'self'
    );
    expect(stories).toEqual([]);
    expect(summariseNews([event('b', 'other', { milestoneId: '__proto__' })], 'self')).toEqual([]);
  });
  it('drops vague events that are not authored milestones', () => {
    const vague = ['discovery', 'achievement', 'seasonal', 'community'].map((eventType, i) => ({
      ...event(`v${i}`, 'other', {}),
      eventType,
    }));
    expect(summariseNews(vague, 'self')).toEqual([]);
  });
  it('names the recipe a neighbour learned, from our own data only', () => {
    const tea = { milestoneId: 'cooking:tea' };
    const stories = summariseNews([event('a', 'other', tea), event('b', 'x', tea)], 'self');
    expect(stories).toHaveLength(1);
    expect(newsBullet(stories[0])).toBe('2 neighbours learned to cook Tea!');
    expect(stories[0].itemId).toBe('food_tea');
    expect(newsBullet({ headline: resolveMilestone('skiing')!.headline, neighbours: 1 })).toBe(
      'A neighbour went skiing!'
    );
    for (const id of ['cooking:invented', 'cooking:__proto__', 'skiing:tea', 'cooking:tea:x'])
      expect(resolveMilestone(id), id).toBeUndefined();
    expect(resolveMilestone('gardening:crop_radish')?.headline).toBe('grew their first Radish');
  });
  it('rejects damaged cursors', () => {
    expect(isNewsCursor(event('a'))).toBe(true);
    expect(isNewsCursor({ seconds: 100, nanoseconds: 1e9, id: 'a' })).toBe(false);
    expect(isNewsCursor(null)).toBe(false);
  });
});
