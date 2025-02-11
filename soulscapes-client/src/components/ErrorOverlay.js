import React from "react";

// Inline styles for the overlay covering the full viewport.
const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(5px)",
    zIndex: 9999, // Make sure it overlays everything
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

// Inline styles for the error window.
const windowStyle = {
    backgroundColor: "#fff",
    color: "#000",
    padding: "20px",
    borderRadius: "8px",
    width: "80%",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
    position: "relative",
};

// Inline styles for the close ("×") button.
const closeButtonStyle = {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "transparent",
    border: "none",
    fontSize: "1.5rem",
    lineHeight: "1",
    cursor: "pointer",
    color: "#000",
};

function ErrorOverlay({ error, onClose }) {
    return (
	<div style={overlayStyle}>
	    <div style={windowStyle}>
		<button style={closeButtonStyle} onClick={onClose} aria-label="Close error overlay">
		    ×
		</button>
		<h2 style={{ marginTop: 0 }}>An error occurred</h2>
		<pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "monospace" }}>
		    {error && error.stack ? error.stack : String(error)}
		</pre>
	    </div>
	</div>
    );
}

export default ErrorOverlay;
