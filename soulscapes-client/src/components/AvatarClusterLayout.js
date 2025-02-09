import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force';
import AvatarLayout from './AvatarLayout';
import ZoomControl from './ZoomControl';
import styles from './AvatarClusterLayout.module.css';

const AvatarClusterLayout = ({ children, initialSize = 80, margin = 20 }) => {
  // State for the current avatar size.
  const [avatarSize, setAvatarSize] = useState(initialSize);

  // Zoom callbacks.
  const handleZoomIn = () => setAvatarSize((prev) => prev * 1.1);
  const handleZoomOut = () => setAvatarSize((prev) => prev / 1.1);
  const handleZoomFit = () => setAvatarSize(initialSize);

  // Container measurement.
  const outerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!outerRef.current) return;
    const updateSize = () => {
      if (!outerRef.current) return;
      const { clientWidth, clientHeight } = outerRef.current;
      if (clientWidth && clientHeight) {
        setContainerSize({ width: clientWidth, height: clientHeight });
      }
    };
    updateSize();
    const resizeObs = new ResizeObserver(() => updateSize());
    resizeObs.observe(outerRef.current);
    return () => resizeObs.disconnect();
  }, []);

  // Convert children into an array of objects with unique IDs.
  // If the child already has a key, use it; otherwise, generate one.
  const childArray = useMemo(() => {
    return React.Children.toArray(children).map((child, index) => {
      const id = child.key != null ? child.key : `child-${index}`;
      return { id, element: child };
    });
  }, [children]);

  // Build a mapping from each child's unique ID to a cloned element (with updated avatar size).
  const updatedChildMap = useMemo(() => {
    const map = {};
    childArray.forEach((child) => {
      map[child.id] = React.cloneElement(child.element, { size: avatarSize });
    });
    return map;
  }, [childArray, avatarSize]);

  // State for simulation nodes.
  const [nodes, setNodes] = useState([]);

  // For overlay scroll/size calculations.
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

  // Utility: Compute bounding box.
  const computeBoundingBox = (nodesArr) => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodesArr.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });
    return { minX, maxX, minY, maxY };
  };

  // Utility: Update content size (for scroll overlays).
  const updateContentSize = (nodeArr) => {
    if (!containerSize.width || !containerSize.height || nodeArr.length === 0) return;
    const { minX, maxX, minY, maxY } = computeBoundingBox(nodeArr);
    const computedWidth = maxX - minX + 2 * margin;
    const computedHeight = maxY - minY + 2 * margin;
    const contentWidth = Math.max(computedWidth, containerSize.width);
    const contentHeight = Math.max(computedHeight, containerSize.height);
    const offsetX = containerSize.width / 2 - (minX + maxX) / 2;
    const offsetY = containerSize.height / 2 - (minY + maxY) / 2;
    setContentSize({ width: contentWidth, height: contentHeight, offsetX, offsetY });
  };

  // Utility: Update scroll button state.
  const updateScrollButtons = (nodeArr) => {
    if (!outerRef.current || nodeArr.length === 0) return;
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = outerRef.current;
    const { minX, maxX, minY, maxY } = computeBoundingBox(nodeArr);
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

  // Force simulation strengths.
  const strengthX = 0.1;
  const strengthY = 0.1;
  const strengthCollide = .5;
  const strengthAlpha = 0.3;

  // Initialize simulation and store it in a ref.
  const simulationRef = useRef(null);
  if (!simulationRef.current) {
    simulationRef.current = forceSimulation(
      childArray.map((child) => ({
        id: child.id,
        x: 0,
        y: 0,
        zoomed: false,
      }))
    )
      .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
      .force('x', forceX(0).strength(strengthX))
      .force('y', forceY(0).strength(strengthY))
      .alpha(strengthAlpha);
  }

  // Update simulation when container size or children change.
  useEffect(() => {
    const { width, height } = containerSize;
    if (width === 0 || height === 0 || childArray.length === 0) return;

    const sim = simulationRef.current;
    const currentNodes = sim.nodes();

    // Reclaim existing nodes by matching on the unique ID.
    const newNodes = childArray.map((child) => {
      const existingNode = currentNodes.find((n) => n.id === child.id);
      if (existingNode) {
        return { ...existingNode, id: child.id };
      } else {
        return {
          id: child.id,
          x: width / 2,
          y: height / 2,
          zoomed: false,
        };
      }
    });

    sim.nodes(newNodes)
      .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
      .force('x', forceX(width / 2).strength(strengthX))
      .force('y', forceY(height / 2).strength(strengthY))
      .alpha(strengthAlpha);

    sim.on('tick', () => {
      const currentNodes = sim.nodes();
      setNodes([...currentNodes]);
      updateContentSize(currentNodes);
      updateScrollButtons(currentNodes);
    });

    return () => sim.stop();
  }, [containerSize.width, containerSize.height, childArray, avatarSize]);

  // Update center force on container resize.
  useEffect(() => {
    const { width, height } = containerSize;
    if (simulationRef.current && width && height) {
      simulationRef.current.force('x', forceX(width / 2).strength(strengthX));
      simulationRef.current.force('y', forceY(height / 2).strength(strengthY));
      simulationRef.current.alpha(strengthAlpha).restart();
    }
  }, [containerSize]);

  // Update collision force when avatarSize changes.
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide));
      simulationRef.current.alpha(strengthAlpha).restart();
    }
  }, [avatarSize]);

  // Listen for scroll events.
  useEffect(() => {
    const handleScroll = () => updateScrollButtons(simulationRef.current.nodes());
    if (outerRef.current) {
      outerRef.current.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (outerRef.current)
        outerRef.current.removeEventListener('scroll', handleScroll);
    };
  }, [nodes, contentSize]);

  // Scrolling helper.
  const scrollByAmount = (dx, dy) => {
    if (outerRef.current) {
      outerRef.current.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  };

  // Render.
  return (
    <div className={styles.container}>
      <div className={styles.outerContainer} ref={outerRef}>
        <AvatarLayout
          className={styles.simulationContent}
          style={{
            width: contentSize.width,
            height: contentSize.height,
            position: 'relative',
            '--avatar-size': `${avatarSize}px`,
          }}
        >
          {nodes.map((node) => {
            const childEl = updatedChildMap[node.id];
            return (
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
                {childEl}
              </div>
            );
          })}
        </AvatarLayout>
      </div>
      <div className={styles.overlayControls}>
        {scrollButtons.top && (
          <button
            className={`${styles.scrollButton} ${styles.topButton}`}
            onClick={() =>
              scrollByAmount(0, -0.75 * outerRef.current.clientHeight)
            }
          >
            &#9650;
          </button>
        )}
        {scrollButtons.bottom && (
          <button
            className={`${styles.scrollButton} ${styles.bottomButton}`}
            onClick={() =>
              scrollByAmount(0, 0.75 * outerRef.current.clientHeight)
            }
          >
            &#9660;
          </button>
        )}
        {scrollButtons.left && (
          <button
            className={`${styles.scrollButton} ${styles.leftButton}`}
            onClick={() =>
              scrollByAmount(-0.75 * outerRef.current.clientWidth, 0)
            }
          >
            &#9664;
          </button>
        )}
        {scrollButtons.right && (
          <button
            className={`${styles.scrollButton} ${styles.rightButton}`}
            onClick={() =>
              scrollByAmount(0.75 * outerRef.current.clientWidth, 0)
            }
          >
            &#9654;
          </button>
        )}
      </div>
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

AvatarClusterLayout.propTypes = {
  children: PropTypes.node,
  initialSize: PropTypes.number,
  margin: PropTypes.number,
};

export default AvatarClusterLayout;
