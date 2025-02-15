import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import styled, {
  StyleSheetManager,
  keyframes,
} from 'styled-components';
import {
  format,
} from 'date-fns';
import * as PIXI from 'pixi.js';

// ---------------- Constants for fade + materialize durations ----------------
const FADE_DURATION_S = 2.0; // e.g. 2 seconds for the fade
const MATERIALIZE_DURATION_MS = FADE_DURATION_S * 1000 / 2; 
// => 1000 ms (1 second) = half the fade duration

// ---------------- Configuration ----------------
const messageTypes = ['chat', 'event', 'action', 'error'];
const animations = ['fade', 'drop', 'zip', 'float', 'flicker', 'materialize'];

// ---------------- Keyframe Animations ----------------
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

// ---------------- Styled Components ----------------
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

// ---------------- MessagePlaceholder ----------------
const MessagePlaceholder = ({
  isNew,
  animationType,
  children,
  onAnimationComplete,
}) => {
  const [height, setHeight] = useState(isNew ? 0 : 80);
  const [animate, setAnimate] = useState(false);
  const [pixiActive, setPixiActive] = useState(false);
  const containerRef = useRef(null);

  // Initial style for message content before/after animation
  const initialStyle = useMemo(() => {
    const getInitialInnerStyle = (type) => {
      switch (type) {
        case 'drop':
          return { opacity: 0, transform: 'translateY(-100vh)' };
        case 'float':
          return {
            opacity: 0,
            transform: 'translateY(-100vh) translateX(10vw) rotate(10deg)',
          };
        case 'zip':
          return { opacity: 0, transform: 'translateX(100vw)' };
        case 'flicker':
          return { opacity: 0.2, transform: 'none' };
        case 'materialize':
          return { opacity: 0, transform: 'none' };
        case 'fade':
        default:
          return { opacity: 0, transform: 'none' };
      }
    };

    return isNew
      ? getInitialInnerStyle(animationType)
      : { opacity: 1, transform: 'none' };
  }, [isNew, animationType]);

  // Start the animation
  const startAnimation = useCallback(() => {
    // Expand the placeholder
    setHeight(80);

    // If materialize, turn on the dot effect
    if (animationType === 'materialize') {
      setPixiActive(true);
    }

    // Begin fade & transform right away
    setAnimate(true);

    // Overall fade/animation time
    const completionDelay =
      animationType === 'materialize'
        ? MATERIALIZE_DURATION_MS // use the constant
        : 800; // or other fallback timing

    // Once time is up, do final callback + turn off effect
    const timer = setTimeout(() => {
      if (onAnimationComplete) onAnimationComplete();
      setPixiActive(false);
    }, completionDelay);

    return () => clearTimeout(timer);
  }, [animationType, onAnimationComplete]);

  useEffect(() => {
    if (isNew) {
      return startAnimation();
    }
  }, [isNew, startAnimation]);

  // ------------ MaterializeEffect that runs for MATERIALIZE_DURATION_MS ------------
  const MaterializeEffect = ({
    duration = MATERIALIZE_DURATION_MS, // from the constant
    dotColor = 0xffffff,
    dotInnerRadius = 0.8,
    dotOuterRadiusMultiplier = 2,
  }) => {
    const pixiApp = useRef(window.pixiApp);
    const dots = useRef(window.dots);
    const dotPool = useRef([]);

    // Just remove children, don't destroy the container
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
      if (containerRef.current && pixiApp.current && dots.current && pixiActive) {
        // Convert DOM coords -> PIXI coords
        const getTargetCoordinates = () => {
          // We'll measure the entire placeholder container
          const rect = containerRef.current.getBoundingClientRect();
          const msgCenterX = rect.left + rect.width / 2;
          const msgCenterY = rect.top + rect.height / 2;

          // mapPositionToPoint handles scrolling/offset
          const point = new PIXI.Point();
          pixiApp.current.renderer.plugins.interaction.mapPositionToPoint(
            point,
            msgCenterX,
            msgCenterY
          );
          return { x: point.x, y: point.y };
        };

        const { x: targetX, y: targetY } = getTargetCoordinates();

        // We'll spawn a bunch of dots
        const totalDots = 800; 
        // short random start delays so it doesn't all happen at once
        const maxDelay = duration * 0.2; // 20% of the overall time is random delay
        const dotsData = [];

        const circleRadius = Math.max(
          pixiApp.current.renderer.width,
          pixiApp.current.renderer.height
        ) * 1.0; // you can tweak this to fill the screen

        // Precompute random spawn positions
        for (let i = 0; i < totalDots; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const r = Math.sqrt(Math.random()) * circleRadius;
          const startX = targetX + r * Math.cos(angle);
          const startY = targetY + r * Math.sin(angle);
          const delay = Math.random() * maxDelay;
          const innerR = dotInnerRadius + Math.random() * 0.3; // slight variation
          dotsData.push({ startX, startY, delay, innerR });
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
              // not started yet
              if (dotSprite.parent) dots.current.removeChild(dotSprite);
              continue;
            }

            // progress from 0..1 across total effect duration minus delay
            const progress = Math.min(1, localTime / (duration - dotData.delay));
            const alpha = 1 - progress;
            const currentX = dotData.startX + progress * (targetX - dotData.startX);
            const currentY = dotData.startY + progress * (targetY - dotData.startY);

            if (!dotSprite.parent) {
              dots.current.addChild(dotSprite);
            }

            const outerRadius = dotData.innerR * dotOuterRadiusMultiplier;
            const baseRadius = window.baseRadius || 6; 
            const scaleFactor = outerRadius / baseRadius;

            dotSprite.tint = dotColor;
            dotSprite.x = currentX;
            dotSprite.y = currentY;
            dotSprite.alpha = alpha;
            dotSprite.scale.set(scaleFactor);
          }

          if (elapsed < duration) {
            animationFrameId = requestAnimationFrame(animateDots);
          } else {
            // All done
            cleanupDots();
          }
        };

        animateDots();

        return () => {
          cancelAnimationFrame(animationFrameId);
          cleanupDots();
        };
      }
    }, [duration, pixiActive, dotColor, dotInnerRadius,
        dotOuterRadiusMultiplier, cleanupDots]);

    return null;
  };

  // Render the container with or without the effect
  return (
    <div
      style={{
        position: 'relative',
        height,
        // keep the height transition at 0.5s if you like
        transition: 'height 0.5s ease-out',

        // Add a green debug border around the bounding placeholder
        border: '2px solid limegreen',
      }}
      ref={containerRef}
    >
      <div
        style={{
          // The fade and transform match FADE_DURATION_S
          opacity: animate ? 1 : initialStyle.opacity,
          transform: animate ? 'none' : initialStyle.transform,
          transition: `opacity ${FADE_DURATION_S}s ease-out, transform ${FADE_DURATION_S}s ease-out`,
          position: 'relative',
          zIndex: 3,
          ...(animate && animationType === 'float' && {
            animation: `${floatFall} ${FADE_DURATION_S}s ease-out forwards`,
          }),
          ...(animate && animationType === 'flicker' && {
            animation: `${flicker} ${FADE_DURATION_S}s ease-out forwards`,
          }),
        }}
      >
        {children}
      </div>

      {animationType === 'materialize' && pixiActive && (
        <MaterializeEffect />
      )}
    </div>
  );
};

