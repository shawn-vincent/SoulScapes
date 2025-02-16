/** @jsxImportSource @emotion/react */
import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import { format } from "date-fns";
import * as PIXI from "pixi.js";
// Import the regular slogger logging functions.
import { slog, serror, sdebug, swarn } from "../../../shared/slogger.js";

// DEBUG flag: set to true to show green borders on events.
const DEBUG = false;

/* =======================================================================
   Helper: Convert hex color to rgba with a given alpha
   ======================================================================= */
function hexToRGBA(hex, alpha) {
  hex = hex.replace("#", "");
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* =======================================================================
   BaseAnimation and Subclasses
   -----------------------------------------------------------------------
   Each animation type encapsulates its own details (including keyframes)
   so that nothing is needed outside the type.
   ======================================================================= */
class BaseAnimation {
  constructor({ name, keyframes, duration, initialStyle }) {
    this.name = name;
    this.keyframes = keyframes; // defined internally in the subclass
    this.duration = duration;   // in seconds
    this.initialStyle = initialStyle;
  }
  getCSS() {
    return css`
      animation: ${this.keyframes} ${this.duration}s ease-out forwards;
    `;
  }
  // By default, no side effect.
  runEffect(ref) {}
}

class FadeAnimation extends BaseAnimation {
  constructor() {
    const fadeKeyframes = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    super({
      name: "fade",
      keyframes: fadeKeyframes,
      duration: 2.0,
      initialStyle: { opacity: 0, transform: "none" },
    });
  }
}

class FloatAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "float",
      keyframes: floatKeyframes,
      duration: 2.0,
      initialStyle: {
        opacity: 0,
        transform: "translateY(-100vh) translateX(10vw) rotate(10deg)",
      },
    });
  }
}

class FlickerAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "flicker",
      keyframes: flickerKeyframes,
      duration: 1.5,
      initialStyle: { opacity: 0.2, transform: "none" },
    });
  }
}

class DropAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "drop",
      keyframes: dropKeyframes,
      duration: 0.8,
      initialStyle: { opacity: 1, transform: "translateY(-120vh)" },
    });
  }
}

class ZipUpAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "zipUp",
      keyframes: zipUpKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateY(100vh)" },
    });
  }
}

class ZipDownAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "zipDown",
      keyframes: zipDownKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateY(-100vh)" },
    });
  }
}

class ZipRightAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "zipRight",
      keyframes: zipRightKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateX(-100vw)" },
    });
  }
}

class ZipLeftAnimation extends BaseAnimation {
  constructor() {
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
    super({
      name: "zipLeft",
      keyframes: zipLeftKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateX(100vw)" },
    });
  }
}

const MATERIALIZE_DURATION = 0.66; // seconds

