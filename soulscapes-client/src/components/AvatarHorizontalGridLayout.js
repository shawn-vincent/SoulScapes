// src/components/AvatarHorizontalGridLayout.js
import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import AvatarLayout from './AvatarLayout';
import ZoomControl from './ZoomControl';
import styles from './AvatarHorizontalGridLayout.module.css';

const AvatarHorizontalGridLayout = ({ children, initialSize = 80, gap = 10 }) => {
  // State for the current avatar size.
  const [avatarSize, setAvatarSize] = useState(initialSize);
  const scrollContainerRef = useRef(null);
  const [rows, setRows] = useState(1);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Zoom callbacks.
  const handleZoomIn = () => {
    setAvatarSize(prev => prev * 1.1);
  };
  const handleZoomOut = () => {
    setAvatarSize(prev => prev / 1.1);
  };
  const handleZoomFit = () => {
    setAvatarSize(initialSize);
  };

  // Update number of rows based on container height.
  const updateRows = () => {
    if (scrollContainerRef.current) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      const newRows = Math.max(1, Math.floor((containerHeight + gap) / (avatarSize + gap)));
      setRows(newRows);
    }
  };

  // Update scroll button visibility.
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

  // Simple scroll function.
  const scrollByAmount = (direction) => {
    if (scrollContainerRef.current) {
      const amount = scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({ left: direction * amount, behavior: 'smooth' });
    }
  };

  // Clone children to pass the updated size prop.
  const updatedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { size: avatarSize });
    }
    return child;
  });

  return (
    <div className={styles.container}>
      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        <AvatarLayout
          className={styles.avatarHorizontalGrid}
          style={{
            '--grid-rows': rows,
            '--avatar-size': `${avatarSize}px`,
            '--avatar-gap': `${gap}px`,
          }}
        >
          {updatedChildren}
        </AvatarLayout>
      </div>

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

      <div className={styles.zoomControlWrapper}>
        <ZoomControl
          onZoomIn={handleZoomIn}
          onZoomFit={handleZoomFit}
          onZoomOut={handleZoomOut}
        />
      </div>
    </div>
  );
};

AvatarHorizontalGridLayout.propTypes = {
  children: PropTypes.node,
  initialSize: PropTypes.number,
  gap: PropTypes.number,
};

export default AvatarHorizontalGridLayout;
