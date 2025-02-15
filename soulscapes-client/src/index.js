import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { StyleSheetManager, keyframes, css } from 'styled-components';
import { format } from 'date-fns';
// Import necessary functions from pixi-react.
import { Container, primitiveComponents } from 'pixi-react';
import * as PIXI from 'pixi.js';
const { Graphics } = primitiveComponents;
window.PIXI = PIXI;

// ---------------- Keyframes Animations ----------------

// Float: Falls from the top while oscillating.
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

// Flicker: Haunted-house light effect.
const flicker = keyframes`
  0% { opacity: 0.8; }
  10% { opacity: 0.4; }
  20% { opacity: 1; }
  35% { opacity: 0.6; }
  50% { opacity: 0.95; }
  65% { opacity: 0.5; }
  80% { opacity: 1; }
  100% { opacity: 1; }
`;

// A simple ease-out function.
const easeOut = t => 1 - Math.pow(1 - t, 3);

// ---------------- PIXI Materialize Effect ----------------

// This component creates its own PIXI.Application and uses renderTo to draw glowing dots
// that converge from the edge into random positions within the message area.
const MaterializeEffect = ({ width = 300, height = 80, duration = 120 }) => {
  const containerRef = useRef(null);
  const [app, setApp] = useState(null);
  const [dots, setDots] = useState([]);

  // Create PIXI Application once the container is ready.
  useEffect(() => {
    if (containerRef.current && !app) {
      const appInstance = new PIXI.Application({ width, height, transparent: true });
      containerRef.current.appendChild(appInstance.view);
      setApp(appInstance);
      return () => {
        appInstance.destroy(true, { children: true });
      };
    }
  }, [containerRef, app, width, height]);

  // Initialize dots.
  useEffect(() => {
    const numDots = 30;
    const newDots = [];
    for (let i = 0; i < numDots; i++) {
      const edge = Math.floor(Math.random() * 4);
      let startX, startY;
      if (edge === 0) { // top
        startX = Math.random() * width;
        startY = 0;
      } else if (edge === 1) { // right
        startX = width;
        startY = Math.random() * height;
      } else if (edge === 2) { // bottom
        startX = Math.random() * width;
        startY = height;
      } else { // left
        startX = 0;
        startY = Math.random() * height;
      }
      const targetX = Math.random() * width;
      const targetY = Math.random() * height;
      newDots.push({ startX, startY, targetX, targetY, progress: 0 });
    }
    setDots(newDots);
  }, [width, height]);

  // Custom tick effect.
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId;
    const tick = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      setDots(oldDots =>
        oldDots.map(dot => {
          const newProgress = Math.min(dot.progress + delta / 16.67, duration);
          return { ...dot, progress: newProgress };
        })
      );
      animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [duration]);

  const dotElements = (
    <Container>
      {dots.map((dot, i) => {
        const t = dot.progress / duration;
        const easeT = easeOut(t);
        const x = dot.startX + (dot.targetX - dot.startX) * easeT;
        const y = dot.startY + (dot.targetY - dot.startY) * easeT;
        return (
          <Graphics
            key={i}
            draw={g => {
              g.clear();
              g.beginFill(0xffffaa, 1);
              g.drawCircle(x, y, 3);
              g.endFill();
            }}
          />
        );
      })}
    </Container>
  );

  // Render the dots to the PIXI application once it's ready.
  useEffect(() => {
    if (app) {
      const { renderTo } = require('pixi-react');
      renderTo(app, dotElements);
    }
  }, [app, dotElements]);

  return <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width, height }} />;
};

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
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

// InnerContainer: animates message content based on the chosen animation.
const InnerContainer = styled.div`
  opacity: ${props => (props.animate ? 1 : props.initialOpacity)};
  transform: ${props => (props.animate ? 'none' : props.initialTransform)};
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  ${props =>
    props.animate &&
    props.animationType === 'float' &&
    css`
      animation: ${floatFall} 2s ease-out forwards;
    `}
  ${props =>
    props.animate &&
    props.animationType === 'flicker' &&
    css`
      animation: ${flicker} 1s ease-out forwards;
    `}
`;

