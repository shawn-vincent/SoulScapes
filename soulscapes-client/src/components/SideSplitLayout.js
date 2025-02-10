import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ArrowsLeftRight } from '@phosphor-icons/react';

const SideSplitLayout = ({
  initialRatio = 0.5,
  minRatio = 0.1,
  maxRatio = 0.9,
  children,
  firstPaneLabel = 'First Panel',
  secondPaneLabel = 'Second Panel',
}) => {
  const containerRef = useRef(null);
  const dividerRef = useRef(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [isMobileWidth, setIsMobileWidth] = useState(false);
  const [activePane, setActivePane] = useState('first');
  const step = 0.02;

  useEffect(() => {
    const checkWidth = () => {
      const isNarrow = window.innerWidth < 768;
      setIsMobileWidth(isNarrow);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    let newRatio = offsetX / rect.width;
    newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
    setRatio(newRatio);
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (dividerRef.current) {
      dividerRef.current.focus();
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleKeyDown = (e) => {
    let newRatio = ratio;
    if (e.key === 'ArrowLeft') {
      newRatio = Math.max(minRatio, ratio - step);
    } else if (e.key === 'ArrowRight') {
      newRatio = Math.min(maxRatio, ratio + step);
    }
    if (newRatio !== ratio) {
      e.preventDefault();
      setRatio(newRatio);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    let newRatio = ratio;
    if (e.deltaY < 0) {
      newRatio = Math.max(minRatio, ratio - step);
    } else if (e.deltaY > 0) {
      newRatio = Math.min(maxRatio, ratio + step);
    }
    setRatio(newRatio);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Mobile layout
  if (isMobileWidth) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex h-10 border-b bg-gray-100">
          <button
            className={`flex-1 h-full px-4 text-sm font-medium transition-colors ${
              activePane === 'first'
                ? 'bg-white border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActivePane('first')}
          >
            {firstPaneLabel}
          </button>
          <button
            className={`flex-1 h-full px-4 text-sm font-medium transition-colors ${
              activePane === 'second'
                ? 'bg-white border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActivePane('second')}
          >
            {secondPaneLabel}
          </button>
        </div>
        <div className="flex-1 relative">
          <div 
            className="absolute inset-0 overflow-auto"
            style={{ display: activePane === 'first' ? 'block' : 'none' }}
          >
            {children[0]}
          </div>
          <div 
            className="absolute inset-0 overflow-auto"
            style={{ display: activePane === 'second' ? 'block' : 'none' }}
          >
            {children[1]}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-full flex" ref={containerRef}>
      <div 
        className="overflow-auto"
        style={{ width: `${ratio * 100}%` }}
      >
        {children[0]}
      </div>
      <div
        className="w-1.5 flex-shrink-0 bg-black/50 relative overflow-visible cursor-col-resize"
        ref={dividerRef}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        role="separator"
        tabIndex={0}
        aria-valuemin={minRatio * 100}
        aria-valuemax={maxRatio * 100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="Resize panel divider. Use arrow keys or scroll to adjust split."
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
          <ArrowsLeftRight size={16} weight="regular" color="#fff" />
        </div>
      </div>
      <div 
        className="overflow-auto"
        style={{ width: `${(1 - ratio) * 100}%` }}
      >
        {children[1]}
      </div>
    </div>
  );
};

SideSplitLayout.propTypes = {
  initialRatio: PropTypes.number,
  minRatio: PropTypes.number,
  maxRatio: PropTypes.number,
  children: PropTypes.arrayOf(PropTypes.node).isRequired,
  firstPaneLabel: PropTypes.string,
  secondPaneLabel: PropTypes.string,
};

export default SideSplitLayout;
