import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
const cook = vi.hoisted(() =>
  vi.fn(() => ({ success: true, message: 'Your tea is in your bag.' }))
);
vi.mock('../utils/CookingManager', () => ({
  cookingManager: {
    isRecipeUnlocked: () => true,
    isRecipeMastered: () => false,
    cook,
    getUnlockedRecipes: () => [],
    getMasteredRecipes: () => [],
    getProgress: () => undefined,
  },
}));
vi.mock('../utils/AudioManager', () => ({ audioManager: { playSfx: vi.fn() } }));
vi.mock('../components/CookingResultPopup', () => ({
  default: ({ result }: { result: { message: string } }) => <p role="status">{result.message}</p>,
}));
import RecipeContent from '../components/book/RecipeContent';
import { cookingTheme } from '../components/book/bookThemes';

describe('tea recipe book', () => {
  it('uses the shared cooking path even beside Mum, and explains where the tea went', () => {
    render(
      <RecipeContent
        theme={cookingTheme}
        currentMapId="mums_kitchen"
        nearbyNPCs={['mum_kitchen']}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Tea/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cook!/ }));
    expect(cook).toHaveBeenCalledWith('tea', 0, 'mums_kitchen');
    expect(screen.getByRole('status')).toHaveTextContent('in your bag');
  });
  it('keeps tea readable elsewhere and explains why cooking is unavailable', () => {
    render(<RecipeContent theme={cookingTheme} currentMapId="village" />);
    fireEvent.click(screen.getByRole('button', { name: /^Tea/ }));
    expect(screen.getByRole('button', { name: /Cook!/ })).toBeDisabled();
    expect(screen.getByText(/Bring this book to Mum's kitchen/)).toBeInTheDocument();
  });
});
