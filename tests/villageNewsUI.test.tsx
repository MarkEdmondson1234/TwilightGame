import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VillageNews from '../components/VillageNews';
const remember = vi.hoisted(() => vi.fn());
vi.mock('../utils/activityLeadStorage', () => ({ rememberActivityLead: remember }));
vi.mock('../data/items', () => ({ getItem: () => ({ image: '/skis.png' }) }));
const news = () => ({
  uid: 'reader',
  batch: {
    uid: 'reader',
    stories: [
      {
        key: 'skiing',
        title: 'An adventure in the snow',
        story: 'A neighbour has discovered skiing.',
        lead: 'skiing' as const,
        neighbours: 1,
      },
    ],
    returning: true,
    truncated: false,
  },
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
  });
  it('keeps a lead without launching a game or acknowledging the news', () => {
    const n = news();
    render(<VillageNews news={n} blocked={false} onJournal={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Keep this lead' }));
    expect(remember).toHaveBeenCalledWith('skiing');
    expect(n.markRead).not.toHaveBeenCalled();
    expect(screen.getByText(/Mr Fox sells skis/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kept in Things to try' })).toBeDisabled();
  });
});
