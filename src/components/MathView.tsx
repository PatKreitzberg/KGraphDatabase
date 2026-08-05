import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathViewProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, displayMode = false, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math || '0', containerRef.current, {
          displayMode,
          throwOnError: false,
        });
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.textContent = math;
        }
      }
    }
  }, [math, displayMode]);

  return <span ref={containerRef} className={`inline-block font-serif ${className}`} />;
};
