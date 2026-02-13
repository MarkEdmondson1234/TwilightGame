import React, { useMemo } from 'react';
import { BookThemeConfig, bookStyles } from './bookThemes';
import { BookChapter, useBookPagination } from '../../hooks/useBookPagination';
import BookSpread from './BookSpread';
import { eventChainManager } from '../../utils/EventChainManager';
import { getChatHistory, getMemories, getCoreMemories } from '../../services/aiChatHistory';
import type { EventChainProgress } from '../../utils/eventChainTypes';
import type { CoreMemory } from '../../services/aiChatHistory';

interface JournalContentProps {
  theme: BookThemeConfig;
}

// Journal chapter types
type JournalChapterId = 'active' | 'completed' | 'conversations';

// Unified journal entry type (quests or NPC conversations)
interface JournalEntry {
  id: string;
  type: 'quest' | 'npc';
  title: string;
  subtitle?: string;
  // Quest-specific
  progress?: EventChainProgress;
  stageText?: string;
  progressPercent?: number;
  choicesSummary?: string[];
  // NPC-specific
  npcId?: string;
  portrait?: string;
  coreMemories?: CoreMemory[];
  recentMessages?: string[];
}

const JOURNAL_CHAPTERS: BookChapter<JournalChapterId>[] = [
  { id: 'active', label: 'Active Quests', icon: '📋' },
  { id: 'completed', label: 'History', icon: '📜' },
  { id: 'conversations', label: 'Conversations', icon: '💬' },
];

/**
 * Get all NPC IDs that have any AI conversation data in localStorage
 */
function getNPCIdsWithConversations(): string[] {
  const npcIds = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('ai_chat_')) {
      npcIds.add(key.slice('ai_chat_'.length));
    } else if (key.startsWith('ai_core_')) {
      npcIds.add(key.slice('ai_core_'.length));
    } else if (key.startsWith('ai_memory_')) {
      npcIds.add(key.slice('ai_memory_'.length));
    }
  }
  return [...npcIds];
}

/**
 * Format an NPC ID into a display name (e.g. "village_elder" → "Village Elder")
 */