// ---------------- EventScroller ----------------
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

// ---------------- Message Components ----------------
const MessageBase = styled.div`
  padding: 10px;
  margin: 10px;
  color: white;
  font-size: 1em;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 4; /* above the PIXI animation */
  &::after {
    content: '${(props) => props.dateTime}';
    display: block;
    font-size: 0.7em;
    margin-top: 3px;
    color: #ccc;
    text-align: right;
  }
`;

const ChatMessage = styled(MessageBase)`
  background-color: rgba(255, 255, 255, 0.4);
  max-width: 70%;
  align-self: flex-start;
`;

const EventMessage = styled(MessageBase)`
  text-align: center;
  color: #aaa;
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  margin: 10px auto;
  width: fit-content;
`;

const ActionMessage = styled(MessageBase)`
  text-align: center;
  color: #ddd;
  font-size: 0.9em;
  background-color: rgba(123, 0, 255, 0.4);
  border-radius: 4px;
  margin: 10px auto;
  width: fit-content;
`;

const ErrorMessage = styled(MessageBase)`
  background-color: rgba(255, 0, 0, 0.6);
  border: 2px solid red;
  box-shadow: 0 0 10px red;
  max-width: 70%;
  align-self: flex-start;
`;

const MessageComponent = ({ message, dateTime }) => {
  switch (message.type) {
    case 'chat':
      return (
        <ChatMessage dateTime={dateTime}>
          <strong>{message.user}: </strong>
          {message.text}
        </ChatMessage>
      );
    case 'event':
      return <EventMessage dateTime={dateTime}>{message.text}</EventMessage>;
    case 'action':
      return <ActionMessage dateTime={dateTime}>{message.text}</ActionMessage>;
    case 'error':
      return <ErrorMessage dateTime={dateTime}>{message.text}</ErrorMessage>;
    default:
      return <div dateTime={dateTime}>Unknown message type</div>;
  }
};

