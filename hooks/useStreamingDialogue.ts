/**
 * useStreamingDialogue - React hook for streaming AI dialogue state
 *
 * Manages streaming state with batched updates to avoid excessive re-renders.
 * Updates UI at most every 50ms during streaming for smooth performance.
 */

import { useState, useRef, useCallback } from 'react';
import { NPCEmotion } from '../services/anthropicClient';

const BATCH_INTERVAL_MS = 50; // Update UI at most every 50ms

export interface StreamingState {
  isStreaming: boolean;
  dialogueText: string;
  emotion: NPCEmotion;
  action?: string;
  suggestions: string[];
  showSuggestions: boolean;
  moderationScore: number;
  shouldSendToBed: boolean;
  error: string | null;
}

const initialState: StreamingState = {
  isStreaming: false,
  dialogueText: '',
  emotion: 'neutral',
  action: undefined,
  suggestions: [],
  showSuggestions: false,
  moderationScore: 0,
  shouldSendToBed: false,
  error: null,
};

export function useStreamingDialogue() {
  const [state, setState] = useState<StreamingState>(initialState);

  // Batching refs to prevent excessive re-renders
  const pendingTextRef = useRef<string>('');
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushTextUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dialogueText: pendingTextRef.current,
    }));
    batchTimerRef.current = null;
  }, []);

  const startStreaming = useCallback(() => {
    // Clear any pending updates
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    pendingTextRef.current = '';

    setState({
      ...initialState,
      isStreaming: true,
    });
  }, []);

  const handleMetadata = useCallback(
    (meta: {
      emotion: NPCEmotion;
      action?: string;
      moderationScore: number;
      shouldSendToBed: boolean;
    }) => {
      setState((prev) => ({
        ...prev,
        emotion: meta.emotion,
        action: meta.action,
        moderationScore: meta.moderationScore,
        shouldSendToBed: meta.shouldSendToBed,
      }));
    },
    []
  );

  const handleDialogueChunk = useCallback(
    (_chunk: string, fullText: string) => {
      pendingTextRef.current = fullText;

      // Batch updates to avoid too many re-renders
      if (!batchTimerRef.current) {
        batchTimerRef.current = setTimeout(flushTextUpdate, BATCH_INTERVAL_MS);
      }
    },
    [flushTextUpdate]
  );

  const handleSuggestions = useCallback((suggestions: string[]) => {
    setState((prev) => ({
      ...prev,
      suggestions,
      showSuggestions: true,
    }));
  }, []);

  const handleComplete = useCallback(() => {
    // Flush any remaining text
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    // Final state update with all text
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      dialogueText: pendingTextRef.current || prev.dialogueText,
    }));
  }, []);

  const handleError = useCallback((error: Error) => {
    // Clear any pending updates
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isStreaming: false,
      error: error.message,
    }));
  }, []);

  const reset = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    pendingTextRef.current = '';
    setState(initialState);
  }, []);

  return {
    state,
    startStreaming,
    handleMetadata,
    handleDialogueChunk,
    handleSuggestions,
    handleComplete,
    handleError,
    reset,
  };
}
