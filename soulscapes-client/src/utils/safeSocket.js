/**
 * safeSocket.js
 *
 * Provides safe wrappers for incoming and outgoing Socket.IO events on the client side.
 *
 * Outgoing events:
 *   - safeEmit(socket, eventName, ...args)
 *     Captures the client stack at the time of the call and waits for the server's
 *     acknowledgement. If the server returns an error (an object with { message, stack }),
 *     safeEmit merges the client and server stack traces into a new Error and rejects the Promise.
 *
 * Incoming events:
 *   - safeOn(socket, eventName, handler)
 *     Wraps the handler so that any error is caught and logged via slogging (using serror()).
 *
 * Usage Example:
 *   import { safeOn, safeEmit } from './safeSocket';
 *
 *   // For incoming events:
 *   safeOn(socket, "offer", (data) => { ... });
 *
 *   // For outgoing events:
 *   try {
 *     await safeEmit(socket, "offer", { target: peerId, offer });
 *   } catch (err) {
 *     // err.stack includes both client and server stack traces.
 *     serror("Error sending offer:", err);
 *   }
 */

import { slog, serror } from '../../../shared/slogging.js'; // Adjust the relative path as needed

/**
 * Wraps an error with additional context using the modern Error 'cause' property.
 *
 * @param {string} context - Context information to prepend.
 * @param {Error} error - The original error.
 * @returns {Error} The wrapped error.
 */
export function wrapError(context, error) {
    return new Error(`${context}: ${error.message}`, { cause: error });
}

/**
 * Wraps an incoming socket event handler so that errors are caught.
 *
 * @param {string} eventName - The event name (used for context).
 * @param {function} handler - The event handler function.
 * @returns {function} The wrapped event handler.
 */
export function safeSocketHandler(eventName, handler) {
    return function (...args) {
	Promise.resolve(handler.apply(this, args)).catch((err) => {
	    const wrapped = wrapError(`${eventName} handler error`, err);
	    serror(wrapped.message, wrapped);
	    // We do not re-emit the error to the server—errors remain handled on the client.
	});
    };
}

/**
 * Registers a safe incoming event handler on a socket.
 *
 * @param {object} socket - The Socket.IO socket instance.
 * @param {string} eventName - The event name.
 * @param {function} handler - The event handler function.
 */
export function safeOn(socket, eventName, handler) {
    socket.on(eventName, safeSocketHandler(eventName, handler));
}

/**
 * Safely emits an event using Socket.IO with acknowledgement.
 *
 * This function captures the client stack trace at the point of the call and then
 * uses the acknowledgement callback of socket.emit. If the server returns an error
 * (an object with { message, stack } under the "error" property), the function creates
 * a new Error that merges the client and server stack traces and rejects the Promise.
 *
 * @param {object} socket - The Socket.IO socket instance.
 * @param {string} eventName - The event name.
 * @param  {...any} args - The arguments to send.
 * @returns {Promise<any>} - Resolves with the server's acknowledgement if successful.
 */
export function safeEmit(socket, eventName, ...args) {
    // Capture the client stack trace at the time of the call.
    const clientStack = new Error(`Client call to ${eventName}`).stack;
    return new Promise((resolve, reject) => {
	// Append an acknowledgement callback as the final argument.
	socket.emit(eventName, ...args, (response) => {
	    if (response && response.error) {
		// Server returned an error object; assume it has 'message' and 'stack'.
		const serverError = response.error;
		const error = new Error(`${eventName} ack error: ${serverError.message}`, { cause: serverError });
		// Merge the captured client stack with the server's stack trace.
		error.stack = clientStack + "\n--- Server Stack ---\n" + serverError.stack;
		serror(error.message, error);
		reject(error);
	    } else {
		resolve(response);
	    }
	});
    });
}
