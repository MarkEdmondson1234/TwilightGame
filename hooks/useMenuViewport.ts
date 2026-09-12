import { useEffect, useState } from 'react';

/** The visible browser area, including keyboard and toolbar changes. */
export function useMenuViewport() {
  const read = () => {
    const viewport = window.visualViewport;
    return {
      top: viewport?.offsetTop ?? 0,
      left: viewport?.offsetLeft ?? 0,
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    };
  };
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const update = () => setViewport(read());
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', update);
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
  return viewport;
}
