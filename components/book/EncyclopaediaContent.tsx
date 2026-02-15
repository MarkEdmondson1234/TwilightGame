import React from 'react';
import { BookThemeConfig } from './bookThemes';
import { EncyclopaediaEntry } from '../../data/ingredientEncyclopaedia';
import { getItem } from '../../data/items';
import ImageZoomPopover from './ImageZoomPopover';

/**
 * EncyclopaediaContent - Renders left and right page content for a
 * selected ingredient in the spellbook's encyclopaedia chapter.
 *
 * Left page: large illustration of the ingredient.
 * Right page: structured reference card (name, Latin name, type,
 * location, seasons, and herbalism-inspired lore).
 */

// ── Left page: illustration ──────────────────────────────────────────

function LeftPage({
  theme,
  entry,
}: {
  theme: BookThemeConfig;
  entry: EncyclopaediaEntry;
}) {
  const item = getItem(entry.itemId);
  const displayName = item?.displayName ?? entry.itemId;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <h3
        className="text-2xl font-bold text-center"
        style={{
          fontFamily: theme.fontHeading,
          color: theme.textPrimary,
        }}
      >
        {displayName}
      </h3>

      {item?.image ? (
        <ImageZoomPopover src={item.image} alt={displayName} zoomSize={320}>
          <img
            src={item.image}
            alt={displayName}
            className="max-h-52 object-contain drop-shadow-md"
          />
        </ImageZoomPopover>
      ) : (
        <div
          className="w-48 h-48 rounded-lg flex items-center justify-center text-7xl"
          style={{
            backgroundColor: `${theme.accentPrimary}12`,
            border: `2px dashed ${theme.accentPrimary}40`,
          }}
        >
          {item?.icon ?? '🌿'}
        </div>
      )}

      <p
        className="text-base italic text-center"
        style={{ color: theme.textMuted }}
      >
        {entry.latinName}
      </p>
    </div>
  );
}

// ── Right page: structured info card ─────────────────────────────────

function RightPage({
  theme,
  entry,
}: {
  theme: BookThemeConfig;
  entry: EncyclopaediaEntry;
}) {
  const item = getItem(entry.itemId);
  const displayName = item?.displayName ?? entry.itemId;

  return (
    <div className="h-full flex flex-col overflow-y-auto gap-3">
      {/* Name heading */}
      <div>
        <FieldLabel theme={theme}>Name</FieldLabel>
        <p style={{ color: theme.textPrimary, fontFamily: theme.fontHeading }}
           className="text-lg font-bold">
          {displayName}
        </p>
        <p className="italic text-base" style={{ color: theme.accentPrimary }}>
          {entry.latinName}
        </p>
      </div>

      {/* Type */}
      <div>
        <FieldLabel theme={theme}>Type</FieldLabel>
        <p style={{ color: theme.textPrimary }}>{entry.type}</p>
      </div>

      {/* Can be found */}
      <div>
        <FieldLabel theme={theme}>Can Be Found</FieldLabel>
        <p style={{ color: theme.textPrimary }}>{entry.canBeFound}</p>
      </div>

      {/* Seasons available */}
      <div>
        <FieldLabel theme={theme}>Seasons Available</FieldLabel>
        <p style={{ color: theme.textPrimary }}>{entry.seasonsAvailable}</p>
      </div>

      {/* Rarity badge */}
      {item?.rarity && (
        <div>
          <span
            className="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wider"
            style={{
              backgroundColor: `${theme.accentSecondary}25`,
              color: theme.accentSecondary,
            }}
          >
            {item.rarity.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Lore / description */}
      <div
        className="flex-1 pt-2"
        style={{ borderTop: `1px solid ${theme.accentPrimary}30` }}
      >
        <FieldLabel theme={theme}>Description</FieldLabel>
        <p
          className="leading-relaxed text-base mt-1"
          style={{ color: theme.textSecondary, fontFamily: theme.fontBody }}
        >
          {entry.lore}
        </p>
      </div>
    </div>
  );
}

// ── Shared label component ───────────────────────────────────────────

function FieldLabel({
  theme,
  children,
}: {
  theme: BookThemeConfig;
  children: React.ReactNode;
}) {
  return (
    <h4
      className="text-xs uppercase tracking-wider mb-0.5"
      style={{ color: theme.textMuted }}
    >
      {children}
    </h4>
  );
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Returns left and right page content for the encyclopaedia spread.
 */
export function renderEncyclopaediaPages(
  theme: BookThemeConfig,
  entry: EncyclopaediaEntry | null,
): { leftPage: React.ReactNode; rightPage: React.ReactNode } {
  if (!entry) {
    const placeholder = (
      <div className="h-full flex items-center justify-center">
        <p className="italic" style={{ color: theme.textMuted }}>
          Select an ingredient to view details
        </p>
      </div>
    );
    return { leftPage: placeholder, rightPage: placeholder };
  }

  return {
    leftPage: <LeftPage theme={theme} entry={entry} />,
    rightPage: <RightPage theme={theme} entry={entry} />,
  };
}

export { LeftPage, RightPage };
