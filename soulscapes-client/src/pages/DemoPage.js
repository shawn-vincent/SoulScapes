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

//
// ----- Configuration (same as before) -----
//
const messageTypes = ['chat', 'event', 'action', 'error'];
const animations = ['fade', 'drop', 'zip', 'float', 'flicker', 'materialize'];

//
// ----- Keyframe Animations (same as before) -----
//
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

//
// ----- Styled Components (mostly same as before) -----
//
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

//
// ----- The updated MessagePlaceholder with `materialize` fix -----
//
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

  // --- initialStyle same as before ---
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

    return isNew ? getInitialInnerStyle(animationType) : { opacity: 1, transform: 'none' };
  }, [isNew, animationType]);

  // --- startAnimation same as before, except we setPixiActive for 'materialize' ---
  const startAnimation = useCallback(() => {
    setHeight(80);

    if (animationType === 'materialize') {
      setPixiActive(true);
    }

    const timer1 = setTimeout(() => {
      setAnimate(true);
    }, 500);

    const completionDelay =
      animationType === 'float'
        ? 2100
        : animationType === 'flicker'
        ? 1200
        : animationType === 'materialize'
        ? 2100
        : 800;

    const timer2 = setTimeout(() => {
      if (onAnimationComplete) onAnimationComplete();
      // We stop the pixi effect after the animation is complete
      setPixiActive(false);
    }, completionDelay);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [animationType, onAnimationComplete]);

  useEffect(() => {
    if (isNew) {
      return startAnimation();
    }
  }, [isNew, startAnimation]);

  //
  // ----- MaterializeEffect: now uses Sprite instead of Graphics -----
  //
  const MaterializeEffect = ({
    duration = 2100,
    dotColor = 0xffffff,
    dotInnerRadius = 2,
    dotOuterRadiusMultiplier = 3,
  }) => {
    const pixiApp = useRef(window.pixiApp);
    const dots = useRef(window.dots);
    const dotPool = useRef([]);

    // Instead of fully destroying the container, we just removeChildren
    const cleanupDots = useCallback(() => {
      if (dots.current) {
        dots.current.removeChildren(); // empty the container
      }
      // Destroy any sprites we created
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
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        const getTargetCoordinates = () => {
          if (!containerRef.current) {
            return { x: canvasWidth / 2, y: canvasHeight / 2 };
          }
          const messageElem = containerRef.current.firstElementChild;
          const rect = messageElem
            ? messageElem.getBoundingClientRect()
            : containerRef.current.getBoundingClientRect();

          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        };

        const { x: targetX, y: targetY } = getTargetCoordinates();
        const circleRadius = Math.max(canvasWidth, canvasHeight) * 1.2;
        const totalDots = 300; // smaller number for demo
        const maxDelay = duration * 0.5;
        const dotsData = [];

        // Prepare a list of random spawn positions around the message
        for (let i = 0; i < totalDots; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const r = Math.sqrt(Math.random()) * circleRadius;
          const startX = targetX + r * Math.cos(angle);
          const startY = targetY + r * Math.sin(angle);
          const delay = Math.random() * maxDelay;
          const innerRadius = dotInnerRadius + Math.random() * 2;
          dotsData.push({ startX, startY, delay, innerRadius });
        }

        const startTime = performance.now();

        // Animate using a requestAnimationFrame loop
        const animateDots = () => {
          const elapsed = performance.now() - startTime;

          for (let i = 0; i < totalDots; i++) {
            let dotSprite = dotPool.current[i];
            if (!dotSprite) {
              // Create a new sprite from our global circleTexture
              dotSprite = new PIXI.Sprite(window.circleTexture);
              dotSprite.anchor.set(0.5);
              dotPool.current[i] = dotSprite;
            }

            const dotData = dotsData[i];
            const localTime = elapsed - dotData.delay;
            if (localTime < 0) {
              // Dot hasn't started yet; remove from stage if present
              if (dotSprite.parent) {
                dots.current.removeChild(dotSprite);
              }
              continue;
            }

            const progress = Math.min(1, localTime / (duration - dotData.delay));
            const alpha = 1 - progress;
            const currentX = dotData.startX + progress * (targetX - dotData.startX);
            const currentY = dotData.startY + progress * (targetY - dotData.startY);

            // Only add to container once it starts
            if (!dotSprite.parent) {
              dots.current.addChild(dotSprite);
            }

            // scale the sprite using innerRadius + outer multiplier
            const outerRadius = dotData.innerRadius * dotOuterRadiusMultiplier;
            // We'll pick an overall radius for the sprite
            // You can do more sophisticated layering if you want outer+inner glow
            const finalRadius = outerRadius; // use the bigger radius
            // For example, if circleTexture was drawn at 6px radius, scale to match finalRadius
            // but we need our baseRadius that we used when generating circleTexture:
            const baseRadius = window.baseRadius || 6; // we assigned it in the main init
            const scaleFactor = finalRadius / baseRadius;

            dotSprite.tint = dotColor; // color
            dotSprite.x = currentX;
            dotSprite.y = currentY;
            dotSprite.alpha = alpha * 0.6; // slightly dim the circles
            dotSprite.scale.set(scaleFactor);
          }

          if (elapsed < duration) {
            animationFrameId = requestAnimationFrame(animateDots);
          } else {
            // animation finished
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
    <div
      style={{
        position: 'relative',
        height,
        transition: 'height 0.5s ease-out',
      }}
      ref={containerRef}
    >
      <div
        style={{
          opacity: animate ? 1 : initialStyle.opacity,
          transform: animate ? 'none' : initialStyle.transform,
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
          position: 'relative',
          zIndex: 3,
          ...(animate && animationType === 'float' && {
            animation: `${floatFall} 2s ease-out forwards`,
          }),
          ...(animate && animationType === 'flicker' && {
            animation: `${flicker} 1s ease-out forwards`,
          }),
        }}
      >
        {children}
      </div>
      {animationType === 'materialize' && pixiActive && (
        <MaterializeEffect duration={2100} dotColor={0xffff00} />
      )}
    </div>
  );
};

//
// ----- EventScroller (same as before) -----
//
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
      <ScrollableContent ref={scrollableContentRef}>{children}</ScrollableContent>
    </ScrollerContainer>
  );
};

//
// ----- Message Components (same as before) -----
//
const MessageBase = styled.div`
  padding: 10px;
  margin: 10px;
  color: white;
  font-size: 1em;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 4; /* Ensure the message is above the PIXI animation */
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

//
// ----- Background and PageContainer (same as before) -----
//
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

//
// ----- Utility to create a new random message (same as before) -----
//
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

//
// ----- The main DemoPage component -----
//
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
      message.animation = animations[Math.floor(Math.random() * animations.length)];
      initialMessages.push(message);
    }
    return initialMessages;
  });
  const nextIdRef = useRef(21);
  const [selectedType, setSelectedType] = useState(messageTypes[0]);
  const [selectedAnimation, setSelectedAnimation] = useState(animations[0]);

  //
  // Add a random message using user-selected type+animation
  //
  const addRandomMessage = useCallback(() => {
    const newMessage = createRandomMessage(
      nextIdRef.current++,
      selectedType,
      selectedAnimation
    );
    setMessages((prev) => [newMessage, ...prev]);
  }, [selectedType, selectedAnimation]);

  //
  // Mark message as no longer "isNew" once its animation completes
  //
  const markMessageAsFinal = useCallback((id) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isNew: false } : msg))
    );
  }, []);

  //
  // Render each message in a placeholder with animation
  //
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

  //
  // 1) Initialize the PIXI app once and store in window
  // 2) Create a circle texture to use for "materialize" dots
  //
  useEffect(() => {
    if (!window.pixiApp) {
      // create PIXI app
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

      // create a ParticleContainer
      window.dots = new PIXI.ParticleContainer(1000, {
        scale: true,
        position: true,
        alpha: true,
        tint: true, // allow color tinting
      });
      window.dots.blendMode = PIXI.BLEND_MODES.ADD;
      window.pixiApp.stage.addChild(window.dots);

      // Create a small white circle shape in a Graphics
      const baseRadius = 6; // ~6px radius
      window.baseRadius = baseRadius; // store so we can scale later
      const circleGfx = new PIXI.Graphics();
      circleGfx.beginFill(0xffffff);
      circleGfx.drawCircle(0, 0, baseRadius);
      circleGfx.endFill();

      // Generate a texture from that Graphics
      window.circleTexture = window.pixiApp.renderer.generateTexture(circleGfx);
    }

    // Cleanup: destroy pixiApp once when unmounting
    return () => {
      if (window.pixiApp) {
        if (window.dots) {
          window.dots.removeChildren(); // empty container
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
      {/** Full-screen container for PIXI canvases **/}
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
          <select
            value={selectedAnimation}
            onChange={(e) => setSelectedAnimation(e.target.value)}
          >
            {animations.map((animation) => (
              <option key={animation} value={animation}>
                {animation}
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
