// src/services/HostEnvironmentManager.js
import { slog, serror, swarn } from "../../../shared/slogger";

/**
 * HostEnvironmentManager
 *
 * A production‐grade service that detects the host environment and provides a
 * consistent API for various device features. It logs actions via slog() and errors via serror().
 *
 * Supported features include:
 * - Environment detection (Cordova, Electron, React Native, mobile, browser)
 * - Camera access (getUserMedia)
 * - Accelerometer (DeviceMotion)
 * - Geolocation
 * - Vibration
 *
 * Additional features (Bluetooth, USB, Payment, etc.) can be added following this pattern.
 */
class HostEnvironmentManager {
    constructor() {
	this.environment = this.detectEnvironment();
	slog("HostEnvironmentManager: Detected environment:", this.environment);
    }

    /**
     * Detects the current host environment.
     *
     * @returns {string} One of "cordova", "electron", "react-native", "mobile", "browser", or "unknown".
     *
     * @example
     *   const env = hostEnv.detectEnvironment();
     *   console.log("Environment:", env);
     */
    detectEnvironment() {
	try {
	    if (window.cordova) {
		return "cordova";
	    }
	    if (typeof process !== "undefined" && process.versions && process.versions.electron) {
		return "electron";
	    }
	    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
		return "react-native";
	    }
	    const ua = navigator.userAgent || "";
	    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
		return "mobile";
	    }
	    return "browser";
	} catch (error) {
	    serror("HostEnvironmentManager: Failed to detect environment", error);
	    return "unknown";
	}
    }

    // -------------------------
    // CAMERA ACCESS METHODS
    // -------------------------

    /**
     * Determines if camera access is available.
     *
     * @returns {boolean} True if the browser supports getUserMedia.
     *
     * @example
     *   if (hostEnv.hasCameraAccess()) {
     *     // Proceed to request camera stream.
     *   }
     */
    hasCameraAccess() {
	return (
	    typeof navigator !== "undefined" &&
		navigator.mediaDevices &&
		typeof navigator.mediaDevices.getUserMedia === "function"
	);
    }

    /**
     * Requests access to the camera and returns a MediaStream.
     *
     * This method does NOT auto-activate on load. It must be called explicitly.
     *
     * @param {MediaStreamConstraints} [constraints={ video: true, audio: false }] - The media constraints.
     * @returns {Promise<MediaStream>} Resolves with the MediaStream if successful.
     * @throws {Error} If camera access is unsupported or the request fails.
     *
     * @example
     *   hostEnv.getCameraStream({ video: true, audio: false })
     *     .then(stream => {
     *       videoElement.srcObject = stream;
     *     })
     *     .catch(err => console.error("Camera error:", err));
     */
    async getCameraStream(constraints = { video: true, audio: false }) {
	if (!this.hasCameraAccess()) {
	    const errMsg = "Camera access is not supported in this environment.";
	    serror("HostEnvironmentManager:", errMsg);
	    throw new Error(errMsg);
	}
	try {
	    slog("HostEnvironmentManager: !!! Requesting camera stream with constraints:", constraints);
	    const stream = await navigator.mediaDevices.getUserMedia(constraints);
	    
	    slog("HostEnvironmentManager: Camera stream acquired successfully.");
	    return stream;
	} catch (error) {
	    serror("HostEnvironmentManager: Failed to get camera stream", error);
	    throw error;
	} finally {
	    slog("FINALLY media stream fetch!?");
	}
    }

    // -------------------------
    // ACCELEROMETER / DEVICE MOTION METHODS
    // -------------------------

    /**
     * Checks whether the device supports accelerometer data.
     *
     * @returns {boolean} True if DeviceMotionEvent is available.
     *
     * @example
     *   if (hostEnv.hasAccelerometer()) {
     *     // Enable motion-based features.
     *   }
     */
    hasAccelerometer() {
	return typeof DeviceMotionEvent !== "undefined";
    }

    /**
     * Registers a callback for accelerometer data.
     *
     * @param {Function} callback - Function to call on each devicemotion event.
     * @throws {Error} If accelerometer is not supported.
     *
     * @example
     *   const handleMotion = (event) => {
     *     console.log("Acceleration:", event.acceleration);
     *   };
     *   hostEnv.onAccelerometerData(handleMotion);
     */
    onAccelerometerData(callback) {
	if (!this.hasAccelerometer()) {
	    const errMsg = "Accelerometer (DeviceMotionEvent) is not supported.";
	    swarn("HostEnvironmentManager:", errMsg);
	    throw new Error(errMsg);
	}
	try {
	    window.addEventListener("devicemotion", callback);
	    slog("HostEnvironmentManager: Registered devicemotion listener.");
	} catch (error) {
	    serror("HostEnvironmentManager: Failed to register devicemotion listener", error);
	    throw error;
	}
    }

    /**
     * Removes a previously registered accelerometer listener.
     *
     * @param {Function} callback - The callback function to remove.
     *
     * @example
     *   hostEnv.removeAccelerometerListener(handleMotion);
     */
    removeAccelerometerListener(callback) {
	if (this.hasAccelerometer()) {
	    window.removeEventListener("devicemotion", callback);
	    slog("HostEnvironmentManager: Removed devicemotion listener.");
	}
    }

    // -------------------------
    // GEOLOCATION METHODS
    // -------------------------

    /**
     * Checks whether geolocation is supported.
     *
     * @returns {boolean} True if geolocation is available.
     *
     * @example
     *   if (hostEnv.hasGeolocation()) {
     *     // Use geolocation.
     *   }
     */
    hasGeolocation() {
	return "geolocation" in navigator;
    }

    /**
     * Retrieves the current position using the Geolocation API.
     *
     * @param {PositionOptions} [options={}] - Options for the geolocation API.
     * @returns {Promise<GeolocationPosition>} Resolves with the position.
     * @throws {Error} If geolocation is unsupported or the request fails.
     *
     * @example
     *   hostEnv.getCurrentPosition({ timeout: 5000 })
     *     .then(position => console.log("Position:", position.coords))
     *     .catch(err => console.error("Geolocation error:", err));
     */
    getCurrentPosition(options = {}) {
	if (!this.hasGeolocation()) {
	    const errMsg = "Geolocation is not supported in this environment.";
	    serror("HostEnvironmentManager:", errMsg);
	    return Promise.reject(new Error(errMsg));
	}
	return new Promise((resolve, reject) => {
	    navigator.geolocation.getCurrentPosition(
		(position) => {
		    slog("HostEnvironmentManager: Geolocation obtained:", position.coords);
		    resolve(position);
		},
		(error) => {
		    serror("HostEnvironmentManager: Geolocation error:", error);
		    reject(error);
		},
		options
	    );
	});
    }

    // -------------------------
    // VIBRATION METHODS
    // -------------------------

    /**
     * Checks if the Vibration API is available.
     *
     * @returns {boolean} True if vibration is supported.
     *
     * @example
     *   if (hostEnv.hasVibration()) {
     *     hostEnv.vibrate(200);
     *   }
     */
    hasVibration() {
	return "vibrate" in navigator;
    }

    /**
     * Triggers device vibration.
     *
     * @param {number | number[]} pattern - Vibration pattern (in milliseconds).
     * @returns {boolean} The result of the vibration call.
     *
     * @example
     *   hostEnv.vibrate(200); // Vibrate for 200ms.
     */
    vibrate(pattern) {
	if (!this.hasVibration()) {
	    swarn("HostEnvironmentManager: Vibration not supported.");
	    return false;
	}
	try {
	    return navigator.vibrate(pattern);
	} catch (error) {
	    serror("HostEnvironmentManager: Vibration error", error);
	    return false;
	}
    }
}

// Export a singleton instance.
const hostEnvironmentManager = new HostEnvironmentManager();
export default hostEnvironmentManager;
