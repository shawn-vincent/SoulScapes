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
  Always reserves the same vertical space (targetHeight).
  If isNew is true, it starts with height 0 and opacity 0,
  then animates its height to targetHeight over 0.5s and fades in its children over 0.3s.
  When the animation is complete, it calls onAnimationComplete.
*/
const MessagePlaceholder = ({ isNew, children, onAnimationComplete }) => {
  const [height, setHeight] = useState(isNew ? 0 : 'auto');
  const [opacity, setOpacity] = useState(isNew ? 0 : 1);

  useEffect(() => {
    if (!isNew) return;

    // Trigger height expansion immediately.
    setHeight('80px');

    const timer1 = setTimeout(() => {
      setHeight('auto');
      setOpacity(1);
    }, 500);

    const timer2 = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isNew, onAnimationComplete]);

  return (
    <div
      style={{
        height,
        transition: 'height 0.5s ease-out'
      }}
    >
      <div
        style={{
          opacity,
          transition: 'opacity 0.3s ease-out'
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
  margin: 10px 10px;
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
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  padding: 10px;
  position: relative;
  overflow: hidden;
`;

const ButtonBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 10px;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 20;
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
  // Initialize 20 demo messages.
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

      if (randomType < 0.6) {
        message.type = 'chat';
        message.user = `User ${Math.floor(Math.random() * 5) + 1}`;
        message.text = `Message ${i}: This is a demo message.`;
      } else if (randomType < 0.8) {
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

  // Track the next unique ID.
  const nextIdRef = useRef(21);

  // Add a new message with isNew true.
  const addMessage = () => {
    const now = new Date();
    const randomType = Math.random();
    const newMessage = {
      id: nextIdRef.current++,
      date: now,
      isNew: true,
    };

    if (randomType < 0.6) {
      newMessage.type = 'chat';
      newMessage.user = `User ${Math.floor(Math.random() * 5) + 1}`;
      newMessage.text = 'New Message: This is a new demo message.';
    } else if (randomType < 0.8) {
      newMessage.type = 'event';
      newMessage.text = 'New Event: A new event occurred.';
    } else {
      newMessage.type = 'action';
      newMessage.text = `New Action: User ${Math.floor(Math.random() * 5) + 1} performed a new action.`;
    }

    // Prepend new messages so they appear at the bottom (with column-reverse).
    setMessages((prev) => [newMessage, ...prev]);
  };

  // Update a message once its animation is complete.
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
        onAnimationComplete={() => msg.isNew && markMessageAsFinal(msg.id)}
      >
        <MessageComponent message={msg} dateTime={dateTimeStr} />
      </MessagePlaceholder>
    );
  };

  return (
    <StyleSheetManager shouldForwardProp={(prop) => prop !== 'exiting'}>
      <Background />
      <PageContainer>
        <ButtonBar>
          <StyledButton onClick={addMessage}>Add Message</StyledButton>
        </ButtonBar>
        <EventScroller>
          {messages.map(renderMessage)}
        </EventScroller>
      </PageContainer>
    </StyleSheetManager>
  );
};

export default DemoPage;
