import React from "react";
import ErrorOverlay from "./ErrorOverlay"; // The overlay component we created earlier

class ErrorBoundary extends React.Component {
    constructor(props) {
	super(props);
	this.state = { error: null };
    }
    
    static getDerivedStateFromError(error) {
	// Update state so the next render shows the fallback UI.
	return { error };
    }
    
    componentDidCatch(error, info) {
	// Optionally log the error info
	console.error("ErrorBoundary caught an error:", error, info);
    }
    
    render() {
	if (this.state.error) {
	    // Render your overlay component with the error details.
	    return <ErrorOverlay error={this.state.error} onClose={() => this.setState({ error: null })} />;
	}
	return this.props.children;
    }
}

export default ErrorBoundary;
