import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VillageNews from '../components/VillageNews';
import type { NewsStory } from '../utils/villageNews';
import type { MissedFestival } from '../utils/missedFestivals';
vi.mock('../data/items', () => ({ getItem: () => ({ image: '/skis.png' }) }));
const story = (key: string, headline: string, neighbours = 1): NewsStory => ({
  key,
  title: 'Long title',
  story: 'A long story the card should no longer show.',
  headline,
  neighbours,
});
const news = (
  stories: NewsStory[] = [story('skiing', 'went skiing')],
  festivals: MissedFestival[] = []
) => ({
  uid: 'reader',
  batch: { uid: 'reader', stories, returning: true, truncated: false, festivals },
  unavailable: false,
  dismissed: false,
  markRead: vi.fn(),
  dismiss: vi.fn(),
  refresh: vi.fn(),
});
describe('village news UI', () => {
  it('defers to other interfaces and keeps Later distinct from marking read', () => {
    const n = news();
    const view = render(<VillageNews news={n} blocked onJournal={vi.fn()} />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    view.rerender(<VillageNews news={n} blocked={false} onJournal={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(n.dismiss).toHaveBeenCalledOnce();
    expect(n.markRead).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(n.markRead).toHaveBeenCalledOnce();
  });
  it('lists short bullets under the headline, without the long stories', () => {
    render(
      <VillageNews
        news={news(
          [story('skiing', 'went skiing'), story('wreath-making', 'made a wreath', 2)],
          [{ name: 'Yule', image: '/yule_tree.png' }]
        )}
        blocked={false}
        onJournal={vi.fn()}
      />
    );
    expect(screen.getByText('While you were away')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Yule took place in the village!',
      'A neighbour went skiing!',
      '2 neighbours made a wreath!',
    ]);
    expect(screen.queryByText(/long story/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0].querySelector('img')?.getAttribute('src')).toBe(
      '/yule_tree.png'
    );
  });
  it('shows a festival even when no neighbour news arrived', () => {
    render(
      <VillageNews news={news([], [{ name: 'Mayday' }])} blocked={false} onJournal={vi.fn()} />
    );
    expect(screen.getByText('Mayday took place in the village!')).toBeInTheDocument();
  });
  it('caps the card and sends the rest to the journal', () => {
    const onJournal = vi.fn();
    const n = news(Array.from({ length: 8 }, (_, i) => story(`s${i}`, `did thing ${i}`)));
    render(<VillageNews news={n} blocked={false} onJournal={onJournal} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: '…and 3 more' }));
    expect(onJournal).toHaveBeenCalledOnce();
    expect(n.dismiss).toHaveBeenCalledOnce();
  });
});
