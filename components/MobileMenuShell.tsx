import React from 'react';
import { useMenuViewport } from '../hooks/useMenuViewport';

/** Shared viewport boundary; existing illustrated panels supply their own contents. */
export default function MobileMenuShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const viewport = useMenuViewport();
  return (
    <div
      data-game-ui
      className={`fixed flex items-center justify-center overflow-hidden ${className}`}
      style={{
        ...viewport,
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(8px, env(safe-area-inset-left))',
        paddingRight: 'max(8px, env(safe-area-inset-right))',
      }}
    >
      {children}
    </div>
  );
}
