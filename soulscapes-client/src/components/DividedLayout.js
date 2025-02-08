// src/components/DividedLayout.js
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ArrowsDownUp, ArrowsLeftRight } from '@phosphor-icons/react';
import styles from './DividedLayout.module.css';

const DividedLayout = ({
  orientation = 'vertical',      // 'vertical' (left/right) or 'horizontal' (top/bottom)
  initialPrimaryRatio = 0.5,       // fraction of space for the first pane
  minRatio = 0.1,
  maxRatio = 0.9,
  children,                      // expects exactly two children
}) => {
  const containerRef = useRef(null);
  const dividerRef = useRef(null);
  const [primaryRatio, setPrimaryRatio] = useState(initialPrimaryRatio);
  const step = 0.02; // step increment for keyboard and wheel events

  // --- Mouse drag support ---
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newRatio;
    if (orientation === 'vertical') {
      const offsetX = e.clientX - rect.left;
      newRatio = offsetX / rect.width;
    } else {
      const offsetY = e.clientY - rect.top;
      newRatio = offsetY / rect.height;
    }
    if (newRatio < minRatio) newRatio = minRatio;
    if (newRatio > maxRatio) newRatio = maxRatio;
    setPrimaryRatio(newRatio);
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    // Focus the divider on interaction so that keyboard events work immediately.
    if (dividerRef.current) {
      dividerRef.current.focus();
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- Keyboard support ---
  const handleKeyDown = (e) => {
    let newRatio = primaryRatio;
    if (orientation === 'vertical') {
      if (e.key === 'ArrowLeft') {
        newRatio -= step;
      } else if (e.key === 'ArrowRight') {
        newRatio += step;
      }
    } else {
      if (e.key === 'ArrowUp') {
        newRatio -= step;
      } else if (e.key === 'ArrowDown') {
        newRatio += step;
      }
    }
    if (newRatio < minRatio) newRatio = minRatio;
    if (newRatio > maxRatio) newRatio = maxRatio;
    if (newRatio !== primaryRatio) {
      e.preventDefault();
      setPrimaryRatio(newRatio);
    }
  };

  // --- Mouse wheel support ---
  const handleWheel = (e) => {
    let newRatio = primaryRatio;
    // For both orientations, a scroll-up (negative deltaY) decreases the ratio.
    if (e.deltaY < 0) {
      newRatio -= step;
    } else if (e.deltaY > 0) {
      newRatio += step;
    }
    if (newRatio < minRatio) newRatio = minRatio;
    if (newRatio > maxRatio) newRatio = maxRatio;
    if (newRatio !== primaryRatio) {
      e.preventDefault();
      setPrimaryRatio(newRatio);
    }
  };

  // Clean up event listeners if the component unmounts mid-drag.
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- Compute inline styles for the two panes ---
  let firstPaneStyle = {};
  let secondPaneStyle = {};
  if (orientation === 'vertical') {
    firstPaneStyle = { width: `${primaryRatio * 100}%` };
    secondPaneStyle = { width: `${(1 - primaryRatio) * 100}%` };
  } else {
    firstPaneStyle = { height: `${primaryRatio * 100}%` };
    secondPaneStyle = { height: `${(1 - primaryRatio) * 100}%` };
  }

  return (
    <div
      className={styles.container}
      ref={containerRef}
      data-orientation={orientation}
    >
      <div className={styles.firstPane} style={firstPaneStyle}>
        {children[0]}
      </div>
      <div
        className={styles.divider}
        ref={dividerRef}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        role="separator"
        tabIndex={0}
        aria-orientation={orientation}
        aria-valuemin={minRatio * 100}
        aria-valuemax={maxRatio * 100}
        aria-valuenow={Math.round(primaryRatio * 100)}
        aria-label={`Resize panel divider. Use arrow keys or scroll to adjust ${orientation} split.`}
      >
        <div className={styles.dividerHandle}>
          {orientation === 'vertical' ? (
            <ArrowsLeftRight size={16} weight="regular" color="#fff" />
          ) : (
            <ArrowsDownUp size={16} weight="regular" color="#fff" />
          )}
        </div>
      </div>
      <div className={styles.secondPane} style={secondPaneStyle}>
        {children[1]}
      </div>
    </div>
  );
};

DividedLayout.propTypes = {
  orientation: PropTypes.oneOf(['vertical', 'horizontal']),
  initialPrimaryRatio: PropTypes.number,
  minRatio: PropTypes.number,
  maxRatio: PropTypes.number,
  children: PropTypes.arrayOf(PropTypes.node).isRequired,
};

export default DividedLayout;
