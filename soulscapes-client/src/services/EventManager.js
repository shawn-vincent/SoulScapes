// src/services/EventManager.js

class EventManager {
  constructor() {
    this.events = [];
    this.listeners = [];
  }

  /**
   * Add a new event.
   * @param {object} event - The event object.
   */
  addEvent(event) {
    this.events.unshift(event); // Newest event at the front.
    this.notify();
  }

  /**
   * Get all events.
   * @returns {Array} The list of events.
   */
  getEvents() {
    return this.events;
  }

  /**
   * Subscribe to event changes.
   * @param {function} listener - A callback receiving the events array.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    // Immediately notify with current events.
    listener(this.events);
  }

  /**
   * Unsubscribe a listener.
   * @param {function} listener - The listener to remove.
   */
  unsubscribe(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Notify all subscribers about the current events.
   */
  notify() {
    this.listeners.forEach((listener) => listener(this.events));
  }
}

const eventManager = new EventManager();
export default eventManager;
