import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import styled, {
    StyleSheetManager,
    keyframes,
    css,
} from "styled-components";
import { format } from "date-fns";
import * as PIXI from "pixi.js";

// ---------- TIMING CONSTANTS ----------
const FADE_DURATION_S = 2.0;
const MATERIALIZE_RATIO = 1;
const MATERIALIZE_DURATION_MS = FADE_DURATION_S * 1000 * MATERIALIZE_RATIO;

// ---------- Configuration ----------
const messageTypes = ["chat", "event", "action", "error"];
const animations = ["fade", "drop", "zip", "float", "flicker", "materialize"];

// ---------- Keyframe Animations ----------
const floatFall = keyframes`
  0% {
    transform: translateY(-100vh) translateX(20vw) rotate(-10deg);
    opacity: 0;
  }
  40% {
    transform: translateY(-55vh) translateX(-20vw) rotate(10deg);
    opacity: 0.75;
  }
  65% {
    transform: translateY(-10vh) translateX(10vw) rotate(-5deg);
    opacity: 1;
  }
  100% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 1;
  }
`;

const flicker = keyframes`
  0% {
    opacity: 0.8;
  }
  10% {
    opacity: 0.4;
  }
  20% {
    opacity: 1;
  }
  35% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.95;
  }
  65% {
    opacity: 0.5;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
`;

// ---------- The Outer Scroller/Container ----------
const ScrollerContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  padding: 0;
  margin: 0;
`;

const ScrollableContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column-reverse;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 0;
  margin: 0;
  /* Hide scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

// ---------- Bubbles: forwardRef so we can measure them ----------
const ChatBubbleBase = React.forwardRef((props, ref) => (
    <div ref={ref} {...props} />
));

export const ChatMessage = styled(ChatBubbleBase)`
  border: 2px solid limegreen;
  margin: 10px;
  padding: 10px;
  color: #000;
  background-color: rgba(255, 255, 255, 0.4);
  max-width: 70%;
  align-self: flex-start;
  border-radius: 8px;
  position: relative;
  &::after {
    content: "${(props) => props.dateTime}";
    display: block;
    font-size: 0.7em;
    margin-top: 3px;
    color: #333;
    text-align: right;
  }
`;

export const EventMessage = styled(ChatBubbleBase)`
  border: 2px solid limegreen;
  margin: 10px auto;
  padding: 10px;
  text-align: center;
  color: #aaa;
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  margin: 10px auto;
  width: fit-content;
`;

export const ActionMessage = styled(ChatBubbleBase)`
  border: 2px solid limegreen;
  margin: 10px auto;
  padding: 10px;
  text-align: center;
  color: #ddd;
  font-size: 0.9em;
  background-color: rgba(123, 0, 255, 0.4);
  border-radius: 4px;
  margin: 10px auto;
  width: fit-content;
`;

export const ErrorMessage = styled(ChatBubbleBase)`
  border: 2px solid limegreen;
  margin: 10px;
  padding: 10px;
  background-color: rgba(255, 0, 0, 0.6);
  border-radius: 8px;
  box-shadow: 0 0 10px red;
  max-width: 70%;
  align-self: flex-start;
  position: relative;
  color: #fff;
  &::after {
    content: "${(props) => props.dateTime}";
    display: block;
    font-size: 0.7em;
    margin-top: 3px;
    color: #ccc;
    text-align: right;
  }
