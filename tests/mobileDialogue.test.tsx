import React, { useRef, useState } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DialogueChatHistory from '../components/dialogue/DialogueChatHistory';
import DialogueFrame from '../components/dialogue/DialogueFrame';
import TransitionIndicators from '../components/TransitionIndicators';
import { useMouseControls } from '../hooks/useMouseControls';
import type { MapDefinition } from '../types';
vi.mock('../hooks/useDialogueAnimation', () => ({
  useDialogueAnimation: () => ({ currentFrame: '/frame.png' }),
}));
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));
afterEach(() => vi.restoreAllMocks());

function World({ onWorldClick, onClose }: { onWorldClick: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  useMouseControls({
    containerRef: ref,
    cameraX: 0,
    cameraY: 0,
    zoom: 1,
    enabled: true,
    onCanvasClick: onWorldClick,
  });
  return (
    <div ref={ref}>
      {open && (
        <DialogueFrame
          npcName="The King of All the Fairies"
          npcSprite="/npc.png"
          playerSprite="/player.png"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          <button>Response</button>
        </DialogueFrame>
      )}
    </div>
  );
}

describe('mobile dialogue input isolation', () => {
  it('does not send a close tap or its click to the world underneath', () => {
    const world = vi.fn();
    const close = vi.fn();
    render(<World onWorldClick={world} onClose={close} />);
    const leave = screen.getByRole('button', { name: 'Leave' });
    fireEvent.touchStart(leave, { touches: [{ clientX: 20, clientY: 20 }] });
    fireEvent.touchEnd(leave, { changedTouches: [{ clientX: 20, clientY: 20 }] });
    fireEvent.click(leave);
    expect(close).toHaveBeenCalledTimes(1);
    expect(world).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps response taps inside the dialogue', () => {
    const world = vi.fn();
    const close = vi.fn();
    render(<World onWorldClick={world} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Response' }));
    expect(close).not.toHaveBeenCalled();
    expect(world).not.toHaveBeenCalled();
  });
});

describe('transition icon taps', () => {
  const transition = {
    fromPosition: { x: 5, y: 5 },
    toMapId: 'village',
    toPosition: { x: 10, y: 10 },
    label: 'Back to village',
  };
  const map = { id: 'forest', transitions: [transition] } as MapDefinition;
  it('makes the visible icon actionable without requiring the tiny tile target', () => {
    const onActivate = vi.fn();
    render(
      <TransitionIndicators
        currentMap={map}
        playerPos={{ x: 5, y: 8 }}
        lastTransitionTime={0}
        onActivate={onActivate}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to village' }));
    expect(onActivate).toHaveBeenCalledExactlyOnceWith(transition);
  });
  it('makes the nearby destination label actionable too', () => {
    const onActivate = vi.fn();
    render(
      <TransitionIndicators
        currentMap={map}
        playerPos={{ x: 5, y: 5 }}
        lastTransitionTime={0}
        onActivate={onActivate}
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Back to village' })[1]);
    expect(onActivate).toHaveBeenCalledExactlyOnceWith(transition);
  });
  it('does not display distant transitions', () => {
    render(
      <TransitionIndicators
        currentMap={map}
        playerPos={{ x: 0, y: 0 }}
        lastTransitionTime={0}
        onActivate={vi.fn()}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('expanded history dismissal', () => {
  it('closes history without forwarding Escape to the underlying dialogue', () => {
    const underlyingKey = vi.fn();
    window.addEventListener('keydown', underlyingKey);
    const close = vi.fn();
    try {
      render(
        <DialogueFrame
          npcName="Mordecai"
          npcSprite="/npc.png"
          playerSprite="/player.png"
          onClose={close}
        >
          <DialogueChatHistory
            messages={[
              { id: '1', role: 'assistant', content: 'Hello' },
              { id: '2', role: 'user', content: 'Hi' },
            ]}
            scrollRef={{ current: null }}
            onScroll={() => {}}
            npcName="Mordecai"
            playerName="Traveller"
            isLoading={false}
          />
        </DialogueFrame>
      );
      fireEvent.click(screen.getByRole('button', { name: 'View history' }));
      expect(screen.getByRole('dialog', { name: 'Conversation history' })).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(
        screen.queryByRole('dialog', { name: 'Conversation history' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('dialog', { name: 'Conversation with Mordecai' })
      ).toBeInTheDocument();
      expect(underlyingKey).not.toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'View history' }));
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(
        screen.queryByRole('dialog', { name: 'Conversation history' })
      ).not.toBeInTheDocument();
      expect(close).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', underlyingKey);
    }
  });
});
