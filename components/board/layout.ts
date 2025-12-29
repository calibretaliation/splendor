import { useEffect, useRef, useState } from 'react';

export type BoardLayout = 'mobilePortrait' | 'mobileLandscape' | 'tablet' | 'desktop';

const MOBILE_WIDTH = 720;
const TABLET_WIDTH = 1180;
const MOBILE_HEIGHT = 640;
const TABLET_HEIGHT = 860;

const evaluateLayout = (): BoardLayout => {
  if (typeof window === 'undefined') return 'desktop';
  const { innerWidth: width, innerHeight: height } = window;
  const isLandscape = width >= height;

  if (width <= MOBILE_WIDTH || height <= MOBILE_HEIGHT) {
    return isLandscape ? 'mobileLandscape' : 'mobilePortrait';
  }

  if (width <= TABLET_WIDTH || height <= TABLET_HEIGHT) {
    return 'tablet';
  }

  return 'desktop';
};

export const useBoardLayout = (): BoardLayout => {
  const [layout, setLayout] = useState<BoardLayout>(evaluateLayout);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setLayout(prev => {
          const next = evaluateLayout();
          return prev === next ? prev : next;
        });
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return layout;
};