`;

// ---------- The Animated Bubble Container ----------
const AnimatedBubbleContainer = styled.div`
  position: relative;
  z-index: 3;
  opacity: ${(props) => (props.animate ? 1 : props.initialOpacity)};
  transform: ${(props) => (props.animate ? "none" : props.initialTransform)};
  transition: opacity ${FADE_DURATION_S}s ease-out,
    transform ${FADE_DURATION_S}s ease-out;

  ${(props) =>
    props.animate &&
    props.animationType === "float" &&
    css`
animation: ${floatFall} ${FADE_DURATION_S}s ease-out forwards;
`}

  ${(props) =>
    props.animate &&
    props.animationType === "flicker" &&
    css`
animation: ${flicker} ${FADE_DURATION_S}s ease-out forwards;
`}
`;

// ---------- The Placeholder (animation wrapper) ----------
const MessagePlaceholder = ({
    isNew,
    animationType,
    children,
    onAnimationComplete,
}) => {
    const [height, setHeight] = useState(isNew ? 0 : 80);
    const [animate, setAnimate] = useState(false);
    const [pixiActive, setPixiActive] = useState(false);

    const bubbleRef = useRef(null);

    const singleChild = React.Children.only(children);
    const childWithRef = React.cloneElement(singleChild, { ref: bubbleRef });

    const initialStyle = useMemo(() => {
	const getInitialInnerStyle = (type) => {
	    switch (type) {
            case "drop":
		return { opacity: 0, transform: "translateY(-100vh)" };
            case "float":
		return {
		    opacity: 0,
		    transform: "translateY(-100vh) translateX(10vw) rotate(10deg)",
		};
            case "zip":
		return { opacity: 0, transform: "translateX(100vw)" };
            case "flicker":
		return { opacity: 0.2, transform: "none" };
            case "materialize":
		return { opacity: 0, transform: "none" };
            case "fade":
            default:
		return { opacity: 0, transform: "none" };
	    }
	};
	return isNew
	    ? getInitialInnerStyle(animationType)
	    : { opacity: 1, transform: "none" };
    }, [isNew, animationType]);

    const startAnimation = useCallback(() => {
	setHeight(80);

	if (animationType === "materialize") {
	    setPixiActive(true);
	}
	setAnimate(true);

	const effectTime =
	      animationType === "materialize" ? MATERIALIZE_DURATION_MS : 800;
	const timer = setTimeout(() => {
	    if (onAnimationComplete) onAnimationComplete();
	    setPixiActive(false);
	}, effectTime);

	return () => clearTimeout(timer);
    }, [animationType, onAnimationComplete]);

    useEffect(() => {
	if (isNew) {
	    return startAnimation();
	}
    }, [isNew, startAnimation]);


    const MaterializeEffect = ({
	duration = MATERIALIZE_DURATION_MS,
	dotColor = 0xffffff,
	dotInnerRadius = 0.8,
	dotOuterRadiusMultiplier = 2,
    }) => {
	const pixiApp = useRef(window.pixiApp);
	const dots = useRef(window.dots);
	const dotPool = useRef([]);

	const cleanupDots = useCallback(() => {
	    if (dots.current) {
		dots.current.removeChildren();
	    }
	    dotPool.current.forEach((sprite) => {
		if (sprite && sprite.destroy) {
		    sprite.destroy();
		}
	    });
	    dotPool.current = [];
	}, []);

	useEffect(() => {
	    let animationFrameId;
	    if (bubbleRef.current && pixiApp.current && dots.current && pixiActive) {
		const totalDots = 800;
		const maxDelay = duration * 0.3;
		const dotsData = [];

		const screenWidth = pixiApp.current.renderer.width;
		const screenHeight = pixiApp.current.renderer.height;
		const circleRadius = Math.max(screenWidth, screenHeight) * 0.9;

		// Initialize dots with random starting positions and unique end positions
		for (let i = 0; i < totalDots; i++) {
		    const angle = Math.random() * 2 * Math.PI;
		    const r = Math.sqrt(Math.random()) * circleRadius;
		    const startX = screenWidth / 2 + r * Math.cos(angle);
		    const startY = screenHeight / 2 + r * Math.sin(angle);

		    const delay = Math.random() * maxDelay;
		    const innerR = dotInnerRadius + Math.random() * 0.3;

		    // Randomize the end position within the target component
		    const rect = bubbleRef.current.getBoundingClientRect();
		    const scrollX = window.scrollX || window.pageXOffset;
		    const scrollY = window.scrollY || window.pageYOffset;
		    const targetDomX = rect.left + Math.random() * rect.width + scrollX;
		    const targetDomY = rect.top + Math.random() * rect.height + scrollY;

		    // Map DOM coordinates to Pixi.js coordinates
		    const targetPoint = new PIXI.Point();
		    pixiApp.current.renderer.plugins.interaction.mapPositionToPoint(
			targetPoint,
			targetDomX,
			targetDomY
		    );
		    const { x: endX, y: endY } = targetPoint;

		    dotsData.push({ startX, startY, endX, endY, delay, innerR });
		}

		const startTime = performance.now();

		const animateDots = () => {
		    const elapsed = performance.now() - startTime;

		    for (let i = 0; i < totalDots; i++) {
			let dotSprite = dotPool.current[i];
			if (!dotSprite) {
			    dotSprite = new PIXI.Sprite(window.circleTexture);
			    dotSprite.anchor.set(0.5);
			    dotPool.current[i] = dotSprite;
			}

			const dotData = dotsData[i];
			const localTime = elapsed - dotData.delay;
			if (localTime < 0) {
			    if (dotSprite.parent) dots.current.removeChild(dotSprite);
			    continue;
			}

			const progress = Math.min(1, localTime / (duration - dotData.delay));

			// Adjust alpha (transparency) and scale (size) based on progress
			const alpha = progress; // Start transparent (0) and become opaque (1)
			const scaleFactor = 1; // + progress; // Start at normal size (1) and grow to 2x size (2)

			const currentX =
			      dotData.startX + progress * (dotData.endX - dotData.startX);
			const currentY =
			      dotData.startY + progress * (dotData.endY - dotData.startY);

			if (!dotSprite.parent) {
			    dots.current.addChild(dotSprite);
			}

			const outerRadius = dotData.innerR * dotOuterRadiusMultiplier;
			const baseRadius = window.baseRadius || 6;
			const scale = (outerRadius / baseRadius) * scaleFactor;

			dotSprite.tint = dotColor;
			dotSprite.x = currentX;
			dotSprite.y = currentY;
			dotSprite.alpha = alpha;
			dotSprite.scale.set(scale);
		    }

		    if (elapsed < duration) {
			animationFrameId = requestAnimationFrame(animateDots);
		    } else {
			cleanupDots();
		    }
		};

		animateDots();

		return () => {
		    cancelAnimationFrame(animationFrameId);
		    cleanupDots();
		};
	    }
	}, [
	    duration,
	    pixiActive,
	    dotColor,
	    dotInnerRadius,
	    dotOuterRadiusMultiplier,
	    cleanupDots,
	]);

	return null;
    };  
    return (
	<div
	    style={{
		position: "relative",
		height,
		transition: "height 0.5s ease-out",
	    }}
	>
	    <AnimatedBubbleContainer
		animate={animate}
		animationType={animationType}
		initialOpacity={initialStyle.opacity}
		initialTransform={initialStyle.transform}
	    >
		{childWithRef}
	    </AnimatedBubbleContainer>

	    {animationType === "materialize" && pixiActive && <MaterializeEffect />}
	</div>
    );
};

// ---------- The EventScroller ----------
const EventScroller = ({ children }) => {
    const scrollableContentRef = useRef(null);

    const scrollToBottom = useCallback(() => {
	if (scrollableContentRef.current) {
	    scrollableContentRef.current.scrollTop = 0;
	}
    }, []);

    useEffect(() => {
	scrollToBottom();
    }, [children, scrollToBottom]);

    return (
	<ScrollerContainer>
	    <ScrollableContent ref={scrollableContentRef}>
		{children}
	    </ScrollableContent>
	</ScrollerContainer>
    );
};

// ---------- The Page Container, etc. ----------
const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg/518px-Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg");
  background-size: cover;
  background-position: center;
  z-index: -1;
`;