class MaterializeAnimation extends BaseAnimation {
  constructor() {
    const fadeKeyframes = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    super({
      name: "materialize",
      keyframes: fadeKeyframes,
      duration: MATERIALIZE_DURATION,
      initialStyle: { opacity: 0, transform: "none" },
    });
  }
  runEffect(ref) {
    const duration = this.duration * 1000;
    if (ref && window.pixiApp && window.dots) {
      const totalDots = 800;
      const maxDelay = duration * 0.3;
      const dotsData = [];
      const screenWidth = window.pixiApp.renderer.width;
      const screenHeight = window.pixiApp.renderer.height;
      const circleRadius = Math.max(screenWidth, screenHeight) * 0.9;
      const rect = ref.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      for (let i = 0; i < totalDots; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * circleRadius;
        const startX = screenWidth / 2 + r * Math.cos(angle);
        const startY = screenHeight / 2 + r * Math.sin(angle);
        const delay = Math.random() * maxDelay;
        const dotInnerRadius = 0.8;
        const innerR = dotInnerRadius + Math.random() * 0.3;
        const targetDomX = rect.left + Math.random() * rect.width + scrollX;
        const targetDomY = rect.top + Math.random() * rect.height + scrollY;
        const targetPoint = new PIXI.Point();
        window.pixiApp.renderer.plugins.interaction.mapPositionToPoint(
          targetPoint,
          targetDomX,
          targetDomY
        );
        const { x: endX, y: endY } = targetPoint;
        dotsData.push({ startX, startY, endX, endY, delay, innerR });
      }
      const dotPool = [];
      const cleanupDots = () => {
        if (window.dots) {
          window.dots.removeChildren();
        }
        dotPool.forEach((sprite) => {
          if (sprite && sprite.destroy) sprite.destroy();
        });
      };
      const startTime = performance.now();
      const animateDots = () => {
        const elapsed = performance.now() - startTime;
        for (let i = 0; i < totalDots; i++) {
          let dotSprite = dotPool[i];
          if (!dotSprite) {
            dotSprite = new PIXI.Sprite(window.circleTexture);
            dotSprite.anchor.set(0.5);
            dotPool[i] = dotSprite;
          }
          const dotData = dotsData[i];
          const localTime = elapsed - dotData.delay;
          if (localTime < 0) {
            if (dotSprite.parent) window.dots.removeChild(dotSprite);
            continue;
          }
          const progress = Math.min(1, localTime / (duration - dotData.delay));
          const alpha = progress;
          const currentX = dotData.startX + progress * (dotData.endX - dotData.startX);
          const currentY = dotData.startY + progress * (dotData.endY - dotData.startY);
          if (!dotSprite.parent) {
            window.dots.addChild(dotSprite);
          }
          const dotOuterRadiusMultiplier = 2;
          const outerRadius = dotData.innerR * dotOuterRadiusMultiplier;
          const baseRadius = window.baseRadius || 6;
          const scale = outerRadius / baseRadius;
          dotSprite.tint = 0xffffff;
          dotSprite.x = currentX;
          dotSprite.y = currentY;
          dotSprite.alpha = alpha;
          dotSprite.scale.set(scale);
        }
        if (elapsed < duration) {
          requestAnimationFrame(animateDots);
        } else {
          cleanupDots();
        }
      };
      animateDots();
    }
  }
}

/* =======================================================================
   Registry & Installation
   ======================================================================= */
const InstalledAnimations = {};
function installAnimation(animationInstance) {
  InstalledAnimations[animationInstance.name] = animationInstance;
}
installAnimation(new FadeAnimation());
installAnimation(new FloatAnimation());
installAnimation(new FlickerAnimation());
installAnimation(new DropAnimation());
installAnimation(new ZipUpAnimation());
installAnimation(new ZipDownAnimation());
installAnimation(new ZipRightAnimation());
installAnimation(new ZipLeftAnimation());
installAnimation(new MaterializeAnimation());

/* =======================================================================
   Styled Components & Layout (Renamed from "ChatBubble" to "Event")
   ======================================================================= */

// Base component for events.
const EventBase = styled.div`
  /* Common base styles for events */
`;

// Glass-like container with a fixed white gradient and backdrop blur.
const EventPanelScrollContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.6),
      rgba(255, 255, 255, 0.2)
    );
  border-radius: 10px;
  padding: 0;
  margin: 0;
  backdrop-filter: blur(2px);
`;

const EventPanelContent = styled.div`
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
  position: relative;
`;


/* 
   The actual events themselves. 
   Increase the background color from ~0.4 to ~0.8 or 0.9
*/
export const MessageEvent = styled(EventBase)`
  border: ${DEBUG ? "2px solid limegreen" : "none"};
  margin: 10px;
  padding: 10px;
  color: #000;
  background-color: rgba(255, 255, 255, 0.8);
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

export const InfoEvent = styled(EventBase)`
  border: ${DEBUG ? "2px solid limegreen" : "none"};
  margin: 10px auto;
  padding: 10px;
  text-align: center;
  color: #aaa;
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  width: fit-content;
`;

export const ActionEvent = styled(EventBase)`
  border: ${DEBUG ? "2px solid limegreen" : "none"};
  margin: 10px auto;
  padding: 10px;
  text-align: center;
  color: #ddd;
  font-size: 0.9em;
  background-color: rgba(123, 0, 255, 0.8);
  border-radius: 4px;
  width: fit-content;
`;

export const ErrorEvent = styled(EventBase)`
  border: ${DEBUG ? "2px solid limegreen" : "none"};
  margin: 10px;
  padding: 10px;
  background-color: rgba(255, 0, 0, 0.8);
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

// Container that applies the animation CSS.
const AnimatedEventContainer = styled.div`
  position: relative;
  z-index: 3;
  opacity: ${(props) => (props.isAnimated ? 1 : props.initialOpacity)};
  transform: ${(props) => (props.isAnimated ? "none" : props.initialTransform)};
  transition: opacity 2s ease-out, transform 2s ease-out;
  ${(props) =>
    props.animation && props.isAnimated ? props.animation.getCSS() : ""}
