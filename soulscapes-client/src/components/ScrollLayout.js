import { slog, serror, sdebug, swarn } from '../../../shared/slogging.js';
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ScrollLayout.module.css';
import { MagnifyingGlassPlus, ArrowsOutSimple, MagnifyingGlassMinus } from '@phosphor-icons/react';

// Helper to interpret both boolean and string "true" as true
const isTrue = (val) => val === true || val === 'true';

// Debug flag
const DebugScrolling = false;

const ScrollLayout = ({ children, top = true, bottom = true, left = true, right = true }) => {
  const containerRef = useRef(null);

  // State to track if the container can scroll in each direction
  const [canScroll, setCanScroll] = useState({
    top: false,
    bottom: false,
    left: false,
    right: false,
  });

  // State for the current zoom level (1 means 100%)
  const [scale, setScale] = useState(1);

  // Function to update the scroll button state
  const updateScrollButtons = () => {
      const container = containerRef.current;
      if (container) {
	  const {
              scrollTop,
              scrollLeft,
              scrollHeight,
              scrollWidth,
              clientHeight,
              clientWidth,
	  } = container;
	  
	  
	  const canUp = scrollTop > 0;
	  const canDown = scrollTop + clientHeight < scrollHeight;
	  const canLeft = scrollLeft > 0;
	  const canRight = scrollLeft + clientWidth < scrollWidth;
	  
	  // Debugging: log the measurements
	  if (DebugScrolling)
	      slog('Measurements:', { canUp, canDown, canLeft, canRight,
					     scrollTop, scrollLeft, scrollHeight, scrollWidth,
					     clientHeight, clientWidth });
	  setCanScroll({
	      top: canUp,
	      bottom: canDown,
	      left: canLeft,
	      right: canRight,
	  });
      }
  };

  // Use useLayoutEffect so that measurements are taken immediately after rendering
  useLayoutEffect(() => {
    updateScrollButtons();
  }, [children, scale]); // re-run when children or zoom scale changes

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Listen to scroll events on the container
    container.addEventListener('scroll', updateScrollButtons);

    // Listen to window resize events
    window.addEventListener('resize', updateScrollButtons);

    // Use ResizeObserver to detect size changes of the container
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(container);
    }

    // Initial update
    updateScrollButtons();

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [children, scale]);

  // Function to scroll by a given amount
  const scrollByAmount = (dx, dy) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: dx,
        top: dy,
        behavior: 'smooth',
      });
    }
  };

  // Zoom callbacks: adjust the scale by 10% per click
  const onZoomIn = () => {
    setScale((prev) => prev * 1.1);
  };
  const onZoomOut = () => {
    setScale((prev) => prev * 0.9);
  };
      // Zoom Fit: adjust the scale so that the content fits in the container
  const onZoomFit = () => {
    const container = containerRef.current;
    if (!container) return;
    // Assume the zoomable content is the first child of the container.
    const content = container.firstChild;
    if (!content) return;

    // Get the available dimensions from the container.
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Use scrollWidth/scrollHeight of the content element as the natural (untransformed) dimensions.
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    // Compute the new scale so that the entire content fits:
    const newScale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight)-0.01;

      slog('Zoom fit:', { containerWidth, containerHeight,
				 contentWidth, contentHeight,
				 newScale });

    setScale(newScale);
  };


  return (
    <div className={styles.scrollLayoutWrapper} >
      {/* The scrollable container */}
      <div
        className={styles.scrollContainer}
        ref={containerRef}
      >
        {/* The zoomable container */}
        <div
            className={styles.zoomableContent}
	    
          style={{
            transform: `scale(${scale})`,
		transformOrigin: 'top left',
		width: `${scale * 100}%`,
		height: `${scale * 100}%`,
		transition: 'transform 0.2s ease',
		border: (DebugScrolling ? 'solid green 5px' : '')
          }}
        >
         {children}
        </div>
      </div>

      {/* Overlay controls */}
      <div className={styles.overlayControls}>
        <div className={styles.zoomControlWrapper}>
          <div className={styles.zoomControl}>
            <button className={styles.zoomSection} onClick={onZoomIn}>
              <MagnifyingGlassPlus size={16} color="#fff" />
            </button>
            <button className={styles.zoomSection} onClick={onZoomFit}>
              <ArrowsOutSimple size={16} color="#fff" />
            </button>
            <button className={styles.zoomSection} onClick={onZoomOut}>
              <MagnifyingGlassMinus size={16} color="#fff" />
            </button>
          </div>
        </div>

        {isTrue(top) && canScroll.top && (
          <button
            className={`${styles.scrollButton} ${styles.topButton}`}
            onClick={() => scrollByAmount(0, -0.75 * containerRef.current.clientHeight)}
          >
            &#9650;
          </button>
        )}

        {isTrue(bottom) && canScroll.bottom && (
          <button
            className={`${styles.scrollButton} ${styles.bottomButton}`}
            onClick={() => scrollByAmount(0, 0.75 * containerRef.current.clientHeight)}
          >
            &#9660;
          </button>
        )}

        {isTrue(left) && canScroll.left && (
          <button
            className={`${styles.scrollButton} ${styles.leftButton}`}
            onClick={() => scrollByAmount(-0.75 * containerRef.current.clientWidth, 0)}
          >
            &#9664;
          </button>
        )}

        {isTrue(right) && canScroll.right && (
          <button
            className={`${styles.scrollButton} ${styles.rightButton}`}
            onClick={() => scrollByAmount(0.75 * containerRef.current.clientWidth, 0)}
          >
            &#9654;
          </button>
        )}
      </div>
    </div>
  );
};

ScrollLayout.propTypes = {
  children: PropTypes.node.isRequired,
  top: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  bottom: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  left: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  right: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};

export default ScrollLayout;