const PageContainer = styled.div`
  width: 80%;
  max-width: 800px;
  height: 80vh;
  margin: 5vh auto;
  border-radius: 10px;
  padding: 10px;
  position: relative;
  overflow: auto;
`;

const ButtonBar = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
`;

const StyledButton = styled.button`
  background-color: rgba(0, 123, 255, 0.7);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  &:hover {
    background-color: rgba(0, 123, 255, 0.9);
  }
`;

const PixiContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2;
`;

// ---------- Message logic ----------
const MessageComponent = React.forwardRef(({ message, dateTime }, ref) => {
    switch (message.type) {
    case "chat":
	return (
            <ChatMessage ref={ref} dateTime={dateTime}>
		{message.text}
            </ChatMessage>
	);
    case "event":
	return <EventMessage ref={ref}>{message.text}</EventMessage>;
    case "action":
	return <ActionMessage ref={ref}>{message.text}</ActionMessage>;
    case "error":
	return (
            <ErrorMessage ref={ref} dateTime={dateTime}>
		{message.text}
            </ErrorMessage>
	);
    default:
	return <div ref={ref}>Unknown message type</div>;
    }
});

function createRandomMessage(id, type, animation) {
    const now = new Date();
    const newMessage = {
	id,
	date: now,
	isNew: true,
	type,
	animation,
    };

    switch (type) {
    case "chat":
	newMessage.text = "New Chat: This is a new chat message.";
	break;
    case "event":
	newMessage.text = "New Event: A new event occurred.";
	break;
    case "action":
	newMessage.text = "New Action: An action just took place.";
	break;
    case "error":
	newMessage.text = "New Error: Something went wrong!";
	break;
    default:
	newMessage.text = "Unknown message type.";
    }
    return newMessage;
}

