/** @jsxImportSource @emotion/react */
import { css, keyframes } from "@emotion/react";
import * as PIXI from "pixi.js";

// -----------------------------------------------------------------------
// BaseAnimation & Subclasses
// -----------------------------------------------------------------------
export class BaseAnimation {
  constructor({ name, keyframes, duration, initialStyle }) {
    this.name = name;
    this.keyframes = keyframes;
    this.duration = duration; // in seconds
    this.initialStyle = initialStyle;
  }
  getCSS() {
    return css`
      animation: ${this.keyframes} ${this.duration}s ease-out forwards;
    `;
  }
  // By default, no side effect.
  runEffect(ref) {}
  // Return the effect duration in milliseconds based on the animation's own duration.
  getEffectDuration() {
    return this.duration * 1000;
  }
}

export class FadeAnimation extends BaseAnimation {
  constructor() {
    const fadeKeyframes = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    super({
      name: "fade",
      keyframes: fadeKeyframes,
      duration: 2.0,
      initialStyle: { opacity: 0, transform: "none" },
    });
  }
}

export class FloatAnimation extends BaseAnimation {
  constructor() {
    const floatKeyframes = keyframes`
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
    super({
      name: "float",
      keyframes: floatKeyframes,
      duration: 2.0,
      initialStyle: {
        opacity: 0,
        transform: "translateY(-100vh) translateX(10vw) rotate(10deg)",
      },
    });
  }
}

export class FlickerAnimation extends BaseAnimation {
  constructor() {
    const flickerKeyframes = keyframes`
      0% { opacity: 0; }
      10% { opacity: 1; }
      20% { opacity: 0; }
      30% { opacity: 1; }
      40% { opacity: 0; }
      50% { opacity: 1; }
      60% { opacity: 0.3; }
      70% { opacity: 0.8; }
      80% { opacity: 0.4; }
      90% { opacity: 0.9; }
      100% { opacity: 1; }
    `;
    super({
      name: "flicker",
      keyframes: flickerKeyframes,
      duration: 1.5,
      initialStyle: { opacity: 0.2, transform: "none" },
    });
  }
}


export class DropAnimation extends BaseAnimation {
    constructor() {
        const dropKeyframes = keyframes`
      0% {
        transform: translateY(-120vh) rotate(0deg);
        opacity: 0; /* Add for Fade In */
      }
      5% {          /* Add the "Anticipation" */
        transform: translateY(-125vh) rotate(0deg);
        opacity: 0.2;   /* Add for Fade In */
      }
      10%{        /* Add a short pause to build tension */
        transform: translateY(-125vh) rotate(0deg);
        opacity: 0.2;
      }
      80% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;       /* Fade in complete*/
        filter: blur(2px); /* motion blur */
      }
      100% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
        filter: blur(0px); /* stop motion blur */
      }
    `;
        super({
            name: "drop",
            keyframes: dropKeyframes,
            duration: 0.6, // Speed Up the Drop!
            initialStyle: { opacity: 0, transform: "translateY(-120vh)" },  // Add for Fade In
        });
    }
  getCSS() {
      return css`
          animation: ${this.keyframes} ${this.duration}s cubic-bezier(0.0, 0.0, 0.0, 1.0) forwards;  /* Emphasize the acceleration */
      `;
  }
}
export class DropAnimation_old extends BaseAnimation {
  constructor() {
    const dropKeyframes = keyframes`
      0% {
        transform: translateY(-120vh) rotate(0deg);
      }
      70% {
        transform: translateY(0) rotate(0deg);
      }
      80% {
        transform: translateY(-3vh) rotate(5deg);
      }
      100% {
        transform: translateY(0) rotate(0deg);
      }
    `;
    super({
      name: "drop",
      keyframes: dropKeyframes,
      duration: 0.8,
      initialStyle: { opacity: 1, transform: "translateY(-120vh)" },
    });
  }
}

export class ZipUpAnimation extends BaseAnimation {
  constructor() {
    const zipUpKeyframes = keyframes`
      0% {
        transform: translateY(100vh);
        opacity: 0;
      }
      80% {
        transform: translateY(-5vh);
        opacity: 1;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    `;
    super({
      name: "zipUp",
      keyframes: zipUpKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateY(100vh)" },
    });
  }
}

export class ZipDownAnimation extends BaseAnimation {
  constructor() {
    const zipDownKeyframes = keyframes`
      0% {
        transform: translateY(-100vh);
        opacity: 0;
      }
      80% {
        transform: translateY(5vh);
        opacity: 1;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    `;
    super({
      name: "zipDown",
      keyframes: zipDownKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateY(-100vh)" },
    });
  }
}

export class ZipRightAnimation extends BaseAnimation {
  constructor() {
    const zipRightKeyframes = keyframes`
      0% {
        transform: translateX(-100vw);
        opacity: 0;
      }
      80% {
        transform: translateX(5vw);
        opacity: 1;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    `;
    super({
      name: "zipRight",
      keyframes: zipRightKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateX(-100vw)" },
    });
  }
}

export class ZipLeftAnimation extends BaseAnimation {
  constructor() {
    const zipLeftKeyframes = keyframes`
      0% {
        transform: translateX(100vw);
        opacity: 0;
      }
      80% {
        transform: translateX(-5vw);
        opacity: 1;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    `;
    super({
      name: "zipLeft",
      keyframes: zipLeftKeyframes,
      duration: 0.4,
      initialStyle: { opacity: 0, transform: "translateX(100vw)" },
    });
  }
}

export class MaterializeAnimation extends BaseAnimation {
  constructor() {
    const fadeKeyframes = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    // Note: duration is defined in the animation itself.
    super({
      name: "materialize",
      keyframes: fadeKeyframes,
      duration: 0.66,
      initialStyle: { opacity: 0, transform: "none" },
    });
  }
  runEffect(ref) {
    const duration = this.duration * 1000;
    if (ref && window.pixiApp && window.dots) {
      const totalDots = 800;
      const maxDelay = duration * 0.3;
      const dotsData = [];
      const screenWidth = window.pixiApp.renderer.width;
      const screenHeight = window.pixiApp.renderer.height;
      const circleRadius = Math.max(screenWidth, screenHeight) * 0.9;
      const rect = ref.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      for (let i = 0; i < totalDots; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * circleRadius;
        const startX = screenWidth / 2 + r * Math.cos(angle);
        const startY = screenHeight / 2 + r * Math.sin(angle);
        const delay = Math.random() * maxDelay;
        const dotInnerRadius = 0.8;
        const innerR = dotInnerRadius + Math.random() * 0.3;
        const targetDomX = rect.left + Math.random() * rect.width + scrollX;
        const targetDomY = rect.top + Math.random() * rect.height + scrollY;
        const targetPoint = new PIXI.Point();
        window.pixiApp.renderer.plugins.interaction.mapPositionToPoint(
          targetPoint,
          targetDomX,
          targetDomY
        );
        const { x: endX, y: endY } = targetPoint;
        dotsData.push({ startX, startY, endX, endY, delay, innerR });
      }
      const dotPool = [];
      const cleanupDots = () => {
        if (window.dots) {
          window.dots.removeChildren();
        }
        dotPool.forEach((sprite) => {
          if (sprite && sprite.destroy) sprite.destroy();
        });
      };
      const startTime = performance.now();
      const animateDots = () => {
        const elapsed = performance.now() - startTime;
        for (let i = 0; i < totalDots; i++) {
          let dotSprite = dotPool[i];
          if (!dotSprite) {
            dotSprite = new PIXI.Sprite(window.circleTexture);
            dotSprite.anchor.set(0.5);
            dotPool[i] = dotSprite;
          }
          const dotData = dotsData[i];
          const localTime = elapsed - dotData.delay;
          if (localTime < 0) {
            if (dotSprite.parent) window.dots.removeChild(dotSprite);
            continue;
          }
          const progress = Math.min(1, localTime / (duration - dotData.delay));
          const alpha = progress;
          const currentX = dotData.startX + progress * (dotData.endX - dotData.startX);
          const currentY = dotData.startY + progress * (dotData.endY - dotData.startY);
          if (!dotSprite.parent) {
            window.dots.addChild(dotSprite);
          }
          const dotOuterRadiusMultiplier = 2;
          const outerRadius = dotData.innerR * dotOuterRadiusMultiplier;
          const baseRadius = window.baseRadius || 6;
          const scale = outerRadius / baseRadius;
          dotSprite.tint = 0xffffff;
          dotSprite.x = currentX;
          dotSprite.y = currentY;
          dotSprite.alpha = alpha;
          dotSprite.scale.set(scale);
        }
        if (elapsed < duration) {
          requestAnimationFrame(animateDots);
        } else {
          cleanupDots();
        }
      };
      animateDots();
    }
  }
}

// -----------------------------------------------------------------------
// Registry & Installation
// -----------------------------------------------------------------------
const InstalledAnimations = {};
function installAnimation(animationInstance) {
  InstalledAnimations[animationInstance.name] = animationInstance;
}

installAnimation(new FadeAnimation());
installAnimation(new FloatAnimation());
installAnimation(new FlickerAnimation());
installAnimation(new DropAnimation());
installAnimation(new ZipUpAnimation());
installAnimation(new ZipDownAnimation());
installAnimation(new ZipRightAnimation());
installAnimation(new ZipLeftAnimation());
installAnimation(new MaterializeAnimation());

export { InstalledAnimations };
