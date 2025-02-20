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

// Reintroduce slog logging functions
import { slog, serror, sdebug, swarn } from '../../../shared/slogger.js';

// Embed the circle diameter calculation function directly here.
export function calculateIndividualCircleDiameter(numberOfCircles, boundingDiameter) {

    // Optimized packing ratios for N ≤ 20
    const optimizedCases = {
	0: 1,                      // Special case zero.
	1: 1,                      // Single circle
	2: 2,                      // Two circles side by side
	3: 1 + Math.sqrt(3),       // Triangle
	4: 2 * Math.sqrt(2),       // Square
	5: 2 + Math.sqrt(2),       // Cross-like shape
	6: 2 + Math.sqrt(3),       // Hexagonal chain
	7: 2 + Math.sqrt(3),       // Hexagonal cluster
	8: 3 + Math.sqrt(3),       // Larger hexagonal shape
	9: 3 + Math.sqrt(3),       // 3×3 grid
	10: 3 + 2 * Math.sqrt(3),  // 10th added in outer hexagonal layer
	11: 3 + 2 * Math.sqrt(3),  // Still fits in hexagonal packing
	12: 4,                     // 4×3 rectangle
	13: 4,                     // Still fits within 4×3 bounding diameter
	14: 4 + Math.sqrt(3),      // One more layer outward
	15: 4 + Math.sqrt(3),      // Still within similar configuration
	16: 4 + 2 * Math.sqrt(3),  // Hexagonal + next layer
	17: 4 + 2 * Math.sqrt(3),  // Still within same group
	18: 5,                     // 3×6 rectangle fits snugly
	19: 5 + Math.sqrt(3),      // Small expansion outward
	20: 5 + Math.sqrt(3)       // Similar to 19
    };

    if (optimizedCases[numberOfCircles]) {
	return boundingDiameter / optimizedCases[numberOfCircles];
    }

    // General approximation for large numbers (circular packing)
    return boundingDiameter / Math.sqrt(numberOfCircles);
}

// A constant scale factor to tweak overall sizing (adjust as desired)
const SCALE_FACTOR = 0.8;

const AvatarClusterLayout = ({ children, margin = 20 }) => {
    // We no longer accept an initialSize prop; the size is derived dynamically.
    const [avatarSize, setAvatarSize] = useState(80);
    const outerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [nodes, setNodes] = useState([]);
    const [contentSize, setContentSize] = useState({
	width: 0,
	height: 0,
	offsetX: 0,
	offsetY: 0,
    });

    // Update container dimensions.
    useEffect(() => {
	if (!outerRef.current) return;
	const updateSize = () => {
	    if (!outerRef.current) return;
	    const { clientWidth, clientHeight } = outerRef.current;
	    if (clientWidth && clientHeight) {
		setContainerSize({ width: clientWidth, height: clientHeight });
		slog("Container size updated:", { clientWidth, clientHeight });
	    }
	};
	updateSize();
	const resizeObs = new ResizeObserver(() => updateSize());
	resizeObs.observe(outerRef.current);
	return () => resizeObs.disconnect();
    }, []);

    // Convert children to an array with unique keys.
    const childArray = useMemo(() => {
	return React.Children.toArray(children).map((child, index) => {
	    const id = child.key != null ? child.key : `child-${index}`;
	    return { id, element: child };
	});
    }, [children]);

    // Instead of passing a top-level "size" prop, merge the calculated size into the data prop.
    const updatedChildMap = useMemo(() => {
	const map = {};
	childArray.forEach((child) => {
	    const originalData = child.element.props.data || {};
	    const newData = { ...originalData, size: avatarSize };
	    map[child.id] = React.cloneElement(child.element, { data: newData });
	});
	return map;
    }, [childArray, avatarSize]);

    // Recalculate avatarSize whenever container size or number of avatars changes.
    useEffect(() => {
	if (!containerSize.width || !containerSize.height) return;
	// Compute bounding diameter as the smaller dimension times a scale factor.
	const boundingDiameter = Math.min(containerSize.width, containerSize.height) * SCALE_FACTOR;
	const numCircles = childArray.length;
	try {
	    const newSize = calculateIndividualCircleDiameter(numCircles, boundingDiameter);
	    slog("Calculated new avatar size:", { numCircles, boundingDiameter, newSize });
	    setAvatarSize(newSize);
	} catch (err) {
	    serror("Error calculating avatar size", err);
	}
    }, [containerSize, childArray]);

    // Compute bounding box for simulation.
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
	const offsetX = containerSize.width / 2 - (minX + maxX) / 2;
	const offsetY = containerSize.height / 2 - (minY + maxY) / 2;
	setContentSize({ width: computedWidth, height: computedHeight, offsetX, offsetY });
    };

    // Simulation strengths.
    const strengthX = 0.1;
    const strengthY = 0.1;
    const strengthCollide = 0.5;
    const strengthAlpha = 0.3;

    // Create initial nodes for simulation.
    const makeChildNodes = (childArray) => {
	return childArray.map((child) => ({
	    id: child.id,
	    x: Math.random() * 400,
	    y: Math.random() * 400,
	    zoomed: false,
	}));
    };

    const simulationRef = useRef(null);
    if (!simulationRef.current) {
	simulationRef.current = forceSimulation(makeChildNodes(childArray))
	    .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
	    .force('x', forceX(0).strength(strengthX))
	    .force('y', forceY(0).strength(strengthY))
	    .alpha(strengthAlpha);
	slog("Initialized force simulation");
    }

    // Update simulation nodes when container size or avatarSize changes.
    useEffect(() => {
	const { width, height } = containerSize;
	if (width === 0 || height === 0 || childArray.length === 0) return;

	const sim = simulationRef.current;
	const currentNodes = sim.nodes();

	// Create or update nodes for each child.
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

	sim.nodes(newNodes)
	    .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
	    .force('x', forceX(width / 2).strength(strengthX))
	    .force('y', forceY(height / 2).strength(strengthY))
	    .alpha(strengthAlpha)
	    .restart();

	sim.on('tick', () => {
	    const currentNodes = sim.nodes();
	    setNodes([...currentNodes]);
	    updateContentSize(currentNodes);
	});
	slog("Simulation updated with new avatar size:", { avatarSize });
    }, [containerSize.width, containerSize.height, childArray, avatarSize]);

    // Update simulation forces when container size changes.
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
    margin: PropTypes.number,
};

export default AvatarClusterLayout;
