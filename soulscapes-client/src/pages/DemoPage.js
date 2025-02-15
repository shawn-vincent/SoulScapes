import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { StyleSheetManager } from 'styled-components';
import { format } from 'date-fns';

/* ---------------- Styled Components ---------------- */

// Outer container for the scroller
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

// Scrollable area with column-reverse layout so that new items appear at the bottom.
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

// Wraps existing messages.
const AnimatedItem = styled.div`
  margin-bottom: 5px;
  opacity: ${(props) => (props.$isNew ? 0 : 1)};
  xtransform: translateY(${(props) => (props.$isNew ? '10px' : '0')});
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
`;

/* 
  Combined new message component:
  It starts with a height of 0 and then grows to the target height over 0.5s.
  Once grown, its content fades in (over 0.3s) without any translateY.
*/
const AnimatedNewMessageContainer = styled.div`
  height: ${(props) => (props.hasGrown ? `${props.height}px` : '0px')};
  transition: height 0.5s ease-out;
  overflow: hidden;
  margin-bottom: 5px;
`;

const AnimatedMessageContent = styled.div`
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 0.3s ease-out;
`;

const AnimatedNewMessage = ({ message, dateTime, height, onAnimationComplete }) => {
  const [hasGrown, setHasGrown] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Trigger height expansion immediately.
    setHasGrown(true);

    // After 0.5s (the height transition), fade in the content.
    const fadeTimer = setTimeout(() => {
      setContentVisible(true);
    }, 500);

    // After both animations complete (0.5s + 0.3s = 0.8s), call the callback.
    const completeTimer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onAnimationComplete]);

  return (
    <AnimatedNewMessageContainer hasGrown={hasGrown} height={height}>
      <AnimatedMessageContent visible={contentVisible}>
        <MessageComponent message={message} dateTime={dateTime} />
      </AnimatedMessageContent>
    </AnimatedNewMessageContainer>
  );
};

/* ---------------- EventScroller Component ---------------- */

// Wraps its children inside a scrollable container.
// With column-reverse, new items added first appear at the bottom.
const EventScroller = ({ children }) => {
  const containerRef = useRef(null);
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
    <ScrollerContainer ref={containerRef}>
      <ScrollableContent ref={scrollableContentRef}>
        {React.Children.map(children, (child, index) => (
          <AnimatedItem key={index} $isNew={false}>
            {child}
          </AnimatedItem>
        ))}
      </ScrollableContent>
    </ScrollerContainer>
  );
};

/* ---------------- Message Components ---------------- */

// Base style for a message (each message shows its own timestamp via the ::after pseudo-element)
const MessageBase = styled.div`
  padding: 10px;
  margin: 5px 10px;
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
  background-color: rgba(255, 255, 255, 0.1);
  max-width: 70%;
  align-self: flex-start;
`;

const EventMessage = styled(MessageBase)`
  text-align: center;
  color: #aaa;
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  margin: 5px auto;
  width: fit-content;
`;

const ActionMessage = styled(MessageBase)`
  text-align: center;
  color: #ddd;
  font-size: 0.9em;
  background-color: rgba(123, 0, 255, 0.2);
  border-radius: 4px;
  margin: 5px auto;
  width: fit-content;
`;

// Renders a message based on its type.
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
  // Create 20 initial messages (newest first) so that column-reverse displays them with the newest at the bottom.
  const [messages, setMessages] = useState(() => {
    const now = new Date();
    const initial = [];
    for (let i = 0; i < 20; i++) {
      const randomType = Math.random();
      const msg = { date: new Date(now.getTime() - i * 60000) };
      if (randomType < 0.6) {
        msg.type = 'chat';
        msg.user = `User ${Math.floor(Math.random() * 5) + 1}`;
        msg.text = `Message ${i}: This is a demo message.`;
      } else if (randomType < 0.8) {
        msg.type = 'event';
        msg.text = `Event ${i}: An event occurred.`;
      } else {
        msg.type = 'action';
        msg.text = `Action ${i}: User ${Math.floor(Math.random() * 5) + 1} did something.`;
      }
      initial.push(msg);
    }
    return initial;
  });

  // newMessage holds the message that is being animated in.
  const [newMessage, setNewMessage] = useState(null);
  // Estimate the height of a new message (in pixels)
  const itemHeight = 50;

  const addMessage = () => {
    const now = new Date();
    const randomType = Math.random();
    const newMsg = { date: now };
    if (randomType < 0.6) {
      newMsg.type = 'chat';
      newMsg.user = `User ${Math.floor(Math.random() * 5) + 1}`;
      newMsg.text = 'New Message: This is a new demo message.';
    } else if (randomType < 0.8) {
      newMsg.type = 'event';
      newMsg.text = 'New Event: A new event occurred.';
    } else {
      newMsg.type = 'action';
      newMsg.text = `New Action: User ${Math.floor(Math.random() * 5) + 1} performed a new action.`;
    }
    setNewMessage(newMsg);
  };

  // When the new message animation completes, merge it into the list.
  const handleNewMessageComplete = () => {
    setMessages((prev) => [newMessage, ...prev]);
    setNewMessage(null);
  };

  // Render an existing message.
  const renderMessage = (msg, index) => {
    const dateTimeStr = format(msg.date, 'MMM dd, yyyy HH:mm');
    return (
      <AnimatedItem key={index} $isNew={false}>
        <MessageComponent message={msg} dateTime={dateTimeStr} />
      </AnimatedItem>
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
          {newMessage && (
            <AnimatedNewMessage
              message={newMessage}
              dateTime={format(newMessage.date, 'MMM dd, yyyy HH:mm')}
              height={itemHeight}
              onAnimationComplete={handleNewMessageComplete}
            />
          )}
          {messages.map((msg, index) => renderMessage(msg, index))}
        </EventScroller>
      </PageContainer>
    </StyleSheetManager>
  );
};

export default DemoPage;
