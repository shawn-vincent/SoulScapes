// src/components/AvatarClusterLayout.js
import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { forceSimulation, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import styles from './AvatarClusterLayout.module.css';

const AvatarClusterLayout = ({ children, avatarSize = 80 }) => {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);

  // Memoize the children array so that it doesn't change on every render.
  const childArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth: width, clientHeight: height } = container;

    // Initialize nodes at the center.
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
      // Update state with the current simulation nodes.
      setNodes([...simulation.nodes()]);
    });

    return () => {
      simulation.stop();
    };
  }, [childArray, avatarSize]);

  return (
    <div className={styles.avatarClusterLayout} ref={containerRef}>
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
    </div>
  );
};

AvatarClusterLayout.propTypes = {
  children: PropTypes.node,
  avatarSize: PropTypes.number,
};

export default AvatarClusterLayout;
