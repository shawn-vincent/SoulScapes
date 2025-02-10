// AvatarClusterLayout.js
import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    forceSimulation,
    forceCollide,
    forceX,
    forceY,
} from 'd3-force';
import AvatarLayout from './AvatarLayout';
import styles from './AvatarClusterLayout.module.css';

const AvatarClusterLayout = ({ children, initialSize = 80, margin = 20 }) => {
    const [avatarSize, setAvatarSize] = useState(initialSize);
    const outerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [nodes, setNodes] = useState([]);
    const [contentSize, setContentSize] = useState({
	width: 0,
	height: 0,
	offsetX: 0,
	offsetY: 0,
    });

    const handleZoomIn = () => setAvatarSize((prev) => prev * 1.1);
    const handleZoomOut = () => setAvatarSize((prev) => prev / 1.1);
    const handleZoomFit = () => setAvatarSize(initialSize);

    
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

    const childArray = useMemo(() => {
	return React.Children.toArray(children).map((child, index) => {
	    const id = child.key != null ? child.key : `child-${index}`;
	    return { id, element: child };
	});
    }, [children]);

    const updatedChildMap = useMemo(() => {
	const map = {};
	childArray.forEach((child) => {
	    map[child.id] = React.cloneElement(child.element, { size: avatarSize });
	});
	return map;
    }, [childArray, avatarSize]);

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

    const updateContentSize = (nodeArr) => {
	if (!containerSize.width || !containerSize.height || nodeArr.length === 0) return;
	const { minX, maxX, minY, maxY } = computeBoundingBox(nodeArr);
	const computedWidth = maxX - minX + 2 * margin;
	const computedHeight = maxY - minY + 2 * margin;
	const contentWidth = computedWidth; 
	const contentHeight = computedHeight;
	//console.log("Computed size", computedWidth, computedHeight);
	const offsetX = containerSize.width / 2 - (minX + maxX) / 2;
	const offsetY = containerSize.height / 2 - (minY + maxY) / 2;
	setContentSize({ width: contentWidth, height: contentHeight, offsetX, offsetY });
    };

    const strengthX = 0.1;
    const strengthY = 0.1;
    const strengthCollide = .5;
    const strengthAlpha = 0.3;

    const makeChildNodes = (childArray)=> {
	return childArray.map((child) => ({
            id: child.id,
            x: Math.random(0,400),
            y: Math.random(0,400),
            zoomed: false,
	}));
    }
    
    
    const simulationRef = useRef(null);
    if (!simulationRef.current) {
	simulationRef.current = forceSimulation(makeChildNodes(childArray))
	    .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
	    .force('x', forceX(0).strength(strengthX))
	    .force('y', forceY(0).strength(strengthY))
	    .alpha(strengthAlpha);
    }


    useEffect(() => {
	const { width, height } = containerSize;
	if (width === 0 || height === 0 || childArray.length === 0) return;

	const sim = simulationRef.current;
	// Get the current nodes
	const currentNodes = sim.nodes();

	// Create new nodes based on childArray, preserving positions for existing nodes.
	const newNodes = childArray.map((child) => {
	    const existingNode = currentNodes.find((n) => n.id === child.id);
	    if (existingNode) {
		return { ...existingNode, id: child.id };
	    } else {
		const x = Math.floor(Math.random() * width);
		const y = Math.floor(Math.random() * height);
		return { id: child.id, x, y, zoomed: false };
	    }
	});

	// Update simulation nodes and forces, and restart the simulation.
	sim.nodes(newNodes)
	    .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
	    .force('x', forceX(width / 2).strength(strengthX))
	    .force('y', forceY(height / 2).strength(strengthY))
	    .alpha(strengthAlpha)
	    .restart();

	// Remove any previous tick listener to avoid duplicate listeners.
	sim.on('tick', () => {
	    const currentNodes = sim.nodes();
	    setNodes([...currentNodes]);
	    updateContentSize(currentNodes);
	});

	// No cleanup that stops the simulation.
    }, [containerSize.width, containerSize.height, childArray, avatarSize]);

    
    // useEffect(() => {
    // 	const { width, height } = containerSize;
    // 	if (width === 0 || height === 0 || childArray.length === 0) return;

    // 	const sim = simulationRef.current;
    // 	const currentNodes = sim.nodes();

    // 	const newNodes = childArray.map((child) => {
    // 	    const existingNode = currentNodes.find((n) => n.id === child.id);
    // 	    if (existingNode) {
    // 		//console.log("reusing existing node ", {existingNode})
    // 		return { ...existingNode, id: child.id };
    // 	    } else {
    // 		const x = Math.floor(Math.random() * width);
    // 		const y = Math.floor(Math.random() * height);
    // 		//console.log("creating new node at ", {x,y})
    // 		return {
    // 		    id: child.id,
    // 		    x: x,
    // 		    y: y,
    // 		    zoomed: false,
    // 		};
    // 	    }
    // 	});

    // 	sim.nodes(newNodes)
    // 	    .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
    // 	    .force('x', forceX(width / 2).strength(strengthX))
    // 	    .force('y', forceY(height / 2).strength(strengthY))
    // 	    .alpha(strengthAlpha);

    // 	sim.on('tick', () => {
    // 	    const currentNodes = sim.nodes();
    // 	    setNodes([...currentNodes]);
    // 	    updateContentSize(currentNodes);
    // 	});

    // 	return () => sim.stop();
    // }, [containerSize.width, containerSize.height, childArray, avatarSize]);

    useEffect(() => {
	const { width, height } = containerSize;
	if (simulationRef.current && width && height) {
	    simulationRef.current.force('x', forceX(width / 2).strength(strengthX));
	    simulationRef.current.force('y', forceY(height / 2).strength(strengthY));
	    simulationRef.current.alpha(strengthAlpha).restart();
	}
    }, [containerSize]);

    useEffect(() => {
	if (simulationRef.current) {
	    simulationRef.current.force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide));
	    simulationRef.current.alpha(strengthAlpha).restart();
	}
    }, [avatarSize]);

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
	</div>
    );
};

AvatarClusterLayout.propTypes = {
    children: PropTypes.node,
    initialSize: PropTypes.number,
    margin: PropTypes.number,
};

export default AvatarClusterLayout;
