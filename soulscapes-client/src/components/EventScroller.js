import React, { useState, useEffect, useRef } from "react";
import "./EventScroller.module.css"; // Import CSS for styling

const EventScroller = ({ children, showDates = false }) => {
  const scrollerRef = useRef(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check scroll position and update scroll indicators
  const updateScrollIndicators = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollerRef.current;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight);
  };

  // Scroll to bottom on initial render and when new children are added
  useEffect(() => {
    const scroller = scrollerRef.current;
    scroller.scrollTop = scroller.scrollHeight;
    updateScrollIndicators();
  }, [children]);

  // Attach scroll event listener
  useEffect(() => {
    const scroller = scrollerRef.current;
    scroller.addEventListener("scroll", updateScrollIndicators);
    return () => scroller.removeEventListener("scroll", updateScrollIndicators);
  }, []);

  return (
    <div className="event-scroller-container">
      {/* Scroll up indicator */}
      {canScrollUp && <div className="scroll-indicator top">▲</div>}

      {/* Scrolling content */}
      <div ref={scrollerRef} className="event-scroller">
        {React.Children.map(children, (child, index) => {
          const date = child.props.date;
          return (
            <div key={index} className="event-item">
              {showDates && date && (
                <div className="date-marker">{formatDate(date)}</div>
              )}
              {child}
            </div>
          );
        })}
      </div>

      {/* Scroll down indicator */}
      {canScrollDown && <div className="scroll-indicator bottom">▼</div>}
    </div>
  );
};

// Helper function to format dates
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default EventScroller;
