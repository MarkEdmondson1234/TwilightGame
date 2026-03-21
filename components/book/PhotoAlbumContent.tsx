import React, { useState, useEffect } from 'react';
import { BookThemeConfig, bookStyles } from './bookThemes';
import BookSpread from './BookSpread';
import { photoAlbumManager } from '../../utils/photoAlbumManager';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { CAMERA } from '../../constants';
import type { Photo } from '../../types';

interface PhotoAlbumContentProps {
  theme: BookThemeConfig;
}

/**
 * Photo Album book content — sepia-tinted thumbnails, 5 photos per page-spread.
 * Clicking a thumbnail opens a detail view within the book pages.
 */
const PhotoAlbumContent: React.FC<PhotoAlbumContentProps> = ({ theme }) => {
  const [photos, setPhotos] = useState<Photo[]>(() => photoAlbumManager.getAlbumPhotos());
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Re-fetch when a new photo is sent to the album
  useEffect(() => {
    return eventBus.on(GameEvent.PHOTO_SENT_TO_ALBUM, () => {
      setPhotos(photoAlbumManager.getAlbumPhotos());
    });
  }, []);

  const PHOTOS_PER_SPREAD = CAMERA.ALBUM_PHOTOS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_SPREAD));
  const pagePhotos = photos.slice(pageIndex * PHOTOS_PER_SPREAD, (pageIndex + 1) * PHOTOS_PER_SPREAD);

  const handleRename = (photo: Photo, newName: string) => {
    photoAlbumManager.updatePhotoName(photo.id, newName);
    // Optimistically update local state
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, photoName: newName } : p)));
    if (selectedPhoto?.id === photo.id) {
      setSelectedPhoto((prev) => prev ? { ...prev, photoName: newName } : prev);
    }
  };

  // ── Left page: thumbnails grid ──────────────────────────────────────────
  const leftContent = (
    <div
      style={{
        fontFamily: theme.fontBody,
        color: theme.textPrimary,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <h2 style={{ fontFamily: theme.fontHeading, color: theme.accentPrimary, fontSize: '1.1rem', margin: 0 }}>
        {theme.headerIcon} My Album
      </h2>
      {photos.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: theme.textMuted }}>
          <span style={{ fontSize: '2.5rem' }}>📷</span>
          <p style={{ textAlign: 'center', fontSize: '0.85rem' }}>
            No photos yet.<br />Take photos with your camera<br />and send them here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', alignContent: 'start' }}>
          {pagePhotos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              style={{
                border: `2px solid ${selectedPhoto?.id === photo.id ? theme.accentPrimary : theme.accentSecondary}`,
                borderRadius: '4px',
                padding: '2px',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <img
                src={photo.dataUrl}
                alt={photo.photoName}
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  filter: 'sepia(0.85)',
                }}
              />
              <span style={{ fontSize: '0.6rem', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {photo.photoName}
              </span>
            </button>
          ))}
        </div>
      )}
      <div style={{ fontSize: '0.65rem', color: theme.textMuted, textAlign: 'center' }}>
        {photos.length} photo{photos.length !== 1 ? 's' : ''} · Page {pageIndex + 1}/{totalPages}
      </div>
    </div>
  );

  // ── Right page: detail view ─────────────────────────────────────────────
  const rightContent = selectedPhoto ? (
    <div
      style={{
        fontFamily: theme.fontBody,
        color: theme.textPrimary,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <img
        src={selectedPhoto.dataUrl}
        alt={selectedPhoto.photoName}
        style={{
          width: '100%',
          borderRadius: '4px',
          border: `2px solid ${theme.accentSecondary}`,
          filter: 'sepia(1)',
          objectFit: 'cover',
          maxHeight: '55%',
        }}
      />
      {/* Editable name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.65rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Photo Name
        </label>
        <input
          type="text"
          value={selectedPhoto.photoName}
          onChange={(e) => handleRename(selectedPhoto, e.target.value)}
          maxLength={40}
          style={{
            background: 'rgba(255,255,255,0.5)',
            border: `1px solid ${theme.accentPrimary}`,
            borderRadius: '4px',
            padding: '4px 6px',
            fontSize: '0.8rem',
            color: theme.textPrimary,
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {/* Metadata */}
      <div style={{ fontSize: '0.65rem', color: theme.textMuted, display: 'flex', justifyContent: 'space-between' }}>
        <span>Exposure #{selectedPhoto.exposureNumber}</span>
        <span>{new Date(selectedPhoto.takenAt).toLocaleDateString('en-GB')}</span>
      </div>
      <button
        onClick={() => setSelectedPhoto(null)}
        style={{
          marginTop: 'auto',
          background: 'transparent',
          border: `1px solid ${theme.accentSecondary}`,
          borderRadius: '4px',
          padding: '4px',
          fontSize: '0.7rem',
          color: theme.textSecondary,
          cursor: 'pointer',
        }}
      >
        ← Back to album
      </button>
    </div>
  ) : (
    <div style={{ fontFamily: theme.fontBody, color: theme.textMuted, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', textAlign: 'center' }}>
      <p>Select a photo<br />to view it here</p>
    </div>
  );

  return (
    <BookSpread
      theme={theme}
      leftPageContent={leftContent}
      rightPageContent={rightContent}
      leftPageNumber={pageIndex * 2 + 1}
      rightPageNumber={pageIndex * 2 + 2}
      totalPages={totalPages * 2}
      canGoPrev={pageIndex > 0}
      canGoNext={pageIndex < totalPages - 1}
      onPrevPage={() => { setPageIndex((p) => p - 1); setSelectedPhoto(null); }}
      onNextPage={() => { setPageIndex((p) => p + 1); setSelectedPhoto(null); }}
    />
  );
};

export default PhotoAlbumContent;
