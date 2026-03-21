import React, { useEffect, useRef } from 'react';
import { Photo } from '../types';
import { Z_MODAL, zStyle } from '../zIndex';

interface PhotoViewerProps {
  photo: Photo;
  onClose: () => void;
  /** If provided, a "Send to Album" button is shown (for inventory photos). */
  onSendToAlbum?: () => void;
  /** If provided, a "Delete" button is shown (for inventory photos). */
  onDelete?: () => void;
  /** Called when the user edits the photo name. */
  onRename: (newName: string) => void;
}

/**
 * Full-size photo viewer.
 *
 * Used both from the inventory (with Send to Album) and from the album
 * (read-ish mode — name still editable, but no Send to Album button).
 */
const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  onClose,
  onSendToAlbum,
  onDelete,
  onRename,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center"
      style={zStyle(Z_MODAL)}
      onClick={onClose}
    >
      <div
        className="bg-amber-950 border-4 border-amber-700 rounded-lg p-5 max-w-md w-[92vw] flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-amber-200 font-bold text-lg">📷 Photo</h3>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded"
          >
            ×
          </button>
        </div>

        {/* Photo — sepia applied directly to the img tag */}
        <img
          src={photo.dataUrl}
          alt={photo.photoName}
          style={{ filter: 'sepia(1)' }}
          className="w-full rounded border-2 border-amber-800 block"
        />

        {/* Editable name */}
        <div className="flex flex-col gap-1">
          <label className="text-amber-400 text-xs uppercase tracking-wider">Photo Name</label>
          <input
            ref={inputRef}
            type="text"
            value={photo.photoName}
            onChange={(e) => onRename(e.target.value)}
            maxLength={40}
            className="bg-amber-900 border border-amber-700 rounded px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Metadata */}
        <div className="text-amber-500 text-xs flex justify-between">
          <span>Exposure #{photo.exposureNumber}</span>
          <span>{new Date(photo.takenAt).toLocaleDateString('en-GB')}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {onSendToAlbum && (
            <button
              onClick={onSendToAlbum}
              className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-semibold px-4 py-2 rounded transition-colors min-h-[44px]"
            >
              Send to Album
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-semibold px-4 py-2 rounded transition-colors min-h-[44px]"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-amber-200 font-semibold px-4 py-2 rounded transition-colors min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoViewer;
