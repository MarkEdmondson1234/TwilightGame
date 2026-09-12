import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ChatPanel from '../components/ChatPanel';
import EmoteWheel from '../components/EmoteWheel';
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));

function Composer({ send }: { send: (text: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(true);
  return (
    <ChatPanel
      isComposing={open}
      onSend={send}
      onStartComposing={() => setOpen(true)}
      onStopComposing={() => setOpen(false)}
    />
  );
}

it('retains the draft on blur, close and failed send, and clears it only after delivery', async () => {
  const send = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<Composer send={send} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Meet me in the garden' } });
  fireEvent.blur(screen.getByRole('textbox'));
  expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Meet me in the garden');
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Meet me in the garden');
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByRole('button', { name: 'Chat' });
  fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  expect(send).toHaveBeenCalledTimes(2);
});

it('prevents duplicate sends while waiting and retains text when delivery throws', async () => {
  let reject!: (error: Error) => void;
  const send = vi.fn(
    () =>
      new Promise<boolean>((_, fail) => {
        reject = fail;
      })
  );
  render(<Composer send={send} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
  fireEvent.submit(screen.getByRole('dialog'));
  fireEvent.submit(screen.getByRole('dialog'));
  expect(send).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('offline')));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Hello');
});

it('selects emotes on completed taps, not the start of a cancelled touch', () => {
  const select = vi.fn();
  const close = vi.fn();
  render(<EmoteWheel onSelect={select} onClose={close} />);
  const button = screen.getAllByRole('button')[1];
  fireEvent.touchStart(button);
  fireEvent.touchCancel(button);
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(select).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
});

it('opens the larger icon picker, searches artwork and sends its catalog id', () => {
  const select = vi.fn();
  const close = vi.fn();
  render(<EmoteWheel onSelect={select} onClose={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'More icons…' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Radish Seeds' } });
  fireEvent.click(screen.getByRole('button', { name: 'Radish Seeds' }));
  expect(select).toHaveBeenCalledWith('item:seed_radish');
  expect(close).toHaveBeenCalledTimes(1);
});
