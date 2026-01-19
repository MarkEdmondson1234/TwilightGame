import { useState, useCallback, useMemo } from 'react';

/**
 * Chapter definition for the book navigation
 */
export interface BookChapter<T = string> {
  id: T;
  label: string;
  icon: string;
  locked?: boolean;
}

/**
 * Page within a chapter containing items to display
 */
export interface BookPage<ItemType> {
  items: ItemType[];
  pageNumber: number;
  totalPages: number;
}

/**
 * Hook for managing book pagination with chapters
 * Supports flipping through pages within chapters and jumping between chapters
 */
export function useBookPagination<ChapterId extends string, ItemType>(
  chapters: BookChapter<ChapterId>[],
  itemsByChapter: Record<ChapterId, ItemType[]>,
  itemsPerPage: number = 6
) {
  const [currentChapterId, setCurrentChapterId] = useState<ChapterId>(
    chapters[0]?.id ?? ('' as ChapterId)
  );
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Get items for current chapter
  const currentChapterItems = useMemo(() => {
    return itemsByChapter[currentChapterId] ?? [];
  }, [itemsByChapter, currentChapterId]);

  // Calculate total pages for current chapter
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(currentChapterItems.length / itemsPerPage));
  }, [currentChapterItems.length, itemsPerPage]);

  // Get items for current page
  const currentPageItems = useMemo(() => {
    const startIndex = currentPageIndex * itemsPerPage;
    return currentChapterItems.slice(startIndex, startIndex + itemsPerPage);
  }, [currentChapterItems, currentPageIndex, itemsPerPage]);

  // Get current chapter info
  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === currentChapterId) ?? chapters[0];
  }, [chapters, currentChapterId]);

  // Navigate to specific chapter
  const goToChapter = useCallback(
    (chapterId: ChapterId) => {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (chapter && !chapter.locked) {
        setCurrentChapterId(chapterId);
        setCurrentPageIndex(0);
        setSelectedItemIndex(null);
      }
    },
    [chapters]
  );

  // Navigate to next page within chapter
  const nextPage = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      setSelectedItemIndex(null);
    }
  }, [currentPageIndex, totalPages]);

  // Navigate to previous page within chapter
  const prevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
      setSelectedItemIndex(null);
    }
  }, [currentPageIndex]);

  // Go to specific page
  const goToPage = useCallback(
    (pageIndex: number) => {
      if (pageIndex >= 0 && pageIndex < totalPages) {
        setCurrentPageIndex(pageIndex);
        setSelectedItemIndex(null);
      }
    },
    [totalPages]
  );

  // Select an item on the current page
  const selectItem = useCallback((index: number | null) => {
    setSelectedItemIndex(index);
  }, []);

  // Get the currently selected item (if any)
  const selectedItem = useMemo(() => {
    if (selectedItemIndex === null) return null;
    return currentPageItems[selectedItemIndex] ?? null;
  }, [selectedItemIndex, currentPageItems]);

  // Find item in current chapter and navigate to its page
  const findAndSelectItem = useCallback(
    (predicate: (item: ItemType) => boolean) => {
      const itemIndex = currentChapterItems.findIndex(predicate);
      if (itemIndex !== -1) {
        const pageIndex = Math.floor(itemIndex / itemsPerPage);
        const indexOnPage = itemIndex % itemsPerPage;
        setCurrentPageIndex(pageIndex);
        setSelectedItemIndex(indexOnPage);
        return true;
      }
      return false;
    },
    [currentChapterItems, itemsPerPage]
  );

  // Reset pagination state
  const reset = useCallback(() => {
    setCurrentChapterId(chapters[0]?.id ?? ('' as ChapterId));
    setCurrentPageIndex(0);
    setSelectedItemIndex(null);
  }, [chapters]);

  return {
    // Current state
    currentChapterId,
    currentChapter,
    currentPageIndex,
    currentPageItems,
    selectedItemIndex,
    selectedItem,
    totalPages,

    // Navigation
    goToChapter,
    nextPage,
    prevPage,
    goToPage,
    selectItem,
    findAndSelectItem,
    reset,

    // Helpers
    canGoNext: currentPageIndex < totalPages - 1,
    canGoPrev: currentPageIndex > 0,
    hasItems: currentChapterItems.length > 0,
    totalItemsInChapter: currentChapterItems.length,
  };
}
