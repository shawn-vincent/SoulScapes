import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import styled, { StyleSheetManager, keyframes, css } from "styled-components";
import { format } from "date-fns";
import * as PIXI from "pixi.js";
// Import the regular slogger logging functions.
import { slog, serror, sdebug, swarn } from "../../../shared/slogger.js";

/* =======================================================================
   AnimationType Class & Registry
   -----------------------------------------------------------------------
   Each animation type is encapsulated in a single JavaScript object.
   An instance of AnimationType contains:
     - name: Unique identifier.
     - keyframes: A styled-components keyframes definition.
     - duration: Duration (in seconds).
     - initialStyle: The style (opacity/transform) to apply initially.
     - getCSS(): A method that returns the CSS for applying the animation.
   New animations can be added simply by creating a new instance and
   installing it into InstalledAnimations.
   ======================================================================= */
class AnimationType {
  constructor({ name, keyframes, duration, initialStyle }) {
    this.name = name;
    this.keyframes = keyframes;
    this.duration = duration;
    this.initialStyle = initialStyle;
  }
  getCSS() {
    // Returns CSS for applying the keyframes animation.
    return css`
      animation: ${this.keyframes} ${this.duration}s ease-out forwards;
    `;
  }
}

// Duration constants
const FADE_DURATION = 2.0;
const FLOAT_DURATION = 2.0;
const DROP_DURATION = 0.5;
const ZIP_DURATION = 0.4;
const FLICKER_DURATION = 1.5;
const MATERIALIZE_DURATION = FADE_DURATION * 0.33;

// Define keyframes
const fadeKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const floatKeyframes = keyframes`
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

const flickerKeyframes = keyframes`
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

const dropKeyframes = keyframes`
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

const zipUpKeyframes = keyframes`
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

const zipDownKeyframes = keyframes`
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

const zipRightKeyframes = keyframes`
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

const zipLeftKeyframes = keyframes`
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

// InstalledAnimations registry.
// Each property is an instance of AnimationType.
// The "materialize" effect is special and will be handled separately.
const InstalledAnimations = {
  fade: new AnimationType({
    name: "fade",
    keyframes: fadeKeyframes,
    duration: FADE_DURATION,
    initialStyle: { opacity: 0, transform: "none" },
  }),
  float: new AnimationType({
    name: "float",
    keyframes: floatKeyframes,
    duration: FLOAT_DURATION,
    initialStyle: { opacity: 0, transform: "translateY(-100vh) translateX(10vw) rotate(10deg)" },
  }),
  flicker: new AnimationType({
    name: "flicker",
    keyframes: flickerKeyframes,
    duration: FLICKER_DURATION,
    initialStyle: { opacity: 0.2, transform: "none" },
  }),
  drop: new AnimationType({
    name: "drop",
    keyframes: dropKeyframes,
    duration: DROP_DURATION,
    initialStyle: { opacity: 1, transform: "translateY(-120vh)" },
  }),
  zipUp: new AnimationType({
    name: "zipUp",
    keyframes: zipUpKeyframes,
    duration: ZIP_DURATION,
    initialStyle: { opacity: 0, transform: "translateY(100vh)" },
  }),
  zipDown: new AnimationType({
    name: "zipDown",
    keyframes: zipDownKeyframes,
    duration: ZIP_DURATION,
    initialStyle: { opacity: 0, transform: "translateY(-100vh)" },
  }),
  zipRight: new AnimationType({
    name: "zipRight",
    keyframes: zipRightKeyframes,
    duration: ZIP_DURATION,
    initialStyle: { opacity: 0, transform: "translateX(-100vw)" },
  }),
  zipLeft: new AnimationType({
    name: "zipLeft",
    keyframes: zipLeftKeyframes,
    duration: ZIP_DURATION,
    initialStyle: { opacity: 0, transform: "translateX(100vw)" },
  }),
  // "materialize" will be handled separately.
};

/* =======================================================================
   Styled Components & Layout
   -----------------------------------------------------------------------
   Note: AnimatedBubbleContainer now receives an "animation" prop.
   If provided and the component is animating, it applies the CSS
   generated by the animation object.
   ======================================================================= */
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
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

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

// AnimatedBubbleContainer now applies the CSS from the animation prop.
const AnimatedBubbleContainer = styled.div`
  position: relative;
  z-index: 3;
  opacity: ${(props) => (props.isAnimated ? 1 : props.initialOpacity)};
  transform: ${(props) => (props.isAnimated ? "none" : props.initialTransform)};
  transition: opacity ${FADE_DURATION}s ease-out, transform ${FADE_DURATION}s ease-out;
  ${(props) => props.animation && props.isAnimated ? props.animation.getCSS() : ""}