function formatNPCName(npcId: string): string {
  return npcId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * JournalContent - Quest diary and NPC conversation journal
 *
 * Three chapters:
 * - Active Quests: Current quest chains with progress
 * - History: Completed quests with choices made
 * - Conversations: NPC AI conversation summaries
 */
const JournalContent: React.FC<JournalContentProps> = ({ theme }) => {
  // Build journal entries for each chapter
  const entriesByChapter = useMemo(() => {
    // Active quests
    const activeQuests: JournalEntry[] = eventChainManager.getActiveChains().map((progress) => {
      const chain = eventChainManager.getChain(progress.chainId);
      const definition = chain?.definition;
      const currentStage = chain?.stageMap.get(progress.currentStageId);
      const totalStages = definition?.stages.length ?? 1;
      const currentIndex =
        definition?.stages.findIndex((s) => s.id === progress.currentStageId) ?? 0;
      const percent = Math.round(((currentIndex + 1) / totalStages) * 100);

      return {
        id: progress.chainId,
        type: 'quest' as const,
        title: definition?.title ?? progress.chainId,
        subtitle: definition?.description,
        progress,
        stageText: currentStage?.text ?? 'In progress...',
        progressPercent: percent,
      };
    });

    // Completed quests
    const completedQuests: JournalEntry[] = eventChainManager
      .getCompletedChains()
      .map((progress) => {
        const chain = eventChainManager.getChain(progress.chainId);
        const definition = chain?.definition;
        const choices = Object.entries(progress.choicesMade).map(([stageId, choiceId]) => {
          const stage = chain?.stageMap.get(stageId);
          const choice = stage?.choices?.find((c) => c.next === choiceId || c.text === choiceId);
          return choice?.text ?? choiceId;
        });

        return {
          id: progress.chainId,
          type: 'quest' as const,
          title: definition?.title ?? progress.chainId,
          subtitle: definition?.description,
          progress,
          progressPercent: 100,
          choicesSummary: choices.length > 0 ? choices : undefined,
        };
      });

    // NPC conversations
    const npcIds = getNPCIdsWithConversations();
    const conversations: JournalEntry[] = npcIds
      .map((npcId) => {
        const chatHistory = getChatHistory(npcId);
        const coreMemories = getCoreMemories(npcId);

        // Skip NPCs with no meaningful data
        if (chatHistory.length === 0 && coreMemories.length === 0) return null;

        // Get last few assistant messages as excerpts
        const recentMessages = chatHistory
          .filter((msg) => msg.role === 'assistant')
          .slice(-3)
          .map((msg) =>
            msg.content.length > 120 ? msg.content.slice(0, 120) + '...' : msg.content
          );

        return {
          id: `npc_${npcId}`,
          type: 'npc' as const,
          title: formatNPCName(npcId),
          subtitle: `${chatHistory.length} messages exchanged`,
          npcId,
          coreMemories,
          recentMessages,
        };
      })
      .filter((entry) => entry !== null) as JournalEntry[];

    return {
      active: activeQuests,
      completed: completedQuests,
      conversations,
    };
  }, []);

  const pagination = useBookPagination(JOURNAL_CHAPTERS, entriesByChapter, 6);

  const selectedEntry = pagination.selectedItem;

  // Left page: Entry list
  const leftPageContent = (
    <div className="h-full flex flex-col">
      <h2
        className="text-lg font-bold mb-2 pb-1 border-b"
        style={{
          fontFamily: bookStyles.fontFamily.heading,
          color: theme.textPrimary,
          borderColor: theme.accentPrimary,
        }}
      >
        {pagination.currentChapter?.label}
      </h2>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {pagination.currentPageItems.map((entry, index) => {
          const isSelected = pagination.selectedItemIndex === index;

          return (
            <button
              key={entry.id}
              onClick={() => pagination.selectItem(index)}
              className={`
                w-full text-left px-3 py-2 rounded transition-all duration-150
                ${isSelected ? 'shadow-md' : 'hover:bg-black/5'}
              `}
              style={{
                backgroundColor: isSelected ? `${theme.accentPrimary}30` : 'transparent',
                borderLeft: isSelected
                  ? `3px solid ${theme.accentPrimary}`
                  : '3px solid transparent',
                fontFamily: bookStyles.fontFamily.body,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>
                  {entry.type === 'npc' ? '💬 ' : ''}
                  {entry.title}
                </span>
                <span className="text-xs">
                  {entry.type === 'quest' && entry.progressPercent === 100 && (
                    <span style={{ color: theme.masteredColour }}>✓</span>
                  )}
                  {entry.type === 'quest' && (entry.progressPercent ?? 0) < 100 && (
                    <span style={{ color: theme.accentPrimary }}>{entry.progressPercent}%</span>
                  )}
                </span>
              </div>
              {entry.subtitle && (
                <p className="text-xs mt-0.5 truncate" style={{ color: theme.textMuted }}>
                  {entry.subtitle}
                </p>
              )}
            </button>
          );
        })}

        {pagination.currentPageItems.length === 0 && (
          <p className="text-center py-8 italic" style={{ color: theme.textMuted }}>
            {pagination.currentChapterId === 'active'
              ? 'No active quests'
              : pagination.currentChapterId === 'completed'
                ? 'No completed quests yet'
                : 'No NPC conversations yet'}
          </p>
        )}
      </div>

      {/* Stats */}
      <div
        className="mt-3 pt-2 border-t text-xs"
        style={{ borderColor: theme.accentPrimary, color: theme.textMuted }}
      >
        {pagination.currentChapterId === 'conversations' ? (
          <span>
            <span style={{ color: theme.accentPrimary }}>
              {entriesByChapter.conversations.length}
            </span>{' '}
            NPCs spoken to
          </span>
        ) : (
          <span>
            <span style={{ color: theme.accentPrimary }}>{entriesByChapter.active.length}</span>{' '}
            active •{' '}
            <span style={{ color: theme.masteredColour }}>{entriesByChapter.completed.length}</span>{' '}
            completed
          </span>
        )}
      </div>
    </div>
  );

  // Right page: Entry detail
  const rightPageContent = (
    <div className="h-full flex flex-col overflow-y-auto">
      {selectedEntry ? (
        selectedEntry.type === 'quest' ? (
          <QuestDetailPage entry={selectedEntry} theme={theme} />
        ) : (
          <ConversationDetailPage entry={selectedEntry} theme={theme} />
        )
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="italic" style={{ color: theme.textMuted }}>
            Select an entry to view details
          </p>
        </div>
      )}
    </div>
  );

  return (
    <BookSpread
      theme={theme}
      leftPageContent={leftPageContent}
      rightPageContent={rightPageContent}
      leftPageNumber={pagination.currentPageIndex + 1}
      totalPages={pagination.totalPages}
      chapters={JOURNAL_CHAPTERS}
      currentChapterId={pagination.currentChapterId}
      onChapterSelect={pagination.goToChapter}
      canGoPrev={pagination.canGoPrev}
      canGoNext={pagination.canGoNext}
      onPrevPage={pagination.prevPage}
      onNextPage={pagination.nextPage}
    />
  );
};

// ============================================================================
// Quest Detail Sub-component
// ============================================================================

const QuestDetailPage: React.FC<{ entry: JournalEntry; theme: BookThemeConfig }> = ({
  entry,
  theme,
}) => (
  <div className="h-full flex flex-col">
    {/* Header */}
    <h3
      className="text-lg font-bold mb-1"
      style={{ fontFamily: bookStyles.fontFamily.heading, color: theme.textPrimary }}
    >
      {entry.title}
    </h3>
    {entry.subtitle && (
      <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>
        {entry.subtitle}
      </p>
    )}

    {/* Progress bar */}
    {entry.progressPercent !== undefined && (
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: theme.textMuted }}>Progress</span>
          <span
            style={{
              color: entry.progressPercent === 100 ? theme.masteredColour : theme.accentPrimary,
            }}
          >
            {entry.progressPercent === 100 ? 'Complete' : `${entry.progressPercent}%`}
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: `${theme.accentPrimary}20` }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${entry.progressPercent}%`,
              backgroundColor:
                entry.progressPercent === 100 ? theme.masteredColour : theme.accentPrimary,
            }}
          />
        </div>
      </div>
    )}

    {/* Current stage text */}
    {entry.stageText && (
      <div
        className="p-2 rounded mb-3 text-sm italic"
        style={{
          backgroundColor: `${theme.accentPrimary}10`,
          color: theme.textSecondary,
          borderLeft: `3px solid ${theme.accentPrimary}`,
        }}
      >
        {entry.stageText}
      </div>
    )}

    {/* Choices made (completed quests) */}
    {entry.choicesSummary && entry.choicesSummary.length > 0 && (
      <div className="mt-2">
        <h4 className="text-sm font-bold mb-1" style={{ color: theme.textPrimary }}>
          Choices Made
        </h4>
        <div className="space-y-1">
          {entry.choicesSummary.map((choice, i) => (
            <div
              key={i}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: `${theme.accentPrimary}10`, color: theme.textSecondary }}
            >
              &bull; {choice}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Started day */}
    {entry.progress && (
      <div
        className="mt-auto pt-2 border-t text-xs"
        style={{ borderColor: `${theme.accentPrimary}40`, color: theme.textMuted }}
      >
        Started on day {entry.progress.startedDay}
      </div>
    )}
  </div>
);

// ============================================================================
// Conversation Detail Sub-component
// ============================================================================

const ConversationDetailPage: React.FC<{ entry: JournalEntry; theme: BookThemeConfig }> = ({
  entry,
  theme,
}) => (
  <div className="h-full flex flex-col">
    {/* NPC header */}
    <h3
      className="text-lg font-bold mb-1"
      style={{ fontFamily: bookStyles.fontFamily.heading, color: theme.textPrimary }}
    >
      {entry.title}
    </h3>
    {entry.subtitle && (
      <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
        {entry.subtitle}
      </p>
    )}

    {/* Core memories */}
    {entry.coreMemories && entry.coreMemories.length > 0 && (
      <div className="mb-3">
        <h4
          className="text-sm font-bold mb-1 pb-1 border-b"
          style={{ color: theme.accentPrimary, borderColor: `${theme.accentPrimary}40` }}
        >
          Key Memories
        </h4>
        <div className="space-y-1">
          {entry.coreMemories.slice(0, 6).map((mem) => (
            <div
              key={mem.id}
              className="text-xs px-2 py-1.5 rounded"
              style={{ backgroundColor: `${theme.accentPrimary}10`, color: theme.textSecondary }}
            >
              {mem.content}
            </div>
          ))}
          {entry.coreMemories.length > 6 && (
            <p className="text-xs italic" style={{ color: theme.textMuted }}>
              ...and {entry.coreMemories.length - 6} more memories
            </p>
          )}
        </div>
      </div>
    )}

    {/* Recent conversation excerpts */}
    {entry.recentMessages && entry.recentMessages.length > 0 && (
      <div className="flex-1 min-h-0">
        <h4
          className="text-sm font-bold mb-1 pb-1 border-b"
          style={{ color: theme.accentPrimary, borderColor: `${theme.accentPrimary}40` }}
        >
          Recent Words
        </h4>
        <div className="space-y-2">
          {entry.recentMessages.map((msg, i) => (
            <div
              key={i}
              className="text-xs p-2 rounded italic"
              style={{
                backgroundColor: `${theme.accentSecondary}08`,
                color: theme.textSecondary,
                borderLeft: `2px solid ${theme.accentSecondary}40`,
              }}
            >
              &ldquo;{msg}&rdquo;
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Empty state for no memories */}
    {(!entry.coreMemories || entry.coreMemories.length === 0) &&
      (!entry.recentMessages || entry.recentMessages.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="italic text-sm" style={{ color: theme.textMuted }}>
            No memories recorded yet
          </p>
        </div>
      )}
  </div>
);

export default JournalContent;
