/** @jsxImportSource @emotion/react */
import React, { useState, useRef, useCallback, useEffect } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { format } from "date-fns";
import { InstalledAnimations } from "./AnimationManager";

// DEBUG flag for development.
const DEBUG = false;

// -----------------------------------------------------------------------
// Styled Components for Events
// -----------------------------------------------------------------------
const EventBase = styled.div`
  /* Common base styles for events */
`;

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

// -----------------------------------------------------------------------
// Container & Animation Wrappers
// -----------------------------------------------------------------------
const AnimatedEventContainer = styled.div`
  position: relative;
  z-index: 3;
  opacity: ${(props) => (props.isAnimated ? 1 : props.initialOpacity)};
  transform: ${(props) =>
    props.isAnimated ? "none" : props.initialTransform};
  transition: opacity 2s ease-out, transform 2s ease-out;
  ${(props) =>
    props.animation && props.isAnimated ? props.animation.getCSS() : ""}
`;

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

// -----------------------------------------------------------------------
// Event Animation Placeholder
// -----------------------------------------------------------------------
export const EventAnimationPlaceholder = ({
  isNew,
  creationAnimation,
  children,
  onAnimationComplete,
}) => {
  const [height, setHeight] = useState(isNew ? 0 : 80);
  const [isAnimated, setIsAnimated] = useState(false);
  const eventRef = useRef(null);
  const childWithRef = React.cloneElement(
    React.Children.only(children),
    { ref: eventRef }
  );

  const animation = InstalledAnimations[creationAnimation] || null;
  const initialStyle =
    isNew && animation
      ? animation.initialStyle
      : { opacity: 1, transform: "none" };

  // Use the animation's own duration.
  const effectTime = animation ? animation.getEffectDuration() : 800;

  const startAnimation = useCallback(() => {
    setHeight(80);
    setIsAnimated(true);
    if (animation && typeof animation.runEffect === "function") {
      animation.runEffect(eventRef.current);
    }
    const timer = setTimeout(() => {
      if (onAnimationComplete) onAnimationComplete();
    }, effectTime);
    return () => clearTimeout(timer);
  }, [effectTime, onAnimationComplete, animation]);

  useEffect(() => {
    if (isNew) {
      startAnimation();
    }
  }, [isNew, startAnimation]);

  return (
    <div
      style={{
        position: "relative",
        height,
        transition: "height 0.5s ease-out",
      }}
    >
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

// -----------------------------------------------------------------------
// Event Panel & Event Component
// -----------------------------------------------------------------------
export function EventPane({ children }) {
  const scrollableContentRef = useRef(null);
  return (
    <EventPanelScrollContainer>
      <EventPanelContent ref={scrollableContentRef}>
        {children}
      </EventPanelContent>
    </EventPanelScrollContainer>
  );
}

export const EventComponent = React.forwardRef(
  ({ event, dateTime }, ref) => {
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
  }
);

// -----------------------------------------------------------------------
// Helper: Create a Random Event
// -----------------------------------------------------------------------
export function createRandomEvent(id, type, creationAnimation) {
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
