// src/services/EventManager.js
import { useSyncExternalStore } from 'react';

class EventManager {
  constructor() {
    this.events = [];
    this.listeners = new Set();
  }

  /**
   * Add a new event and notify subscribers.
   * @param {object} event - The event object.
   */
  addEvent(event) {
  this.events = [event, ...this.events];
    this.emitChange();
  }

  /**
   * Get the current events snapshot.
   * @returns {Array} The list of events.
   */
  getSnapshot() {
    return this.events;
  }

  /**
   * Subscribe to changes.
   * @param {function} callback - Called when events change.
   * @returns {function} Unsubscribe function.
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all subscribers.
   */
  emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const eventManager = new EventManager();

/**
 * A hook to subscribe to events.
 * @returns {Array} The current events.
 */
export function useEvents() {
  return useSyncExternalStore(
    (callback) => eventManager.subscribe(callback),
    () => eventManager.getSnapshot(),
    () => eventManager.getSnapshot()
  );
}

/**
 * Convenience function to add a new event.
 * @param {object} event - The event object.
 */
export function addEvent(event) {
  eventManager.addEvent(event);
}

export default eventManager;