// MessagePlaceholder: reserves vertical space and triggers inner animation.
// For "materialize" messages, renders the MaterializeEffect overlay.
const MessagePlaceholder = ({
  isNew,
  animationType = 'fade',
  children,
  onAnimationComplete,
}) => {
  const [height, setHeight] = useState(isNew ? 0 : 80);
  const [animate, setAnimate] = useState(false);

  const getInitialInnerStyle = type => {
    switch (type) {
      case 'drop':
        return { opacity: 0, transform: 'translateY(-100vh)' };
      case 'float':
        return { opacity: 0, transform: 'translateY(-100vh) translateX(10vw) rotate(10deg)' };
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

  const initialStyle = isNew ? getInitialInnerStyle(animationType) : { opacity: 1, transform: 'none' };

  useEffect(() => {
    if (isNew) {
      setHeight(80);
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
      }, completionDelay);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isNew, animationType, onAnimationComplete]);

  return (
    <div style={{ position: 'relative', height, transition: 'height 0.5s ease-out' }}>
      <InnerContainer
        animate={animate}
        initialOpacity={initialStyle.opacity}
        initialTransform={initialStyle.transform}
        animationType={animationType}
      >
        {children}
      </InnerContainer>
      {animationType === 'materialize' && animate && (
        <MaterializeEffect width={300} height={80} duration={120} />
      )}
    </div>
  );
};

// EventScroller wraps its children in a scrollable area.
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

// ---------------- Message Components ----------------

const MessageBase = styled.div`
  padding: 10px;
  margin: 10px;
  color: white;
  font-size: 1em;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  position: relative;
  &::after {
    content: '${props => props.dateTime}';
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
          <strong>{message.user}:</strong> {message.text}
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

// ---------------- Other Page Components ----------------

const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg/518px-Schwetzingen_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg');
  background-size: cover;
  background-position: center;
  z-index: -1;
`;

// PageContainer now has no background (the EventScroller provides it).
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

// ---------------- DemoPage Component ----------------
// Now there's a single "Add Random Message" button.
// Each new message is assigned a random type and a random animation,
// including the new "materialize" effect.
const DemoPage = () => {
  const messageTypes = ['chat', 'event', 'action', 'error'];
  const animations = ['fade', 'drop', 'zip', 'float', 'flicker', 'materialize'];

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

  const addRandomMessage = () => {
    const now = new Date();
    const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    const animation = animations[Math.floor(Math.random() * animations.length)];
    const newMessage = {
      id: nextIdRef.current++,
      date: now,
      isNew: true,
      type,
      animation,
    };
    if (type === 'chat') {
      newMessage.user = `User ${Math.floor(Math.random() * 5) + 1}`;
      newMessage.text = 'New Chat: This is a new chat message.';
    } else if (type === 'event') {
      newMessage.text = 'New Event: A new event occurred.';
    } else if (type === 'action') {
      newMessage.text = 'New Action: An action just took place.';
    } else if (type === 'error') {
      newMessage.text = 'New Error: Something went wrong!';
    }
    setMessages(prev => [newMessage, ...prev]);
  };

  const markMessageAsFinal = id => {
    setMessages(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, isNew: false } : msg))
    );
  };

  const renderMessage = msg => {
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
  };

  return (
    <StyleSheetManager shouldForwardProp={prop => prop !== 'exiting'}>
      <Background />
      <ButtonBar>
        <StyledButton onClick={addRandomMessage}>Add Random Message</StyledButton>
      </ButtonBar>
      <PageContainer>
        <EventScroller>{messages.map(renderMessage)}</EventScroller>
      </PageContainer>
    </StyleSheetManager>
  );
};

export default DemoPage;
