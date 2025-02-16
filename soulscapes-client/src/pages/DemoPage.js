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

// ---------- DURATION CONSTANTS (in seconds) ----------
const FADE_DURATION = 2.0;
const FLOAT_DURATION = 2.0;
const DROP_DURATION = 0.8;       // Drop animation duration
const ZIP_DURATION = 0.4;        // Zip animations duration
const FLICKER_DURATION = 1.5;
const MATERIALIZE_DURATION = FADE_DURATION * 0.33;

// ---------- Configuration ----------
const EVENT_TYPES = ["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"];
// Zip animations are now split into 4 distinct directions.
const EVENT_CREATION_ANIMATIONS = [
  "fade",
  "drop",
  "zipUp",
  "zipDown",
  "zipRight",
  "zipLeft",
  "float",
  "flicker",
  "materialize",
];

// ---------- Keyframe Animations ----------

// Fade: simple opacity transition
const fadeAnimation = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Float: as before
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

// Flicker: dramatic series of flashes
const flicker = keyframes`
  0% { opacity: 0; }
  10% { opacity: 1; }
  20% { opacity: 0; }
  30% { opacity: 1; }
  40% { opacity: 0; }
  50% { opacity: 1; }
  60% { opacity: 0.3; }
  70% { opacity: 0.8; }
  80% { opacity: 0.4; }
  90% { opacity: 0.9; }
  100% { opacity: 1; }
`;

// Drop: simulates a heavy anvil dropping onto a solid surface.
// The anvil drops from far above to the target, then shows a brief bounce
// by lifting one side (via a slight upward translation and rotation) before settling.
const dropAnimation = keyframes`
  0% {
    transform: translateY(-120vh) rotate(0deg);
  }
  70% {
    transform: translateY(0) rotate(0deg);
  }
  80% {
    transform: translateY(-3vh) rotate(5deg);
  }
  100% {
    transform: translateY(0) rotate(0deg);
  }
`;

// Zip Animations – each starts off-screen from a consistent direction,
// overshoots slightly, then settles.