`;

/* =======================================================================
   EventAnimationPlaceholder Component
   -----------------------------------------------------------------------
   Wraps each event bubble to manage its animation state.
   Uses the installed AnimationType for initial styles and animation CSS.
   The "materialize" type is handled separately.
   ======================================================================= */
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
  const childWithRef = React.cloneElement(React.Children.only(children), { ref: bubbleRef });

  // Look up the animation from the registry.
  const animation = InstalledAnimations[creationAnimation] || null;
  // Use the animation's initial style if available.
  const initialStyle = isNew && animation
    ? animation.initialStyle
    : { opacity: 1, transform: "none" };

  // Start the animation (or materialize effect) and call onAnimationComplete when done.
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
      startAnimation();
    }
  }, [isNew, startAnimation]);

  // MaterializeEffect uses PIXI for a particle effect.
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
            const currentX = dotData.startX + progress * (dotData.endX - dotData.startX);
            const currentY = dotData.startY + progress * (dotData.endY - dotData.startY);
            if (!dotSprite.parent) {
              dots.current.addChild(dotSprite);
            }
            const outerRadius = dotData.innerR * dotOuterRadiusMultiplier;
            const baseRadius = window.baseRadius || 6;
            const scale = outerRadius / baseRadius;
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
        animation={animation} // Pass the installed animation (if any)
        initialOpacity={initialStyle.opacity}
        initialTransform={initialStyle.transform}
      >
        {childWithRef}
      </AnimatedBubbleContainer>
      {creationAnimation === "materialize" && pixiActive && <MaterializeEffect />}
    </div>
  );
};

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

// EventComponent renders an event based on its type.
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

// Helper to create a random event for demo purposes.
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

/* =======================================================================
   DemoPage Component
   -----------------------------------------------------------------------
   This is the main page component. It initializes the PIXI app,
   renders the event pane, and uses the installed animation types.
   Robust error handling is provided for PIXI initialization and cleanup.
   ======================================================================= */
export default function DemoPage() {
  const [events, setEvents] = useState(() => {
    const now = new Date();
    const initialEvents = [];
    for (let i = 0; i < 5; i++) {
      const type = ["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"][
        Math.floor(Math.random() * 4)
      ];
      // Randomly pick one of the installed animation types (excluding "materialize")
      const animationKeys = Object.keys(InstalledAnimations);
      const creationAnimation = animationKeys[
        Math.floor(Math.random() * animationKeys.length)
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
  const [selectedType, setSelectedType] = useState("chatMessageEvent");
  const [selectedCreationAnimation, setSelectedCreationAnimation] = useState("zipUp");

  // Add a new event and log the action.
  const addRandomEvent = useCallback(() => {
    const newEvent = createRandomEvent(
      nextIdRef.current++,
      selectedType,
      selectedCreationAnimation
    );
    setEvents((prev) => [newEvent, ...prev]);
    slog("DemoPage", `Added new event (id: ${newEvent.id}) of type ${newEvent.type}.`);
  }, [selectedType, selectedCreationAnimation]);

  // Mark an event as finalized (i.e. animation complete).
  const markEventAsFinal = useCallback((id) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, isNew: false } : evt))
    );
    slog("DemoPage", `Event (id: ${id}) animation completed.`);
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

  // PIXI initialization and cleanup with robust error handling.
  useEffect(() => {
    try {
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
          serror("DemoPage", "PIXI container not found! Materialize effect will not work.");
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
        slog("DemoPage", "PIXI application initialized successfully.");
      }
    } catch (error) {
      serror("DemoPage", `Error initializing PIXI: ${error.message}`);
    }
    return () => {
      try {
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
          slog("DemoPage", "PIXI application cleaned up.");
        }
      } catch (cleanupError) {
        serror("DemoPage", `Error during PIXI cleanup: ${cleanupError.message}`);
      }
    };
  }, []);

  return (
    <StyleSheetManager
      shouldForwardProp={(prop) =>
        !["isAnimated", "creationAnimation", "initialOpacity", "initialTransform", "animation"].includes(prop)
      }
    >
      <>
        <Background />
        <PixiContainer id="pixi-container" />
        <ButtonBar style={{ flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px" }}>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"].map((typeItem) => (
                <option key={typeItem} value={typeItem}>
                  {typeItem}
                </option>
              ))}
            </select>
            <select
              value={selectedCreationAnimation}
              onChange={(e) => setSelectedCreationAnimation(e.target.value)}
            >
              {Object.keys(InstalledAnimations).map((animKey) => (
                <option key={animKey} value={animKey}>
                  {animKey}
                </option>
              ))}
              {/* Optionally add "materialize" here if needed */}
            </select>
          </div>
          <StyledButton onClick={addRandomEvent}>Add Event</StyledButton>
        </ButtonBar>
        <PageContainer>
          <EventPane>{events.map(renderEvent)}</EventPane>
        </PageContainer>
      </>
    </StyleSheetManager>
  );
}
