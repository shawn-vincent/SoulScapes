/** @jsxImportSource @emotion/react */
import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
} from "react";
import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import { format } from "date-fns";
import { InstalledAnimations } from "./AnimationManager";
import { useEvents, addEvent } from "../services/EventManager";
// Import BaseCommand and CommandRegistry from CommandLine.
import { BaseCommand, CommandRegistry } from "./CommandLine";
import eventManager from "../services/EventManager";

// -----------------------------------------------------------------------
// Animation for Gradient Pulse
// -----------------------------------------------------------------------
const pulse = keyframes`
    0% {
        opacity: 0.8;
        transform: translateY(0);
    }
    50% {
        opacity: 0.3;
        transform: translateY(3px);
    }
    100% {
        opacity: 0.8;
        transform: translateY(0);
    }
`;

// -----------------------------------------------------------------------
// Styled Components for Events
// -----------------------------------------------------------------------
const EventBase = styled.div`
  /* Common base styles for events */
`;

export const MessageEvent = styled(EventBase)`
  border: ${(props) => (props.DEBUG ? "2px solid limegreen" : "none")};
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
  border: ${(props) => (props.DEBUG ? "2px solid limegreen" : "none")};
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
  border: ${(props) => (props.DEBUG ? "2px solid limegreen" : "none")};
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
  border: ${(props) => (props.DEBUG ? "2px solid limegreen" : "none")};
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
// Animated Event Container
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
    // Clone the child element to attach a ref.
    const childWithRef = React.cloneElement(React.Children.only(children), {
        ref: eventRef,
    });

    const animation = InstalledAnimations[creationAnimation] || null;
    const initialStyle =
        isNew && animation
            ? animation.initialStyle
            : { opacity: 1, transform: "none" };

    // Use the animation's own duration (in milliseconds).
    const effectTime = animation ? animation.getEffectDuration() : 800;

    const startAnimation = useCallback(() => {
        setIsAnimated(true);
        if (animation && typeof animation.runEffect === "function") {
            animation.runEffect(eventRef.current);
        }
        const timer = setTimeout(() => {
            if (onAnimationComplete) onAnimationComplete();
        }, effectTime);
        return () => clearTimeout(timer);
    }, [effectTime, onAnimationComplete, animation]);

    // Wait to set the final height before the drop animation is enabled
    useEffect(() => {
        if (isNew) {
            const containerExpandTime = 500; // Adjust timing based on the animation duration (should be close to it)
            setHeight(80);
            const timer = setTimeout(() => {
                startAnimation()
            }, containerExpandTime)
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
// Event Component
// -----------------------------------------------------------------------
export const EventComponent = React.forwardRef(({ event, dateTime }, ref) => {
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

// -----------------------------------------------------------------------
// Utility to mark an event as final (no longer new)
// -----------------------------------------------------------------------
// This is one way to update the event's state so that it doesn't animate again.
// You may want to adjust this to fit your application's state management.
const markEventAsFinal = (eventId) => {
    const events = eventManager.getSnapshot();
    const evt = events.find((e) => e.id === eventId);
    if (evt && evt.isNew) {
        evt.isNew = false;
        // Trigger a re-render by emitting a change.
        eventManager.emitChange();
    }
};

// -----------------------------------------------------------------------
// Container & Scrollable Content
// -----------------------------------------------------------------------
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

const GradientOverlay = styled.div`
    position: absolute;
    left: 0;
    width: 100%;
    height: 50px; /* Adjust height as needed */
    z-index: 2;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0));
    opacity: 0.8;
    animation: ${pulse} 2s linear infinite;
`;

const TopGradientOverlay = styled(GradientOverlay)`
    top: 0;
    /* initial opacity for the top gradient */
    opacity: ${props => props.show ? 0.8 : 0};
    transition: opacity 0.3s ease-in-out;  /* animate opacity */
`;

const BottomGradientOverlay = styled(GradientOverlay)`
    bottom: 0;
    transform: rotate(180deg);
    /* initial opacity for the bottom gradient */
    opacity: ${props => props.show ? 0.8 : 0};
    transition: opacity 0.3s ease-in-out; /* animate opacity */
`;

// -----------------------------------------------------------------------
// EventPane Component
// -----------------------------------------------------------------------
export function EventPane() {
    const events = useEvents();
    const [showTopGradient, setShowTopGradient] = useState(false);
    const [showBottomGradient, setShowBottomGradient] = useState(false);
    const contentRef = useRef(null);

    const updateGradients = useCallback(() => {
        if (!contentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        // 1px threshold to avoid flickering at the very top/bottom.
        setShowTopGradient(scrollTop > 1);
        setShowBottomGradient(scrollTop + clientHeight < scrollHeight - 1);
    }, []);

    useEffect(() => {
        updateGradients(); // Initial check

        const current = contentRef.current;
        if (current) {
            current.addEventListener('scroll', updateGradients);
            return () => {
                current.removeEventListener('scroll', updateGradients);
            };
        }
    }, [updateGradients]);

    return (
        <EventPanelScrollContainer>
            <TopGradientOverlay show={showTopGradient}/>
            <EventPanelContent ref={contentRef}>
                {events.map((evt) => {
                    const dateTimeStr = format(evt.date, "hh:mm:ss");
                    return (
                        <EventAnimationPlaceholder
                            key={evt.id}
                            isNew={evt.isNew}
                            creationAnimation={evt.creationAnimation}
                            onAnimationComplete={() => {
                                if (evt.isNew) {
                                    markEventAsFinal(evt.id);
                                }
                            }}
                        >
                            <EventComponent event={evt} dateTime={dateTimeStr} />
                        </EventAnimationPlaceholder>
                    );
                })}
            </EventPanelContent>
            <BottomGradientOverlay show={showBottomGradient}/>
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
            text: fullText,
            creationAnimation: "zipUp",
        };
        addEvent(newEvent);
    }
}

// -----------------------------------------------------------------------
// ErrorCommand:  Command to Create an Error Message Event
// -----------------------------------------------------------------------
export class ErrorCommand extends BaseCommand {
  constructor() {
    super("error");
  }

  /**
   * Execute the command to create a new error message event.
   * @param {string} fullText - The full text of the input.
   */
  execute(fullText) {
    const message = fullText.substring(fullText.indexOf(' ') + 1);
    eventManager.addEvent(this.createErrorEvent(message));
  }

  createErrorEvent(message) { return {id: Date.now(), date: new Date(), isNew: true, type: "errorEvent", text: message, creationAnimation: "zipUp",}; }
}

// Register ChatCommand as the default command.
if (typeof window !== "undefined") {
    CommandRegistry.registerDefault(new ChatCommand());
  CommandRegistry.register(new ErrorCommand());
}
