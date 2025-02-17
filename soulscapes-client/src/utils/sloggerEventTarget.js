// src/utils/sloggerEventTarget.js
import { addEvent } from "../services/EventManager";
import { slog } from "../../../shared/slogger.js"

/**
 * A custom slogger target that converts log messages into events.
 * It is intended for error-level logs, but can be extended as needed.
 */
class EventTarget {
    constructor(selector, config) {
	this.selector = selector || "";
	// Accept a minimum log level, default to error
	this.level = (config && config.level) || "error";
    }

    logMessage(details) {
	slog("routing slog to Event");
	// Only handle error-level logs for now.
	if (details.level !== "error") return;

	const { line, timestamp, msg } = details;
	// Create an event object with a unique id and the error details.
	const event = {
	    id: Date.now(),
	    date: new Date(timestamp),
	    isNew: true,
	    type: "errorEvent",
	    text: msg, // you may format this further if needed
	    creationAnimation: "zipUp",
	};

	// Dispatch the event to the EventManager.
	addEvent(event);
    }
}

export default EventTarget;
