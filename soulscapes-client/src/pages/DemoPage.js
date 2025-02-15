import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { StyleSheetManager } from 'styled-components';
import { format } from 'date-fns';

/* ---------------- Styled Components ---------------- */

const ScrollerContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
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

/* ---------------- MessagePlaceholder Component ---------------- */
/*
  This component reserves a fixed vertical space (80px) by animating its height.
  Meanwhile, the inner content animates its opacity and transform.
  
  Supported inner animations:
    - "fade": fades in (default)
    - "drop": drops in from the top of the screen (translateY(-100vh) to 0)
    - "float": floats in like a leaf from off-screen (translateY(-100vh) translateX(10vw) rotate(-10deg) to 0)
    - "zip": zips in from the side of the screen (translateX(100vw) to 0)
  
  Timeline:
    - 0ms: Outer container (placeholder) starts expanding; inner content is at its initial state.
    - 500ms: Outer container reaches full height and inner content animates to its final state.
    - 800ms: onAnimationComplete callback is fired.
*/
const MessagePlaceholder = ({
  isNew,
  animationType = 'fade',
  children,
  onAnimationComplete,
}) => {
  const [height, setHeight] = useState(isNew ? 0 : 'auto');

  const getInitialInnerStyle = (type) => {
    switch (type) {
      case 'drop':
        return { opacity: 0, transform: 'translateY(-100vh)' };
      case 'float':
        return { opacity: 0, transform: 'translateY(-100vh) translateX(10vw) rotate(-10deg)' };
      case 'zip':
        return { opacity: 0, transform: 'translateX(100vw)' };
      case 'fade':
      default:
        return { opacity: 0, transform: 'none' };
    }
  };

  const [innerStyle, setInnerStyle] = useState(
    isNew ? getInitialInnerStyle(animationType) : { opacity: 1, transform: 'none' }
  );

  useEffect(() => {
    if (isNew) {
      // Start expanding the reserved space.
      setHeight('80px');

      const timer1 = setTimeout(() => {
        // After 500ms, animate the inner content into place.
        setHeight('auto');
        setInnerStyle({ opacity: 1, transform: 'none' });
      }, 500);

      const timer2 = setTimeout(() => {
        if (onAnimationComplete) onAnimationComplete();
      }, 800);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isNew, animationType, onAnimationComplete]);

  return (
    <div
      style={{
        height,
        transition: 'height 0.5s ease-out',
      }}
    >
      <div
        style={{
          ...innerStyle,
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------------- EventScroller Component ---------------- */
// Wraps its children inside a scrollable container.
// With column-reverse, the first DOM element appears at the bottom.
const EventScroller = ({ children }) => {
  const scrollableContentRef = useRef(null);

  // For column-reverse, scrolling to “bottom” means setting scrollTop to 0.
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

/* ---------------- Message Components ---------------- */

const MessageBase = styled.div`
  padding: 10px;
  margin: 10px;
  color: white;
  font-size: 1em;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  position: relative;

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

/* ---------------- Other Page Components ---------------- */

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

// The PageContainer now uses overflow:auto so the list isn’t clipped,
// and the ButtonBar is in normal flow (not absolutely positioned).
const PageContainer = styled.div`
  width: 80%;
  max-width: 800px;
  height: 80vh;
  margin: 5vh auto;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  padding: 10px;
  position: relative;
  overflow: auto;
`;

const ButtonBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
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

/* ---------------- DemoPage Component ---------------- */

const DemoPage = () => {
  // Mapping message type to its entrance animation.
  const getAnimationType = (messageType) => {
    switch (messageType) {
      case 'chat':
        return 'fade';
      case 'event':
        return 'float';
      case 'action':
        return 'zip';
      case 'error':
        return 'drop';
      default:
        return 'fade';
    }
  };

  // Initial demo messages.
  const [messages, setMessages] = useState(() => {
    const now = new Date();
    const initialMessages = [];
    for (let i = 0; i < 20; i++) {
      const randomType = Math.random();
      const message = {
        id: i + 1,
        date: new Date(now.getTime() - i * 60000),
        isNew: false,
      };

      if (randomType < 0.5) {
        message.type = 'chat';
        message.user = `User ${Math.floor(Math.random() * 5) + 1}`;
        message.text = `Message ${i}: This is a demo message.`;
      } else if (randomType < 0.7) {
        message.type = 'event';
        message.text = `Event ${i}: An event occurred.`;
      } else {
        message.type = 'action';
        message.text = `Action ${i}: User ${Math.floor(Math.random() * 5) + 1} did something.`;
      }
      initialMessages.push(message);
    }
    return initialMessages;
  });

  // Unique ID tracker.
  const nextIdRef = useRef(21);

  // Generic function to add a message of a given type.
  const addMessageOfType = (type) => {
    const now = new Date();
    const newMessage = {
      id: nextIdRef.current++,
      date: now,
      isNew: true,
      type,
    };

    if (type === 'chat') {
      newMessage.user = `User ${Math.floor(Math.random() * 5) + 1}`;
      newMessage.text = 'New Chat: This is a new chat message.';
    } else if (type === 'event') {
      newMessage.text = 'New Event: A new event occurred.';
    } else if (type === 'action') {
      newMessage.text = `New Action: User ${Math.floor(Math.random() * 5) + 1} performed an action.`;
    } else if (type === 'error') {
      newMessage.text = 'New Error: Something went wrong!';
    }

    // Prepend so that new messages appear at the bottom (with column-reverse).
    setMessages((prev) => [newMessage, ...prev]);
  };

  // Mark message as final once its animation is complete.
  const markMessageAsFinal = (id) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isNew: false } : msg))
    );
  };

  const renderMessage = (msg) => {
    const dateTimeStr = format(msg.date, 'MMM dd, yyyy HH:mm');
    return (
      <MessagePlaceholder
        key={msg.id}
        isNew={msg.isNew}
        animationType={getAnimationType(msg.type)}
        onAnimationComplete={() => msg.isNew && markMessageAsFinal(msg.id)}
      >
        <MessageComponent message={msg} dateTime={dateTimeStr} />
      </MessagePlaceholder>
    );
  };

  return (
    <StyleSheetManager shouldForwardProp={(prop) => prop !== 'exiting'}>
      <Background />
        <ButtonBar>
          <StyledButton onClick={() => addMessageOfType('chat')}>
            Add Chat Message
          </StyledButton>
          <StyledButton onClick={() => addMessageOfType('event')}>
            Add Event Message
          </StyledButton>
          <StyledButton onClick={() => addMessageOfType('action')}>
            Add Action Message
          </StyledButton>
          <StyledButton onClick={() => addMessageOfType('error')}>
            Add Error Message
          </StyledButton>
        </ButtonBar>
      <PageContainer>
        <EventScroller>{messages.map(renderMessage)}</EventScroller>
      </PageContainer>
    </StyleSheetManager>
  );
};

export default DemoPage;
