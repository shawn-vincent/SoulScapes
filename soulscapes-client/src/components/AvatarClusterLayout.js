// src/components/AvatarClusterLayout.js
import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  forceSimulation,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force';
import AvatarLayout from './AvatarLayout'; // Base layout (does not render controls itself)
import ZoomControl from './ZoomControl';
import styles from './AvatarClusterLayout.module.css';

const AvatarClusterLayout = ({ children, avatarSize = 80, margin = 20 }) => {
  const outerRef = useRef(null); // Outer scrollable container
  const [initialDimensions, setInitialDimensions] = useState(null);
  const [maxDimensions, setMaxDimensions] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [contentSize, setContentSize] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [scrollButtons, setScrollButtons] = useState({
    top: false,
    bottom: false,
    left: false,
    right: false,
  });

  // Memoize children array.
  const childArray = useMemo(() => React.Children.toArray(children), [children]);

  // Helper: Compute bounding box of nodes.
  const computeBoundingBox = (nodesArr) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodesArr.forEach((node) => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    return { minX, maxX, minY, maxY };
  };

  // Helper: Update contentSize based on nodes and maxDimensions.
  const updateContentSize = (nodesArr) => {
    if (!maxDimensions || nodesArr.length === 0) return;
    const { width: containerWidth, height: containerHeight } = maxDimensions;
    const { minX, maxX, minY, maxY } = computeBoundingBox(nodesArr);
    const computedWidth = (maxX - minX) + 2 * margin;
    const computedHeight = (maxY - minY) + 2 * margin;
    const contentWidth = Math.max(computedWidth, containerWidth);
    const contentHeight = Math.max(computedHeight, containerHeight);
    // Instead of using the computed bounding box to compute offsets,
    // we align the center of nodes to the container center.
    const containerCenterX = containerWidth / 2;
    const containerCenterY = containerHeight / 2;
    const nodesCenterX = (minX + maxX) / 2;
    const nodesCenterY = (minY + maxY) / 2;
    const offsetX = containerCenterX - nodesCenterX;
    const offsetY = containerCenterY - nodesCenterY;
    setContentSize({ width: contentWidth, height: contentHeight, offsetX, offsetY });
  };

  // Helper: Update scroll button visibility using current container scroll.
  const updateScrollButtons = (nodesArr) => {
    if (!outerRef.current || nodesArr.length === 0) return;
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = outerRef.current;
    const { minX, maxX, minY, maxY } = computeBoundingBox(nodesArr);
    // Adjust bounding box by the computed offsets.
    const boxLeft = minX + contentSize.offsetX;
    const boxRight = maxX + contentSize.offsetX;
    const boxTop = minY + contentSize.offsetY;
    const boxBottom = maxY + contentSize.offsetY;
    setScrollButtons({
      left: boxLeft < scrollLeft,
      right: boxRight > scrollLeft + clientWidth,
      top: boxTop < scrollTop,
      bottom: boxBottom > scrollTop + clientHeight,
    });
  };

  // Effect 1: On mount, measure the container dimensions.
  useEffect(() => {
    if (outerRef.current) {
      const { clientWidth, clientHeight } = outerRef.current;
      const dims = { width: clientWidth, height: clientHeight };
      if (!initialDimensions) {
        setInitialDimensions(dims);
        setMaxDimensions(dims);
      }
    }
  }, [initialDimensions]);

  // Effect 2: Use ResizeObserver to update maxDimensions if container grows.
  useEffect(() => {
    if (!outerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { clientWidth, clientHeight } = entry.target;
        setMaxDimensions((prev) => {
          const newDims = {
            width: Math.max(prev ? prev.width : 0, clientWidth),
            height: Math.max(prev ? prev.height : 0, clientHeight),
          };
          // Also update scroll buttons when container size changes.
          updateScrollButtons(nodes);
          return newDims;
        });
      }
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, [nodes]);

  // Effect 3: Run the force simulation once when the children change.
  useEffect(() => {
    if (!initialDimensions || childArray.length === 0) return;
    const { width, height } = initialDimensions;
    const initialNodes = childArray.map((child, i) => ({
      id: i,
      x: width / 2,
      y: height / 2,
    }));
    setNodes(initialNodes);

    const simulation = forceSimulation(initialNodes)
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(avatarSize / 2 + 5))
      .force('x', forceX(width / 2).strength(0.05))
      .force('y', forceY(height / 2).strength(0.05));

    simulation.on('tick', () => {
      const currentNodes = [...simulation.nodes()];
      setNodes(currentNodes);
      updateContentSize(currentNodes);
      updateScrollButtons(currentNodes);
    });

    const timer = setTimeout(() => simulation.stop(), 2000);
    return () => {
      clearTimeout(timer);
      simulation.stop();
    };
  }, [childArray.length, initialDimensions, avatarSize]);

  // Effect 4: Listen to scroll events to update scroll button visibility.
  useEffect(() => {
    const handleScroll = () => updateScrollButtons(nodes);
    if (outerRef.current) {
      outerRef.current.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (outerRef.current) {
        outerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [nodes, contentSize]);

  // Scroll function: scroll 75% of container's width/height.
  const scrollByAmount = (dx, dy) => {
    if (outerRef.current) {
      outerRef.current.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.container}>
      {/* Outer scrollable container for simulation content */}
      <div className={styles.outerContainer} ref={outerRef}>
        <div
          className={styles.simulationContent}
          style={{
            width: contentSize.width,
            height: contentSize.height,
            position: 'relative',
          }}
        >
          {nodes.map((node, i) => (
            <div
              key={node.id}
              className={styles.avatarWrapper}
              style={{
                position: 'absolute',
                left: node.x - avatarSize / 2 + contentSize.offsetX,
                top: node.y - avatarSize / 2 + contentSize.offsetY,
                width: avatarSize,
                height: avatarSize,
              }}
            >
              {childArray[i]}
            </div>
          ))}
        </div>
      </div>

      {/* Overlay controls: scroll buttons and zoom control are rendered relative to .container */}
      <div className={styles.overlayControls}>
        {scrollButtons.top && (
          <button
            className={`${styles.scrollButton} ${styles.topButton}`}
            onClick={() => {
              const h = outerRef.current.clientHeight;
              scrollByAmount(0, -0.75 * h);
            }}
          >
            &#9650;
          </button>
        )}
        {scrollButtons.bottom && (
          <button
            className={`${styles.scrollButton} ${styles.bottomButton}`}
            onClick={() => {
              const h = outerRef.current.clientHeight;
              scrollByAmount(0, 0.75 * h);
            }}
          >
            &#9660;
          </button>
        )}
        {scrollButtons.left && (
          <button
            className={`${styles.scrollButton} ${styles.leftButton}`}
            onClick={() => {
              const w = outerRef.current.clientWidth;
              scrollByAmount(-0.75 * w, 0);
            }}
          >
            &#9664;
          </button>
        )}
        {scrollButtons.right && (
          <button
            className={`${styles.scrollButton} ${styles.rightButton}`}
            onClick={() => {
              const w = outerRef.current.clientWidth;
              scrollByAmount(0.75 * w, 0);
            }}
          >
            &#9654;
          </button>
        )}
      </div>

      {/* Overlay Zoom Control: rendered relative to the container (top-right) */}
      <div className={styles.zoomControlWrapper}>
        <ZoomControl />
      </div>
    </div>
  );
    
};

AvatarClusterLayout.propTypes = {
  children: PropTypes.node,
  avatarSize: PropTypes.number,
  margin: PropTypes.number,
};

export default AvatarClusterLayout;
