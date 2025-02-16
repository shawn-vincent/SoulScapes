/** @jsxImportSource @emotion/react */
import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { format } from "date-fns";
import { InstalledAnimations } from "./AnimationManager";
import eventManager from "../services/EventManager";

// Import BaseCommand and CommandRegistry from CommandLine.
import { BaseCommand, CommandRegistry } from "./CommandLine";

// -----------------------------------------------------------------------
// Styled Components for Events
// -----------------------------------------------------------------------
const EventBase = styled.div`
  /* Common base styles for events */
`;

export const MessageEvent = styled(EventBase)`
  border: ${props => props.DEBUG ? "2px solid limegreen" : "none"};
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
  border: ${props => props.DEBUG ? "2px solid limegreen" : "none"};
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
  border: ${props => props.DEBUG ? "2px solid limegreen" : "none"};
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
  border: ${props => props.DEBUG ? "2px solid limegreen" : "none"};
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
  transform: ${(props) => (props.isAnimated ? "none" : props.initialTransform)};
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
// Event Component
// -----------------------------------------------------------------------
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
// EventPane Component
// -----------------------------------------------------------------------
export function EventPane() {
  // Subscribe to events from EventManager.
  const [events, setEvents] = useState(eventManager.getEvents());

  useEffect(() => {
    const listener = (newEvents) => {
      setEvents(newEvents);
    };
    eventManager.subscribe(listener);
    return () => {
      eventManager.unsubscribe(listener);
    };
  }, []);

  return (
    <EventPanelScrollContainer>
      <EventPanelContent>
        {events.map((event) => (
          <React.Fragment key={event.id}>
            <EventComponent
              event={event}
              dateTime={format(event.date, "hh:mm:ss")}
            />
          </React.Fragment>
        ))}
      </EventPanelContent>
    </EventPanelScrollContainer>
  );
}

// -----------------------------------------------------------------------
// ChatCommand: Default Command to Create a Chat Message Event
// -----------------------------------------------------------------------
export class ChatCommand extends BaseCommand {
  constructor() {
    super("chat");
  }

  /**
   * Execute the command to create a new chat message event.
   * @param {string} fullText - The full text of the input.
   */
  execute(fullText) {
    const newEvent = {
      id: Date.now(),
      date: new Date(),
      isNew: true,
      type: "chatMessageEvent",
      text: fullText, // Optionally strip a leading "/" if desired.
      creationAnimation: null,
    };
    eventManager.addEvent(newEvent);
  }
}

// Register ChatCommand as the default command.
// We run this registration when the module is loaded.
if (typeof window !== "undefined") {
  CommandRegistry.registerDefault(new ChatCommand());
}
