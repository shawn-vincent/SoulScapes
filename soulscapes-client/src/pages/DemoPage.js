/** @jsxImportSource @emotion/react */
import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { format } from "date-fns";
import * as PIXI from "pixi.js";

// Import slogger functions.
import { slog, serror } from "../../../shared/slogger.js";

// Import components and helpers.
import { 
  EventPane, 
  EventComponent, 
} from "../components/EventPane";
import { InstalledAnimations } from "../components/AnimationManager";

// -----------------------------------------------------------------------
// Other Helpers & Styled Components
// -----------------------------------------------------------------------
const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg/518px-Schwetzingen_-_Schlossgarten_-_Gro%C3%9Fer_Weiher_-_Westende_mit_Br%C3%BCcke_im_Herbst_2.jpg");
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

// -----------------------------------------------------------------------
// DemoPage Component
// -----------------------------------------------------------------------
export default function DemoPage() {
  const [events, setEvents] = useState(() => {
    const now = new Date();
    const initialEvents = [];
    for (let i = 0; i < 5; i++) {
      const type = ["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"][
        Math.floor(Math.random() * 4)
      ];
      const animationKeys = Object.keys(InstalledAnimations);
      const creationAnimation =
        animationKeys[Math.floor(Math.random() * animationKeys.length)];
      const event = {
        id: i + 1,
        date: new Date(now.getTime() - i * 60000),
        isNew: false,
        type,
        creationAnimation,
      };
      if (type === "chatMessageEvent") {
        event.text = `Message ${i}: This is a demo chat message.`;
      } else if (type === "infoEvent") {
        event.text = `Message ${i}: An event occurred.`;
      } else if (type === "actionEvent") {
        event.text = `Message ${i}: An action took place.`;
      } else if (type === "errorEvent") {
        event.text = `Message ${i}: Something went wrong!`;
      }
      initialEvents.push(event);
    }
    return initialEvents;
  });

  const nextIdRef = useRef(6);
  const [selectedType, setSelectedType] = useState("chatMessageEvent");
  const [selectedCreationAnimation, setSelectedCreationAnimation] = useState("zipUp");

  const addRandomEvent = useCallback(() => {
    // const newEvent = createRandomEvent(
    //   nextIdRef.current++,
    //   selectedType,
    //   selectedCreationAnimation
    // );
    //setEvents((prev) => [newEvent, ...prev]);
    //slog("DemoPage", `Added new event (id: ${newEvent.id}) of type ${newEvent.type}.`);
  }, [selectedType, selectedCreationAnimation]);

  const markEventAsFinal = useCallback((id) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, isNew: false } : evt))
    );
    slog("DemoPage", `Event (id: ${id}) animation completed.`);
  }, []);

  // const renderEvent = useCallback(
  //   (evt) => {
  //     const dateTimeStr = format(evt.date, "MMM dd, yyyy HH:mm");
  //     return (
  //       <EventAnimationPlaceholder
  //         key={evt.id}
  //         isNew={evt.isNew}
  //         creationAnimation={evt.creationAnimation}
  //         onAnimationComplete={() => evt.isNew && markEventAsFinal(evt.id)}
  //       >
  //         <EventComponent event={evt} dateTime={dateTimeStr} />
  //       </EventAnimationPlaceholder>
  //     );
  //   },
  //   [markEventAsFinal]
  // );

  // Initialize PIXI with robust error handling.
  useEffect(() => {
    try {
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
        const pixiContainer = document.getElementById("pixi-container");
        if (!pixiContainer) {
          serror("DemoPage", "PIXI container not found! Materialize effect will not work.");
          return;
        }
        pixiContainer.appendChild(window.pixiApp.view);
        window.dots = new PIXI.particles.ParticleContainer(5000, {
          scale: true,
          position: true,
          alpha: true,
          tint: true,
        });
        window.dots.blendMode = PIXI.BLEND_MODES.ADD;
        window.pixiApp.stage.addChild(window.dots);
        const baseRadius = 6;
        window.baseRadius = baseRadius;
        const circleGfx = new PIXI.Graphics();
        circleGfx.beginFill(0xffffff);
        circleGfx.drawCircle(0, 0, baseRadius);
        circleGfx.endFill();
        window.circleTexture = window.pixiApp.renderer.generateTexture(circleGfx);
        slog("DemoPage", "PIXI application initialized successfully.");
      }
    } catch (error) {
      serror("DemoPage", `Error initializing PIXI: ${error.message}`);
    }
    return () => {
      try {
        if (window.pixiApp) {
          if (window.dots) {
            window.dots.removeChildren();
            window.dots.destroy({ children: true });
            window.dots = null;
          }
          window.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
          window.pixiApp = null;
          const pixiContainer = document.getElementById("pixi-container");
          if (pixiContainer) {
            pixiContainer.innerHTML = "";
          }
          slog("DemoPage", "PIXI application cleaned up.");
        }
      } catch (cleanupError) {
        serror("DemoPage", `Error during PIXI cleanup: ${cleanupError.message}`);
      }
    };
  }, []);

  return (
    <>
      <Background />
      <PixiContainer id="pixi-container" />
      <ButtonBar
        css={css`
          flex-direction: column;
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: row;
            gap: 10px;
            margin-bottom: 10px;
          `}
        >
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {["chatMessageEvent", "infoEvent", "actionEvent", "errorEvent"].map(
              (typeItem) => (
                <option key={typeItem} value={typeItem}>
                  {typeItem}
                </option>
              )
            )}
          </select>
          <select
            value={selectedCreationAnimation}
            onChange={(e) => setSelectedCreationAnimation(e.target.value)}
          >
            {Object.keys(InstalledAnimations).map((animKey) => (
              <option key={animKey} value={animKey}>
                {animKey}
              </option>
            ))}
          </select>
        </div>
        <StyledButton onClick={addRandomEvent}>Add Event</StyledButton>
      </ButtonBar>
      <PageContainer>
        <EventPane>{/*events.map(renderEvent)*/}</EventPane>
      </PageContainer>
    </>
  );
}
