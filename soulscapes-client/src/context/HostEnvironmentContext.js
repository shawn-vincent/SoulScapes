// src/context/HostEnvironmentContext.js
import React, { createContext, useState, useCallback } from "react";
import hostEnv from "../services/HostEnvironmentManager";
import { slog, serror, cslog } from "../../../shared/slogger";

/**
 * HostEnvironmentContext provides the following:
 *
 * - environment: The detected host environment.
 * - cameraStream: The MediaStream obtained from the camera (or null).
 * - cameraError: Any error encountered when requesting the camera.
 * - requestCameraStream: A function to request (or re-request) the camera stream.
 * - getCurrentPosition: A function that wraps hostEnv.getCurrentPosition.
 */
export const HostEnvironmentContext = createContext({
  environment: "unknown",
  cameraStream: null,
  cameraError: null,
  requestCameraStream: async () => {},
  getCurrentPosition: async () => {},
});

/**
 * HostEnvironmentProvider provides access to the HostEnvironmentManager's features.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The child components.
 *
 * @example
 *   <HostEnvironmentProvider>
 *     <App />
 *   </HostEnvironmentProvider>
 */
export const HostEnvironmentProvider = ({ children }) => {
  const [environment] = useState(hostEnv.environment);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  /**
   * requestCameraStream triggers the camera stream request.
   *
   * @param {MediaStreamConstraints} [constraints={ video: true, audio: false }]
   * @returns {Promise<MediaStream>} Resolves with the MediaStream.
   *
   * Checks that at least one video track is present.
   */
  const requestCameraStream = useCallback(async (constraints = { video: true, audio: false }) => {
    if (!hostEnv.hasCameraAccess()) {
      const errMsg = "Camera access is not supported in this environment.";
      serror("HostEnvironmentProvider:", errMsg);
      setCameraError(errMsg);
      throw new Error(errMsg);
    }
    try {
      slog("HostEnvironmentProvider: Requesting camera stream with constraints:", constraints);
      const stream = await hostEnv.getCameraStream(constraints);

      // Check if we have at least one video track
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks.length) {
        const noTracksErr = "No video tracks found in the returned stream.";
        serror("HostEnvironmentProvider:", noTracksErr);
        setCameraError(noTracksErr);
        throw new Error(noTracksErr);
      }

      // If we do, store it
      cslog("avatar", "Camera stream acquired. # of video tracks:", videoTracks.length);
      setCameraStream(stream);
      setCameraError(null);
      return stream;
    } catch (error) {
      serror("HostEnvironmentProvider: requestCameraStream failed", error);
      setCameraError(error.message || "Unknown error");
      throw error;
    }
  }, []);

  /**
   * getCurrentPosition wraps hostEnv.getCurrentPosition.
   *
   * @param {PositionOptions} [options={}]
   * @returns {Promise<GeolocationPosition>}
   */
  const getCurrentPosition = useCallback(async (options = {}) => {
    try {
      return await hostEnv.getCurrentPosition(options);
    } catch (error) {
      serror("HostEnvironmentProvider: getCurrentPosition failed", error);
      throw error;
    }
  }, []);

  const contextValue = {
    environment,
    cameraStream,
    cameraError,
    requestCameraStream,
    getCurrentPosition,
  };

  return (
    <HostEnvironmentContext.Provider value={contextValue}>
      {children}
    </HostEnvironmentContext.Provider>
  );
};
