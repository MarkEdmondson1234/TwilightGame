import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Inventory from '../components/Inventory';
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));

it('opens the selected item actions by tap and clears that choice when filtering', () => {
  const actions = vi.fn();
  const item = { id: 'seed_radish', name: 'Radish Seeds', icon: '🌱', quantity: 4 };
  render(<Inventory isOpen onClose={() => {}} items={[item]} onItemContextMenu={actions} />);
  expect(screen.queryByRole('button', { name: 'Item actions' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Radish Seeds' }));
  expect(actions).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Item actions' }), {
    clientX: 120,
    clientY: 40,
  });
  expect(actions).toHaveBeenCalledWith(item, 0, { clientX: 120, clientY: 40 });
  fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
  expect(screen.queryByRole('button', { name: 'Item actions' })).toBeNull();
});
