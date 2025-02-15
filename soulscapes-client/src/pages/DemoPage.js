import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { StyleSheetManager, keyframes, css } from 'styled-components';
import { format } from 'date-fns';

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

// MessagePlaceholder reserves vertical space and triggers inner animation.
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
  background-image: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg/518px-Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg');
  background-size: cover;
  background-position: center;
  z-index: -1;
`;

/* PageContainer now has no background so that the black transparent background belongs solely to the EventScroller */
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

/* ---------------- DemoPage Component ---------------- */
/* Now there's a single "Add Random Message" button.
   Each message is assigned a random type and a random animation,
   including the new "materialize" effect.
*/
const DemoPage = () => {
    const messageTypes = ['chat', 'event', 'action', 'error'];
    const animations = ['fade', 'drop', 'zip', 'float', 'flicker'];

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

    const addRandomMessage = () => {
        const now = new Date();
        const newMessage = {
            id: nextIdRef.current++,
            date: now,
            isNew: true,
            type: selectedType, // Use selected type
            animation: selectedAnimation, // Use selected animation
        };
        if (selectedType === 'chat') {
            newMessage.user = `User ${Math.floor(Math.random() * 5) + 1}`;
            newMessage.text = 'New Chat: This is a new chat message.';
        } else if (selectedType === 'event') {
            newMessage.text = 'New Event: A new event occurred.';
        } else if (selectedType === 'action') {
            newMessage.text = 'New Action: An action just took place.';
        } else if (selectedType === 'error') {
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
            <ButtonBar style={{ flexDirection: 'column' }}>
                <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px" }}>
                    <select
                        value={selectedType}
                        onChange={e => setSelectedType(e.target.value)}
                    >
                        {messageTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <select
                        value={selectedAnimation}
                        onChange={e => setSelectedAnimation(e.target.value)}
                    >
                        {animations.map(animation => (
                            <option key={animation} value={animation}>{animation}</option>
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
