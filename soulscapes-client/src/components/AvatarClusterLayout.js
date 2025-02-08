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
import AvatarLayout from './AvatarLayout'; // Renders the ZoomControl, etc.
import styles from './AvatarClusterLayout.module.css';

const AvatarClusterLayout = ({ children, avatarSize = 80 }) => {
  const containerRef = useRef(null);

  // Capture the container’s dimensions once on mount.
  const [initialDimensions, setInitialDimensions] = useState(null);
  // Store the computed node positions.
  const [nodes, setNodes] = useState([]);

  // Memoize the children array so it doesn't change on every render.
  const childArray = useMemo(() => React.Children.toArray(children), [children]);

  // Effect 1: Measure container dimensions once on mount.
  useEffect(() => {
    if (containerRef.current && !initialDimensions) {
      const { clientWidth, clientHeight } = containerRef.current;
      setInitialDimensions({ width: clientWidth, height: clientHeight });
    }
  }, [initialDimensions]);

  // Effect 2: Run the force simulation only when the list of children changes.
  // We use the fixed initialDimensions from mount.
  useEffect(() => {
    if (!initialDimensions || childArray.length === 0) return;
    const { width, height } = initialDimensions;

    // Initialize nodes all at the fixed center.
    const initialNodes = childArray.map((child, i) => ({
      id: i,
      x: width / 2,
      y: height / 2,
    }));
    setNodes(initialNodes);

    const simulation = forceSimulation(initialNodes)
      .force('center', forceCenter(width / 2, height / 2)) // Fixed center!
      .force('collide', forceCollide(avatarSize / 2 + 5))
      .force('x', forceX(width / 2).strength(0.05))
      .force('y', forceY(height / 2).strength(0.05));

    simulation.on('tick', () => {
      // Update nodes on each tick.
      setNodes([...simulation.nodes()]);
    });

    // Let the simulation run until it converges. You might optionally stop it after a timeout.
    // For example, uncomment the following line to stop it after 2 seconds:
    // setTimeout(() => simulation.stop(), 2000);

    return () => {
      simulation.stop();
    };
  }, [childArray.length, initialDimensions, avatarSize]);

  return (
    <AvatarLayout
      className={styles.avatarClusterLayout}
      ref={containerRef}
      style={{ position: 'relative' }}
    >
      {nodes.map((node, i) => (
        <div
          key={node.id}
          className={styles.avatarWrapper}
          style={{
            position: 'absolute',
            left: node.x - avatarSize / 2,
            top: node.y - avatarSize / 2,
            width: avatarSize,
            height: avatarSize,
          }}
        >
          {childArray[i]}
        </div>
      ))}
    </AvatarLayout>
  );
};

AvatarClusterLayout.propTypes = {
  children: PropTypes.node,
  avatarSize: PropTypes.number,
};

export default AvatarClusterLayout;
