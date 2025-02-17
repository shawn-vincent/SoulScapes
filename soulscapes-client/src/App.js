// src/App.js
import React, { useState, useEffect } from "react";
import Spot from "./pages/Spot";
import DemoPage from "./pages/DemoPage";
import TestComponent from "./TestComponent";
import ErrorOverlay from "./components/ErrorOverlay";
import { HostEnvironmentProvider } from "./context/HostEnvironmentContext";


function App() {
    const [globalError, setGlobalError] = useState(null);

    useEffect(() => {
	// Catch synchronous errors (window.onerror)
	const handleError = (message, source, lineno, colno, error) => {
	    // Update state with the error (if available) or create a new one
	    setGlobalError(error || new Error(message));
	    // Return true to prevent the default browser error handler.
	    return true;
	};

	// Catch unhandled promise rejections
	const handleRejection = (event) => {
	    setGlobalError(event.reason);
	    event.preventDefault();
	};

	window.addEventListener("error", handleError);
	window.addEventListener("unhandledrejection", handleRejection);

	return () => {
	    window.removeEventListener("error", handleError);
	    window.removeEventListener("unhandledrejection", handleRejection);
	};
    }, []);

    return (
	<>
	    <HostEnvironmentProvider>
		{globalError && (
		    <ErrorOverlay
			error={globalError}
			onClose={() => setGlobalError(null)}
		    />
		)}
		<Spot/>
		{/*<DemoPage />*/}
            </HostEnvironmentProvider>

	</>
    );
}

export default App;