// ---------- Main DemoPage ----------
export default function DemoPage() {
    const [messages, setMessages] = useState(() => {
	const now = new Date();
	const initialMessages = [];
	for (let i = 0; i < 5; i++) {
	    const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
	    const animation =
		  animations[Math.floor(Math.random() * animations.length)];
	    const message = {
		id: i + 1,
		date: new Date(now.getTime() - i * 60000),
		isNew: false,
		type,
		animation,
	    };
	    if (type === "chat") {
		message.text = `Message ${i}: This is a demo chat message.`;
	    } else if (type === "event") {
		message.text = `Message ${i}: An event occurred.`;
	    } else if (type === "action") {
		message.text = `Message ${i}: An action took place.`;
	    } else if (type === "error") {
		message.text = `Message ${i}: Something went wrong!`;
	    }
	    initialMessages.push(message);
	}
	return initialMessages;
    });

    const nextIdRef = useRef(6);
    const [selectedType, setSelectedType] = useState("event");
    const [selectedAnimation, setSelectedAnimation] = useState("materialize");

    const addRandomMessage = useCallback(() => {
	const newMessage = createRandomMessage(
	    nextIdRef.current++,
	    selectedType,
	    selectedAnimation
	);
	setMessages((prev) => [newMessage, ...prev]);
    }, [selectedType, selectedAnimation]);

    const markMessageAsFinal = useCallback((id) => {
	setMessages((prev) =>
	    prev.map((msg) => (msg.id === id ? { ...msg, isNew: false } : msg))
	);
    }, []);

    const renderMessage = useCallback(
	(msg) => {
	    const dateTimeStr = format(msg.date, "MMM dd, yyyy HH:mm");
	    return (
		<MessagePlaceholder
		    key={msg.id}
		    isNew={msg.isNew}
		    animationType={msg.animation}
		    onAnimationComplete={() => msg.isNew && markMessageAsFinal(msg.id)}
		>
		    <MessageComponent message={msg} dateTime={dateTimeStr} />
		</MessagePlaceholder>
	    );
	},
	[markMessageAsFinal]
    );

    useEffect(() => {
	if (!window.pixiApp) {
	    const canvasWidth = window.innerWidth;
	    const canvasHeight = window.innerHeight;
	    window.pixiApp = new PIXI.Application({
		width: canvasWidth,
		height: canvasHeight,
		resolution: window.devicePixelRatio || 1,
		autoDensity: true,
		transparent: true,
	    });

	    const pixiContainer = document.getElementById("pixi-container");
	    if (!pixiContainer) {
		console.error(
		    "PIXI container not found! Materialize effect will not work."
		);
		return;
	    }
	    pixiContainer.appendChild(window.pixiApp.view);

	    window.dots = new PIXI.particles.ParticleContainer(5000, {
		scale: true,
		position: true,
		alpha: true,
		tint: true,
	    });
	    window.dots.blendMode = PIXI.BLEND_MODES.ADD;
	    window.pixiApp.stage.addChild(window.dots);

	    const baseRadius = 6;
	    window.baseRadius = baseRadius;
	    const circleGfx = new PIXI.Graphics();
	    circleGfx.beginFill(0xffffff);
	    circleGfx.drawCircle(0, 0, baseRadius);
	    circleGfx.endFill();
	    window.circleTexture = window.pixiApp.renderer.generateTexture(
		circleGfx
	    );
	}

	return () => {
	    if (window.pixiApp) {
		if (window.dots) {
		    window.dots.removeChildren();
		    window.dots.destroy({ children: true });
		    window.dots = null;
		}
		window.pixiApp.destroy(true, {
		    children: true,
		    texture: true,
		    baseTexture: true,
		});
		window.pixiApp = null;

		const pixiContainer = document.getElementById("pixi-container");
		if (pixiContainer) {
		    pixiContainer.innerHTML = "";
		}
	    }
	};
    }, []);

    return (
	<StyleSheetManager
	    shouldForwardProp={(prop) =>
		!["animate", "animationType", "initialOpacity", "initialTransform"].includes(
		    prop
		)
	    }
	>
	    <Background />
	    <PixiContainer id="pixi-container" />

	    <ButtonBar style={{ flexDirection: "column" }}>
		<div
		    style={{
			display: "flex",
			flexDirection: "row",
			gap: "10px",
			marginBottom: "10px",
		    }}
		>
		    <select
			value={selectedType}
			onChange={(e) => setSelectedType(e.target.value)}
		    >
			{messageTypes.map((typeItem) => (
			    <option key={typeItem} value={typeItem}>
				{typeItem}
			    </option>
			))}
		    </select>
		    <select
			value={selectedAnimation}
			onChange={(e) => setSelectedAnimation(e.target.value)}
		    >
			{animations.map((anim) => (
			    <option key={anim} value={anim}>
				{anim}
			    </option>
			))}
		    </select>
		</div>
		<StyledButton onClick={addRandomMessage}>Add Message</StyledButton>
	    </ButtonBar>

	    <PageContainer>
		<EventScroller>{messages.map(renderMessage)}</EventScroller>
	    </PageContainer>
	</StyleSheetManager>
    );
}
