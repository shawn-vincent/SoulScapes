// src/components/AvatarHorizontalGridLayout.js
import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import AvatarLayout from './AvatarLayout';
import styles from './AvatarHorizontalGridLayout.module.css';

const AvatarHorizontalGridLayout = ({ children, avatarSize = 80, gap = 10 }) => {
  const containerRef = useRef(null);
  const [rows, setRows] = useState(1);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Update the number of rows that can fit in the container.
  const updateRows = () => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      // Each row requires avatarSize plus gap (except possibly the last one)
      const newRows = Math.max(1, Math.floor((containerHeight + gap) / (avatarSize + gap)));
      setRows(newRows);
    }
  };

  // Update the visibility of scroll buttons based on scroll position.
  const updateScrollButtons = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  // Set up ResizeObserver and scroll listener.
  useEffect(() => {
    if (!containerRef.current) return;

    updateRows();
    updateScrollButtons();

    const resizeObserver = new ResizeObserver(() => {
      updateRows();
      updateScrollButtons();
    });
    resizeObserver.observe(containerRef.current);

    const currentContainer = containerRef.current;
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
    if (containerRef.current) {
      const amount = containerRef.current.clientWidth * 0.75;
      containerRef.current.scrollBy({ left: direction * amount, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.scrollContainer}>
      {showLeft && (
        <button
          className={`${styles.scrollButton} ${styles.leftButton}`}
          onClick={() => scrollByAmount(-1)}
        >
          {/* Unicode left arrow (you can replace this with an icon component if desired) */}
          &#9664;
        </button>
      )}
      {showRight && (
        <button
          className={`${styles.scrollButton} ${styles.rightButton}`}
          onClick={() => scrollByAmount(1)}
        >
          {/* Unicode right arrow */}
          &#9654;
        </button>
      )}
      <AvatarLayout
        className={styles.avatarHorizontalGrid}
        style={{
          '--grid-rows': rows,
          '--avatar-size': `${avatarSize}px`,
          '--avatar-gap': `${gap}px`
        }}
        ref={containerRef}
      >
        {children}
      </AvatarLayout>
    </div>
  );
};

AvatarHorizontalGridLayout.propTypes = {
  children: PropTypes.node,
  avatarSize: PropTypes.number,
  gap: PropTypes.number,
};

export default AvatarHorizontalGridLayout;
