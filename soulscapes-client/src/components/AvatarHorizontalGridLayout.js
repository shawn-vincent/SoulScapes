// src/components/AvatarHorizontalGridLayout.js
import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import AvatarLayout from './AvatarLayout';
import ZoomControl from './ZoomControl';
import styles from './AvatarHorizontalGridLayout.module.css';

const AvatarHorizontalGridLayout = ({ children, avatarSize = 80, gap = 10 }) => {
  const scrollContainerRef = useRef(null);
  const [rows, setRows] = useState(1);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Update number of rows that can fit in the container.
  const updateRows = () => {
    if (scrollContainerRef.current) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      // Each row requires avatarSize + gap (except possibly the last row)
      const newRows = Math.max(1, Math.floor((containerHeight + gap) / (avatarSize + gap)));
      setRows(newRows);
    }
  };

  // Update visibility of scroll buttons based on scroll position.
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    updateRows();
    updateScrollButtons();

    const resizeObserver = new ResizeObserver(() => {
      updateRows();
      updateScrollButtons();
    });
    resizeObserver.observe(scrollContainerRef.current);

    const currentContainer = scrollContainerRef.current;
    currentContainer.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      resizeObserver.disconnect();
      currentContainer.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [avatarSize, gap]);

  // Scroll by 75% of the container's width.
  const scrollByAmount = (direction) => {
    if (scrollContainerRef.current) {
      const amount = scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({ left: direction * amount, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.container}>
      {/* The scrollable container */}
      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        <AvatarLayout
          className={styles.avatarHorizontalGrid}
          style={{
            '--grid-rows': rows,
            '--avatar-size': `${avatarSize}px`,
            '--avatar-gap': `${gap}px`
          }}
        >
          {children}
        </AvatarLayout>
      </div>

      {/* Left and Right scroll buttons */}
      {showLeft && (
        <button
          className={`${styles.scrollButton} ${styles.leftButton}`}
          onClick={() => scrollByAmount(-1)}
        >
          &#9664;
        </button>
      )}
      {showRight && (
        <button
          className={`${styles.scrollButton} ${styles.rightButton}`}
          onClick={() => scrollByAmount(1)}
        >
          &#9654;
        </button>
      )}

      {/* Zoom control – note its position (inset) is now swapped relative to the right scroll */}
      <div className={styles.zoomControlWrapper}>
        <ZoomControl />
      </div>
    </div>
  );
};

AvatarHorizontalGridLayout.propTypes = {
  children: PropTypes.node,
  avatarSize: PropTypes.number,
  gap: PropTypes.number,
};

export default AvatarHorizontalGridLayout;
