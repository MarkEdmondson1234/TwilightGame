import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import BookSpread from '../components/book/BookSpread';
import { getBookTheme } from '../components/book/bookThemes';
import RadialMenu from '../components/RadialMenu';
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));

it('keeps chapter selection, page navigation and both page contents available on mobile', () => {
  const chapter = vi.fn();
  const next = vi.fn();
  render(
    <BookSpread
      theme={getBookTheme('cooking')}
      leftPageContent="Recipe list"
      rightPageContent="Recipe details"
      chapters={[
        { id: 'all', label: 'All', icon: '' },
        { id: 'locked', label: 'Locked', icon: '', locked: true },
      ]}
      currentChapterId="all"
      onChapterSelect={chapter}
      canGoPrev={false}
      canGoNext
      onPrevPage={vi.fn()}
      onNextPage={next}
    />
  );
  expect(screen.getByText('Recipe list')).toBeTruthy();
  expect(screen.getByText('Recipe details')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(chapter).toHaveBeenCalledWith('all');
  fireEvent.click(screen.getByRole('button', { name: 'Locked (Locked)' }));
  expect(chapter).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /Previous/ }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(next).toHaveBeenCalledTimes(1);
});

it('dispatches an action once and preserves confirmation actions that stay open', () => {
  vi.useFakeTimers();
  try {
    const select = vi.fn();
    const close = vi.fn();
    render(
      <RadialMenu
        position={{ x: 0, y: 0 }}
        onClose={close}
        options={[{ id: 'confirm', label: 'Review action', staysOpen: true, onSelect: select }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review action' }));
    act(() => vi.advanceTimersByTime(100));
    expect(select).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close actions' }));
    expect(close).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
