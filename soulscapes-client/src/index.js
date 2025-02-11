import { slog, serror, sdebug, swarn, slogConfig } from '../../shared/slogging.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Room from './pages/Room';
import ErrorBoundary from './components/ErrorBoundary';


slogConfig({
    // Set the main (file/socket) log level to "debug"
    logLevel: "debug",

    // For client logs coming in to the server’s logging endpoint,
    // set the threshold to debug so even debug messages are processed.
    clientLogLevel: "debug",

    // Enable socket logging and set the endpoint to the default server endpoint.
    socketLogging: {
	enabled: true,
	// Replace with the URL for your server’s express log endpoint.
	// For example, if your server runs on localhost:3000:
	endpoint: "/logs",
	// Optionally, set a buffer size; here 0 means logs are sent immediately.
	bufferSize: 0
    }
});


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
	<App/>
    </ErrorBoundary>
);