// zipUp: enters from below (i.e. starts at +100vh)
const zipUp = keyframes`
  0% {
    transform: translateY(100vh);
    opacity: 0;
  }
  80% {
    transform: translateY(-5vh);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

// zipDown: enters from above (i.e. starts at -100vh)
const zipDown = keyframes`
  0% {
    transform: translateY(-100vh);
    opacity: 0;
  }
  80% {
    transform: translateY(5vh);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

// zipRight: enters from the left (i.e. starts at -100vw)
const zipRight = keyframes`
  0% {
    transform: translateX(-100vw);
    opacity: 0;
  }
  80% {
    transform: translateX(5vw);
    opacity: 1;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
`;

// zipLeft: enters from the right (i.e. starts at +100vw)
const zipLeft = keyframes`
  0% {
    transform: translateX(100vw);
    opacity: 0;
  }
  80% {
    transform: translateX(-5vw);
    opacity: 1;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
`;

// ---------- The Outer Scroller/Container (EventPane) ----------
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

// ---------- Bubbles (forwardRef) ----------
const ChatBubbleBase = React.forwardRef((props, ref) => (
  <div ref={ref} {...props} />
));

export const ChatMessageEvent = styled(ChatBubbleBase)`
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

export const InfoEvent = styled(ChatBubbleBase)`
  border: 2px solid limegreen;
  margin: 10px auto;
  padding: 10px;
  text-align: center;
  color: #aaa;
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  width: fit-content;
`;

export const ActionEvent = styled(ChatBubbleBase)`
  border: 2px solid limegreen;
  margin: 10px auto;
  padding: 10px;
  text-align: center;
  color: #ddd;
  font-size: 0.9em;
  background-color: rgba(123, 0, 255, 0.4);
  border-radius: 4px;
  width: fit-content;
`;

export const ErrorEvent = styled(ChatBubbleBase)`
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
  opacity: ${(props) => (props.isAnimated ? 1 : props.initialOpacity)};
  transform: ${(props) => (props.isAnimated ? "none" : props.initialTransform)};
  transition: opacity ${FADE_DURATION}s ease-out,
    transform ${FADE_DURATION}s ease-out;

  ${(props) =>
    props.isAnimated && props.creationAnimation === "float" && css`
      animation: ${floatFall} ${FLOAT_DURATION}s ease-out forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "flicker" && css`
      animation: ${flicker} ${FLICKER_DURATION}s ease-out forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "drop" && css`
      animation: ${dropAnimation} ${DROP_DURATION}s cubic-bezier(0.4, 0, 1, 1) forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "zipUp" && css`
      animation: ${zipUp} ${ZIP_DURATION}s ease-out forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "zipDown" && css`
      animation: ${zipDown} ${ZIP_DURATION}s ease-out forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "zipRight" && css`
      animation: ${zipRight} ${ZIP_DURATION}s ease-out forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "zipLeft" && css`
      animation: ${zipLeft} ${ZIP_DURATION}s ease-out forwards;
    `}

  ${(props) =>
    props.isAnimated && props.creationAnimation === "fade" && css`
      animation: ${fadeAnimation} ${FADE_DURATION}s ease-out forwards;
    `}
`;

// ---------- The Placeholder (animation wrapper) renamed to EventAnimationPlaceholder ----------
const EventAnimationPlaceholder = ({
  isNew,
  creationAnimation,
  children,
  onAnimationComplete,
}) => {
  const [height, setHeight] = useState(isNew ? 0 : 80);
  const [isAnimated, setIsAnimated] = useState(false);
  const [pixiActive, setPixiActive] = useState(false);
  const bubbleRef = useRef(null);
  const singleChild = React.Children.only(children);
  const childWithRef = React.cloneElement(singleChild, { ref: bubbleRef });

  const initialStyle = useMemo(() => {
    const getInitialInnerStyle = (anim) => {
      switch (anim) {
        case "drop":
          return { opacity: 1, transform: "translateY(-120vh)" };
        case "float":
          return { opacity: 0, transform: "translateY(-100vh) translateX(10vw) rotate(10deg)" };
        case "zipUp":
          return { opacity: 0, transform: "translateY(100vh)" };
        case "zipDown":
          return { opacity: 0, transform: "translateY(-100vh)" };
        case "zipRight":
          return { opacity: 0, transform: "translateX(-100vw)" };
        case "zipLeft":
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
    return isNew ? getInitialInnerStyle(creationAnimation) : { opacity: 1, transform: "none" };
  }, [isNew, creationAnimation]);

  const startAnimation = useCallback(() => {
    setHeight(80);
    if (creationAnimation === "materialize") {
      setPixiActive(true);
    }
    setIsAnimated(true);
    const effectTime = creationAnimation === "materialize" ? MATERIALIZE_DURATION * 1000 : 800;
    const timer = setTimeout(() => {
      if (onAnimationComplete) onAnimationComplete();
      setPixiActive(false);
    }, effectTime);
    return () => clearTimeout(timer);
  }, [creationAnimation, onAnimationComplete]);

  useEffect(() => {
    if (isNew) {
      return startAnimation();
    }
  }, [isNew, startAnimation]);

  const MaterializeEffect = ({
    duration = MATERIALIZE_DURATION * 1000,
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
        if (sprite && sprite.destroy) sprite.destroy();
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
        for (let i = 0; i < totalDots; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const r = Math.sqrt(Math.random()) * circleRadius;
          const startX = screenWidth / 2 + r * Math.cos(angle);
          const startY = screenHeight / 2 + r * Math.sin(angle);
          const delay = Math.random() * maxDelay;
          const innerR = dotInnerRadius + Math.random() * 0.3;
          const rect = bubbleRef.current.getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset;
          const scrollY = window.scrollY || window.pageYOffset;
          const targetDomX = rect.left + Math.random() * rect.width + scrollX;
          const targetDomY = rect.top + Math.random() * rect.height + scrollY;
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
            const alpha = progress;
            const scaleFactor = 1;
            const currentX = dotData.startX + progress * (dotData.endX - dotData.startX);
            const currentY = dotData.startY + progress * (dotData.endY - dotData.startY);
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
    }, [duration, pixiActive, dotColor, dotInnerRadius, dotOuterRadiusMultiplier, cleanupDots]);
    return null;
  };

  return (
    <div style={{ position: "relative", height, transition: "height 0.5s ease-out" }}>
      <AnimatedBubbleContainer
        isAnimated={isAnimated}
        creationAnimation={creationAnimation}
        initialOpacity={initialStyle.opacity}
        initialTransform={initialStyle.transform}
      >
        {childWithRef}
      </AnimatedBubbleContainer>
      {creationAnimation === "materialize" && pixiActive && <MaterializeEffect />}
    </div>
  );
};

// ---------- The Event Pane ----------
const EventPane = ({ children }) => {
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

// ---------- Page Layout ----------
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

// ---------- Event Logic ----------
const EventComponent = React.forwardRef(({ event, dateTime }, ref) => {
  switch (event.type) {
    case "chatMessageEvent":
      return (
        <ChatMessageEvent ref={ref} dateTime={dateTime}>
          {event.text}
        </ChatMessageEvent>
      );
    case "infoEvent":
      return <InfoEvent ref={ref}>{event.text}</InfoEvent>;
    case "actionEvent":
      return <ActionEvent ref={ref}>{event.text}</ActionEvent>;
    case "errorEvent":
      return (
        <ErrorEvent ref={ref} dateTime={dateTime}>
          {event.text}
        </ErrorEvent>
      );
    default:
      return <div ref={ref}>Unknown event type</div>;
  }
});

function createRandomEvent(id, type, creationAnimation) {
  const now = new Date();
  const newEvent = {
    id,
    date: now,
    isNew: true,
    type,
    creationAnimation,
  };
  switch (type) {
    case "chatMessageEvent":
      newEvent.text = "New Chat: This is a new chat message.";
      break;
    case "infoEvent":
      newEvent.text = "New Event: A new event occurred.";
      break;
    case "actionEvent":
      newEvent.text = "New Action: An action just took place.";
      break;
    case "errorEvent":
      newEvent.text = "New Error: Something went wrong!";
      break;
    default:
      newEvent.text = "Unknown event type.";
  }
  return newEvent;
}

// ---------- Main DemoPage ----------
export default function DemoPage() {
  const [events, setEvents] = useState(() => {
    const now = new Date();
    const initialEvents = [];
    for (let i = 0; i < 5; i++) {
      const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      const creationAnimation = EVENT_CREATION_ANIMATIONS[
        Math.floor(Math.random() * EVENT_CREATION_ANIMATIONS.length)
      ];
      const event = {
        id: i + 1,
        date: new Date(now.getTime() - i * 60000),
        isNew: false,
        type,
        creationAnimation,
      };
      if (type === "chatMessageEvent") {
        event.text = `Message ${i}: This is a demo chat message.`;
      } else if (type === "infoEvent") {
        event.text = `Message ${i}: An event occurred.`;
      } else if (type === "actionEvent") {
        event.text = `Message ${i}: An action took place.`;
      } else if (type === "errorEvent") {
        event.text = `Message ${i}: Something went wrong!`;
      }
      initialEvents.push(event);
    }
    return initialEvents;
  });

  const nextIdRef = useRef(6);
  // Defaults: "chatMessageEvent" and "zipUp"
  const [selectedType, setSelectedType] = useState("chatMessageEvent");
  const [selectedCreationAnimation, setSelectedCreationAnimation] = useState("zipUp");

  const addRandomEvent = useCallback(() => {
    const newEvent = createRandomEvent(
      nextIdRef.current++,
      selectedType,
      selectedCreationAnimation
    );
    setEvents((prev) => [newEvent, ...prev]);
  }, [selectedType, selectedCreationAnimation]);

  const markEventAsFinal = useCallback((id) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, isNew: false } : evt))
    );
  }, []);

  const renderEvent = useCallback(
    (evt) => {
      const dateTimeStr = format(evt.date, "MMM dd, yyyy HH:mm");
      return (
        <EventAnimationPlaceholder
          key={evt.id}
          isNew={evt.isNew}
          creationAnimation={evt.creationAnimation}
          onAnimationComplete={() => evt.isNew && markEventAsFinal(evt.id)}
        >
          <EventComponent event={evt} dateTime={dateTimeStr} />
        </EventAnimationPlaceholder>
      );
    },
    [markEventAsFinal]
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
        console.error("PIXI container not found! Materialize effect will not work.");
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
      window.circleTexture = window.pixiApp.renderer.generateTexture(circleGfx);
    }
    return () => {
      if (window.pixiApp) {
        if (window.dots) {
          window.dots.removeChildren();
          window.dots.destroy({ children: true });
          window.dots = null;
        }
        window.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
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
        !["isAnimated", "creationAnimation", "initialOpacity", "initialTransform"].includes(prop)
      }
    >
      <Background />
      <PixiContainer id="pixi-container" />
      <ButtonBar style={{ flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px" }}>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            {EVENT_TYPES.map((typeItem) => (
              <option key={typeItem} value={typeItem}>
                {typeItem}
              </option>
            ))}
          </select>
          <select
            value={selectedCreationAnimation}
            onChange={(e) => setSelectedCreationAnimation(e.target.value)}
          >
            {EVENT_CREATION_ANIMATIONS.map((anim) => (
              <option key={anim} value={anim}>
                {anim}
              </option>
            ))}
          </select>
        </div>
        <StyledButton onClick={addRandomEvent}>Add Event</StyledButton>
      </ButtonBar>
      <PageContainer>
        <EventPane>{events.map(renderEvent)}</EventPane>
      </PageContainer>
    </StyleSheetManager>
  );
}