// ---------------- Background, PageContainer, etc. ----------------
const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg/518px-Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg');
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

// Utility for random messages
const createRandomMessage = (id, type, animation) => {
  const now = new Date();
  const newMessage = {
    id,
    date: now,
    isNew: true,
    type,
    animation,
  };

  switch (type) {
    case 'chat':
      newMessage.user = `User ${Math.floor(Math.random() * 5) + 1}`;
      newMessage.text = 'New Chat: This is a new chat message.';
      break;
    case 'event':
      newMessage.text = 'New Event: A new event occurred.';
      break;
    case 'action':
      newMessage.text = 'New Action: An action just took place.';
      break;
    case 'error':
      newMessage.text = 'New Error: Something went wrong!';
      break;
    default:
      newMessage.text = 'Unknown message type.';
  }

  return newMessage;
};

// ---------------- Main DemoPage ----------------
const DemoPage = () => {
  const [messages, setMessages] = useState(() => {
    const now = new Date();
    const initialMessages = [];
    for (let i = 0; i < 20; i++) {
      const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const animation = animations[Math.floor(Math.random() * animations.length)];
      const message = {
        id: i + 1,
        date: new Date(now.getTime() - i * 60000),
        isNew: false,
        type,
        animation,
      };
      if (type === 'chat') {
        message.user = `User ${Math.floor(Math.random() * 5) + 1}`;
        message.text = `Message ${i}: This is a demo chat message.`;
      } else if (type === 'event') {
        message.text = `Message ${i}: An event occurred.`;
      } else if (type === 'action') {
        message.text = `Message ${i}: An action took place.`;
      } else if (type === 'error') {
        message.text = `Message ${i}: Something went wrong!`;
      }
      // random animation
      message.animation = animations[Math.floor(Math.random() * animations.length)];
      initialMessages.push(message);
    }
    return initialMessages;
  });
  const nextIdRef = useRef(21);
  const [selectedType, setSelectedType] = useState(messageTypes[0]);
  const [selectedAnimation, setSelectedAnimation] = useState(animations[0]);

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
      const dateTimeStr = format(msg.date, 'MMM dd, yyyy HH:mm');
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

  // Initialize PIXI + circle texture once
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

      const pixiContainer = document.getElementById('pixi-container');
      if (!pixiContainer) {
        console.error('PIXI container not found! Materialize effect will not work.');
        return;
      }
      pixiContainer.appendChild(window.pixiApp.view);

      // Create ParticleContainer for the dot sprites
      window.dots = new PIXI.ParticleContainer(2000, {
        scale: true,
        position: true,
        alpha: true,
        tint: true,
      });
      window.dots.blendMode = PIXI.BLEND_MODES.ADD;
      window.pixiApp.stage.addChild(window.dots);

      // Draw a base circle in Graphics -> texture
      const baseRadius = 6;
      window.baseRadius = baseRadius;
      const circleGfx = new PIXI.Graphics();
      circleGfx.beginFill(0xffffff);
      circleGfx.drawCircle(0, 0, baseRadius);
      circleGfx.endFill();
      window.circleTexture = window.pixiApp.renderer.generateTexture(circleGfx);
    }

    // Cleanup when unmounting
    return () => {
      if (window.pixiApp) {
        if (window.dots) {
          window.dots.removeChildren();
          window.dots.destroy({ children: true });
          window.dots = null;
        }
        window.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
        window.pixiApp = null;

        const pixiContainer = document.getElementById('pixi-container');
        if (pixiContainer) {
          pixiContainer.innerHTML = '';
        }
      }
    };
  }, []);

  return (
    <StyleSheetManager shouldForwardProp={(prop) => prop !== 'exiting'}>
      <Background />
      <PixiContainer id="pixi-container" />

      <ButtonBar style={{ flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '10px' }}>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            {messageTypes.map((typeItem) => (
              <option key={typeItem} value={typeItem}>
                {typeItem}
              </option>
            ))}
          </select>
          <select value={selectedAnimation} onChange={(e) => setSelectedAnimation(e.target.value)}>
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
};

export default DemoPage;
