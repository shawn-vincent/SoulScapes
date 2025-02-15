import * as PIXI from 'pixi.js'; // Make PIXI globally available IMMEDIATELY after importing.

import { slog, serror, sdebug, swarn, slogConfig } from '../../shared/slogger.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Room from './pages/Room';
import ErrorBoundary from './components/ErrorBoundary';

window.PIXI = PIXI;  //This must be after all imports


slogConfig({
    // Set the main (file/socket) log level to "debug"
    slog: ["debug", // write to console
	   // Enable socket logging and set the endpoint to the default server endpoint.
	   {
	       type: "remote",
	       endpoint: "/logs",
	       bufferSize: 0 // send immediately for now.
	   }],
});

slog("Set up Slogger");


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
	<App/>
    </ErrorBoundary>
);
