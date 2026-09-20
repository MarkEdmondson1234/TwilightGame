import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import type { MiniGameComponentProps } from '../minigames/types';
const mock = vi.hoisted(() => ({ finish: vi.fn(), capture: vi.fn(), register: vi.fn() }));
vi.mock('../utils/tinyWreathLesson', () => ({ finishTinyWreathLesson: mock.finish }));
vi.mock('../utils/DecorationManager', () => ({
  decorationManager: { registerCustomDecoration: mock.register, deletePainting: vi.fn() },
}));
vi.mock('../minigames/wreath-making/wreathCapture', () => ({ captureWreathImage: mock.capture }));
vi.mock('../minigames/wreath-making/useWreathEditor', () => ({
  useWreathEditor: () => ({
    placedItems: [
      { itemId: 'crop_lavender' },
      { itemId: 'crop_lavender' },
      { itemId: 'heather_sprig' },
      { itemId: 'heather_sprig' },
    ],
    availableFlowers: [],
  }),
}));
vi.mock('../minigames/wreath-making/FlowerGallery', () => ({ FlowerGallery: () => null }));
vi.mock('../minigames/wreath-making/EditingToolPanel', () => ({ EditingToolPanel: () => null }));
vi.mock('../minigames/wreath-making/WreathStage', () => ({
  WreathStage: ({ onCreate }: { onCreate: () => void }) => (
    <button onClick={onCreate}>Create</button>
  ),
}));
import { WreathMakingGame } from '../minigames/wreath-making/WreathMakingGame';
function setup() {
  const actions = {
    getItemQuantity: vi.fn(() => 2),
    removeItem: vi.fn(() => true),
    addItem: vi.fn(() => true),
    addItemWithDecoration: vi.fn(() => true),
  };
  const onComplete = vi.fn();
  const context = {
    actions,
    storage: { load: () => null },
  } as unknown as MiniGameComponentProps['context'];
  render(<WreathMakingGame context={context} onClose={vi.fn()} onComplete={onComplete} />);
  return { actions, onComplete };
}
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mock.capture.mockResolvedValue('data:image/png;base64,test');
  mock.register.mockReturnValue('wreath-1');
});
describe('wreath crafting completion', () => {
  it('consumes the arranged flowers and credits only after a real item is added, once per click burst', async () => {
    const { actions, onComplete } = setup();
    fireEvent.click(screen.getByText('Create'));
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(actions.removeItem.mock.calls).toEqual([
      ['crop_lavender', 2],
      ['heather_sprig', 2],
    ]);
    expect(actions.addItemWithDecoration).toHaveBeenCalledExactlyOnceWith(
      'decoration_wreath_fine',
      'wreath-1'
    );
    expect(mock.finish).toHaveBeenCalledOnce();
  });
  it('rejects missing materials without consuming anything or crediting the lesson', async () => {
    const { actions, onComplete } = setup();
    actions.getItemQuantity.mockReturnValue(0);
    fireEvent.click(screen.getByText('Create'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(actions.removeItem).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(mock.finish).not.toHaveBeenCalled();
  });
  it('returns spent flowers if the output cannot be added', async () => {
    const { actions, onComplete } = setup();
    actions.addItemWithDecoration.mockReturnValue(false);
    fireEvent.click(screen.getByText('Create'));
    await screen.findByRole('alert');
    expect(actions.addItem.mock.calls).toEqual([
      ['crop_lavender', 2],
      ['heather_sprig', 2],
    ]);
    expect(onComplete).not.toHaveBeenCalled();
    expect(mock.finish).not.toHaveBeenCalled();
  });
});