`;

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

/* =======================================================================
   EventAnimationPlaceholder Component
   -----------------------------------------------------------------------
   Wraps an event to manage its animation state. Looks up the chosen animation
   and applies its CSS animation and optional side effect.
   ======================================================================= */
const EventAnimationPlaceholder = ({
  isNew,
  creationAnimation,
  children,
  onAnimationComplete,
}) => {
  const [height, setHeight] = useState(isNew ? 0 : 80);
  const [isAnimated, setIsAnimated] = useState(false);
  const eventRef = useRef(null);
  const childWithRef = React.cloneElement(React.Children.only(children), {
    ref: eventRef,
  });

  const animation = InstalledAnimations[creationAnimation] || null;
  const initialStyle =
    isNew && animation
      ? animation.initialStyle
      : { opacity: 1, transform: "none" };

  const startAnimation = useCallback(() => {
    setHeight(80);
    setIsAnimated(true);
    if (animation && typeof animation.runEffect === "function") {
      animation.runEffect(eventRef.current);
    }
    const effectTime =
      creationAnimation === "materialize"
        ? MATERIALIZE_DURATION * 1000
        : 800;
    const timer = setTimeout(() => {
      if (onAnimationComplete) onAnimationComplete();
    }, effectTime);
    return () => clearTimeout(timer);
  }, [creationAnimation, onAnimationComplete, animation]);

  useEffect(() => {
    if (isNew) {
      startAnimation();
    }
  }, [isNew, startAnimation]);

  return (
    <div style={{ position: "relative", height, transition: "height 0.5s ease-out" }}>
      <AnimatedEventContainer
        isAnimated={isAnimated}
        animation={animation}
        initialOpacity={initialStyle.opacity}
        initialTransform={initialStyle.transform}
      >
        {childWithRef}
      </AnimatedEventContainer>
    </div>
  );
};

function EventPane({ children }) {
  const scrollableContentRef = useRef(null);

  return (
    <EventPanelScrollContainer>
      <EventPanelContent ref={scrollableContentRef}>
        {children}
        {/* Add the scroll affordances on top of the content */}
      </EventPanelContent>
    </EventPanelScrollContainer>
  );
}

/* =======================================================================
   EventComponent: Renders an event based on its type.
   ======================================================================= */
const EventComponent = React.forwardRef(({ event, dateTime }, ref) => {
  switch (event.type) {
    case "chatMessageEvent":
      return (
        <MessageEvent ref={ref} dateTime={dateTime}>
          {event.text}
        </MessageEvent>
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

/* =======================================================================
   Helper: Create a Random Event
   ======================================================================= */
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
   Main page component initializes PIXI, renders the event pane,
   and uses the installed animation types.
   ======================================================================= */
export default function DemoPage() {
  const [events, setEvents] = useState(() => {
    const now = new Date();
    const initialEvents = [];
    for (let i = 0; i < 5; i++) {
      const type = ["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"][
        Math.floor(Math.random() * 4)
      ];
      const animationKeys = Object.keys(InstalledAnimations);
      const creationAnimation =
        animationKeys[Math.floor(Math.random() * animationKeys.length)];
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

  const addRandomEvent = useCallback(() => {
    const newEvent = createRandomEvent(
      nextIdRef.current++,
      selectedType,
      selectedCreationAnimation
    );
    setEvents((prev) => [newEvent, ...prev]);
    slog("DemoPage", `Added new event (id: ${newEvent.id}) of type ${newEvent.type}.`);
  }, [selectedType, selectedCreationAnimation]);

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

  // Initialize PIXI with robust error handling.
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
    <>
      <Background />
      <PixiContainer id="pixi-container" />
      <ButtonBar
        css={css`
          flex-direction: column;
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: row;
            gap: 10px;
            margin-bottom: 10px;
          `}
        >
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"].map(
              (typeItem) => (
                <option key={typeItem} value={typeItem}>
                  {typeItem}
                </option>
              )
            )}
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
          </select>
        </div>
        <StyledButton onClick={addRandomEvent}>Add Event</StyledButton>
      </ButtonBar>
      <PageContainer>
        <EventPane>{events.map(renderEvent)}</EventPane>
      </PageContainer>
    </>
  );
}
