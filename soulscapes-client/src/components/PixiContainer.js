import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';

const PixiContainer = ({ width, height, children }) => {
    const containerRef = useRef(null);
    const pixiApp = useRef(null); // Store PIXI app instance


    useEffect(() => {
        // Initialize PIXI only once, when the component mounts
        if (containerRef.current && !pixiApp.current) {
            pixiApp.current = new PIXI.Application({
                width,
                height,
                backgroundColor: 0x1099bb,
                resolution: window.devicePixelRatio || 1, // Handle Retina displays
                autoDensity: true
            });

            containerRef.current.appendChild(pixiApp.current.view); // Mount canvas

            // Call children if there is children to handle
            if(children && typeof children === 'function'){
              children(pixiApp.current);
            }


            return () => {
                // Clean up on unmount: destroy PIXI app
                if (pixiApp.current) {
                    pixiApp.current.destroy(true, { children: true, texture: true, baseTexture: true });
                    pixiApp.current = null;

                }
            };
        }
    }, [width, height, children]);

    return <div ref={containerRef} />;
};

export default PixiContainer;
