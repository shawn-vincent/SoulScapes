(function (global, factory) {
    // UMD wrapper for Node.js / browser.
    if (typeof module !== "undefined" && module.exports) {
        const slogger = factory();
        global.sdebug = slogger.sdebug;
        global.slog = slogger.slog;
        global.swarn = slogger.swarn;
        global.serror = slogger.serror;
        global.csdebug = slogger.csdebug;
        global.cslog = slogger.cslog;
        global.cswarn = slogger.cswarn;
        global.cerror = slogger.cerror;
        global.slogConfig = slogger.slogConfig;
        global.slogConfigAdd = slogger.slogConfigAdd;
        global.slogExpressEndpoint = slogger.slogExpressEndpoint;
        module.exports = slogger;
    } else {
        const slogger = factory();
        global.slogger = slogger;
        global.sdebug = slogger.sdebug;
        global.slog = slogger.slog;
        global.swarn = slogger.swarn;
        global.serror = slogger.serror;
        global.csdebug = slogger.csdebug;
        global.cslog = slogger.cslog;
        global.cswarn = slogger.cswarn;
        global.cerror = slogger.cerror;
        global.slogConfig = slogger.slogConfig;
        global.slogConfigAdd = slogger.slogConfigAdd;
        global.slogExpressEndpoint = slogger.slogExpressEndpoint;
    }
})(typeof global !== "undefined" ? global : this, function () {
    "use strict";
    
    // -------------------------------------------------------------------------
    // Level definitions (lower number = more verbose)
    // -------------------------------------------------------------------------
    const LEVELS = {
        debug: 0,
        log:   1,
        warn:  2,
        error: 3,
        none:  Infinity
    };

    // -------------------------------------------------------------------------
    // Environment detection
    // -------------------------------------------------------------------------
    const isNode = (typeof process !== "undefined" &&
                    process.stdout &&
                    process.stderr);
    const isBrowser = !isNode;
    let fs, http, https, url, pathModule;
    if (isNode) {
        fs         = require("fs");
        http       = require("http");
        https      = require("https");
        url        = require("url");
        pathModule = require("path");
    }
    
    // -------------------------------------------------------------------------
    // Helpers (timestamp formatting, stringification, default emoji, etc.)
    // -------------------------------------------------------------------------
    const formatTimestamp = date => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const fullYear = date.getFullYear();
        // If year is between 2000–2099, display "'25" style
        const yearStr = (fullYear >= 2000 && fullYear <= 2099)
              ? ("'" + String(fullYear).slice(-2))
              : String(fullYear);
        const pad = (n, digits = 2) => String(n).padStart(digits, "0");
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const ms = pad(date.getMilliseconds(), 3);
        const tz = getTimezoneAbbr(date);
        return `${month} ${day} ${yearStr} ${hours}:${minutes}:${seconds}.${ms} ${tz}`;
    };

    const getTimezoneAbbr = date => {
        const match = date.toTimeString().match(/\(([^)]+)\)$/);
        return match && match[1]
            ? match[1].split(" ").map(w => w[0]).join("")
            : "";
    };

    const stringify = arg => {
        if (arg instanceof Error) {
            try {
                return JSON.stringify({ message: arg.message, stack: arg.stack });
            } catch (e) {
                return arg.toString();
            }
        } else if (typeof arg === "object") {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    };

    const getDefaultEmoji = level => {
        switch (level) {
        case "debug": return "🐛 ";
        case "log":   return "ℹ️ ";
        case "warn":  return "⚠️ ";
        case "error": return "❌ ";
        default:      return "";
        }
    };

    // If a message has no leading "debug:", "warn:", "error:", or "log:",
    // we prepend an emoji and level label (for debug/warn/error).
    // If the level is "log", we only prepend the default log emoji if no custom emoji is present.
    const formatMessage = (level, msg) => {
        if (level === "log") {
            const emojiMatch = msg.match(/^(\p{Extended_Pictographic}+)\s*(.*)$/u);
            if (emojiMatch) {
                return `${emojiMatch[1]} ${emojiMatch[2].trim()}`;
            }
            const prefixMatch = msg.match(/^\s*log:\s*(.*)$/i);
            if (prefixMatch) {
                return `${getDefaultEmoji("log")}${prefixMatch[1].trim()}`;
            }
            return `${getDefaultEmoji("log")}${msg}`;
        } else {
            const fixedcaseLevel = (level === "debug") ? "debug" : level.toUpperCase();
            const emojiMatch = msg.match(/^(\p{Extended_Pictographic}+)\s*(.*)$/u);
            if (emojiMatch) {
                return `${emojiMatch[1]} ${fixedcaseLevel}: ${emojiMatch[2].trim()}`;
            }
            const prefixRegex = new RegExp(`^\\s*${level}:\\s*(.*)$`, "i");
            const prefixMatch = msg.match(prefixRegex);
            if (prefixMatch) {
                return `${getDefaultEmoji(level)}${fixedcaseLevel}: ${prefixMatch[1].trim()}`;
            }
            return `${getDefaultEmoji(level)}${fixedcaseLevel}: ${msg}`;
        }
    };

    // -------------------------------------------------------------------------
    // SlogTarget Class
    // -------------------------------------------------------------------------
    // Each SlogTarget represents one logging “destination” along with a selector.
    function SlogTarget(selector, config) {
        // Save the selector (e.g. "", "component", "a.b", "_remote[clientID]"…)
        this.selector = selector || "";
        
        if (typeof config === "string") {
            // Shorthand: interpret the string as a level for console logging
            this.type = "console";
            this.level = LEVELS[config.toLowerCase()] !== undefined ? LEVELS[config.toLowerCase()] : LEVELS.debug;
            this.options = {};
        } else if (typeof config === "object" && config !== null) {
            // Check for a known type
            if (typeof config.type === "string") {
                const t = config.type.toLowerCase();
                if (t !== "console" && t !== "file" && t !== "remote") {
                    throw new Error("Unknown slog target type: " + config.type);
                }
                this.type = t;
            } else {
                // Otherwise assume a custom logger
                // Must implement logMessage()
                if (!config.type || typeof config.type.logMessage !== "function") {
                    throw new Error("Custom slog target must implement a logMessage() method.");
                }
                this.type = "custom";
                this.customLogger = config.type;
            }
            // Level threshold, default to debug
            this.level = config.level
                ? (LEVELS[config.level.toLowerCase()] !== undefined ? LEVELS[config.level.toLowerCase()] : LEVELS.debug)
                : LEVELS.debug;
            // Copy any additional options
            this.options = Object.assign({}, config);

            // For file logging
            if (this.type === "file" && isNode) {
                this.path = config.path || "./slogger.log";
                this.rotateMaxSize = (config.rotateMaxSize !== undefined) ? config.rotateMaxSize : -1;
                this.rotateMaxFiles = config.rotateMaxFiles || 5;
                this.rollingPattern = config.rollingPattern || null;
                this.currentFileSize = 0;
                try {
                    this.currentFileSize = fs.existsSync(this.path) ? fs.statSync(this.path).size : 0;
                } catch (err) {
                    console.error("Error initializing log file:", err);
                }
            }
            // For remote logging
            if (this.type === "remote") {
                this.endpoint = config.endpoint;
                this.bufferSize = config.bufferSize || 0;
                this.uniqueClientId = config.uniqueClientId;
                this.socketBuffer = [];
                this.skipSocketLogging = false;
            }
        } else {
            // Fallback to default console logging with debug threshold
            this.type = "console";
            this.level = LEVELS.debug;
            this.options = {};
        }
    }
    
    // Only match if level >= threshold AND the component matches (unless "" or "*")
    SlogTarget.prototype.matchSelector = function(messageLevel, component) {
	// 1. Check the log level threshold
	if (LEVELS[messageLevel] < this.level) return false;

	// 2. If the selector is empty or "*" => matches all
	if (!this.selector || this.selector === "*") {
            return true;
	}

	// 3. Special “magic” logic: if the target’s selector is "_remote",
	//    then match ANY component that starts with "_remote"
	if (this.selector === "_remote") {
            return component && component.startsWith("_remote");
	}

	// 4. Otherwise, do a strict match
	return component === this.selector;
    };

    SlogTarget.prototype.logMessage = function(details) {
        // details: { level, msg, extraArgs, component, opts, timestamp, line }
        const level = details.level;
        const line  = details.line;
        
        if (this.type === "console") {
            try {
                if (isNode) {
                    (level === "error" ? process.stderr : process.stdout).write(line + "\n");
                } else {
                    if (level === "debug") console.debug(line);
                    else if (level === "log") console.log(line);
                    else if (level === "warn") console.warn(line);
                    else if (level === "error") console.error(line);
                }
            } catch (err) {
                if (isNode) {
                    process.stderr.write("Console logging failed: " + err.message + "\n");
                } else {
                    alert("Critical logging failure: " + err.message);
                }
            }
        }
        else if (this.type === "file") {
            if (!isNode) {
                console.error("File logging is enabled but not supported in this environment.");
                return;
            }
            try {
                const dir = pathModule.dirname(this.path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                const messageSize = Buffer.byteLength(line + "\n", "utf8");
                if (this.rotateMaxSize > 0 && (this.currentFileSize + messageSize > this.rotateMaxSize)) {
                    // Rotate
                    const now = new Date();
                    let rolledFileName = "";
                    if (this.rollingPattern && typeof this.rollingPattern === "string") {
                        rolledFileName = this.rollingPattern
                            .replace(/yyyy/g, now.getFullYear())
                            .replace(/mm/g, String(now.getMonth() + 1).padStart(2, '0'))
                            .replace(/dd/g, String(now.getDate()).padStart(2, '0'))
                            .replace(/hh/g, String(now.getHours()).padStart(2, '0'))
                            .replace(/MM/g, String(now.getMinutes()).padStart(2, '0'))
                            .replace(/ss/g, String(now.getSeconds()).padStart(2, '0'))
                            .replace(/SSS/g, String(now.getMilliseconds()).padStart(3, '0'))
                            .replace(/TZ/g, getTimezoneAbbr(now));
                    } else {
                        let base = this.path.toLowerCase().endsWith(".log")
                            ? this.path.slice(0, -4)
                            : this.path;
                        rolledFileName = `${base}-[${now.getTime()}].log`;
                    }
                    try {
                        if (fs.existsSync(this.path)) fs.renameSync(this.path, rolledFileName);
                        this.currentFileSize = 0;
                        // Optionally delete older rolled files
                        const dirFiles = fs.readdirSync(dir);
                        const baseName = pathModule.basename(this.path, ".log");
                        const pattern = new RegExp(
                            "^" + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "-\\[.*\\]\\.log$"
                        );
                        const rolledFiles = dirFiles.filter(f => pattern.test(f));
                        if (rolledFiles.length > this.rotateMaxFiles) {
                            rolledFiles.sort();
                            const toDelete = rolledFiles.slice(0, rolledFiles.length - this.rotateMaxFiles);
                            toDelete.forEach(file => {
                                try {
                                    fs.unlinkSync(pathModule.join(dir, file));
                                } catch (e) {
                                    console.error("Error deleting old rolled file", file, e);
                                }
                            });
                        }
                    } catch (err) {
                        console.error("File rotation error:", err);
                    }
                }
                fs.appendFileSync(this.path, line + "\n");
                this.currentFileSize += messageSize;
            } catch (err) {
                console.error("File logging error:", err);
            }
        }
        else if (this.type === "remote") {
            // Instead of sending { message: line }, send { line } so server can parse.
            const payload = JSON.stringify({ line });
            if (this.bufferSize && this.bufferSize > 0) {
                this.socketBuffer.push(line);
                if (this.socketBuffer.length >= this.bufferSize) {
                    this.flushSocketBuffer();
                }
            } else {
                try {
                    if (isNode) {
                        const parsedUrl = url.parse(this.endpoint);
                        const options = {
                            hostname: parsedUrl.hostname,
                            port: parsedUrl.port,
                            path: parsedUrl.path,
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Content-Length": Buffer.byteLength(payload)
                            }
                        };
                        const reqModule = (parsedUrl.protocol === "https:") ? https : http;
                        const req = reqModule.request(options, res => res.on("data", () => {}));
                        req.on("error", err => {
                            if (!this.skipSocketLogging) {
                                this.skipSocketLogging = true;
                                console.error("Socket logging error:", err.message);
                                this.skipSocketLogging = false;
                            }
                        });
                        req.write(payload);
                        req.end();
                    } else if (typeof fetch === "function") {
                        fetch(this.endpoint, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: payload
                        }).catch(err => {
                            if (!this.skipSocketLogging) {
                                this.skipSocketLogging = true;
                                console.error("Socket logging error:", err.message);
                                this.skipSocketLogging = false;
                            }
                        });
                    } else {
                        // XHR fallback
                        const xhr = new XMLHttpRequest();
                        xhr.open("POST", this.endpoint, true);
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.send(payload);
                    }
                } catch (err) {
                    if (!this.skipSocketLogging) {
                        this.skipSocketLogging = true;
                        console.error("Socket logging error:", err.message);
                        this.skipSocketLogging = false;
                    }
                }
            }
        }
        else if (this.type === "custom") {
            if (this.customLogger && typeof this.customLogger.logMessage === "function") {
                this.customLogger.logMessage(details);
            } else {
                console.error("Custom logger does not implement a logMessage() method.");
            }
        }
    };

    SlogTarget.prototype.flushSocketBuffer = function() {
        if (!this.socketBuffer.length) return;
        // In flush, we can send multiple lines, e.g. { lines: [...] }
        const payload = JSON.stringify({ lines: this.socketBuffer });
        try {
            if (isNode) {
                const parsedUrl = url.parse(this.endpoint);
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port,
                    path: parsedUrl.path,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(payload)
                    }
                };
                const reqModule = parsedUrl.protocol === "https:" ? https : http;
                const req = reqModule.request(options, res => res.on("data", () => {}));
                req.on("error", err => {
                    if (!this.skipSocketLogging) {
                        this.skipSocketLogging = true;
                        console.error("Socket logging error (flush):", err.message);
                        this.skipSocketLogging = false;
                    }
                });
                req.write(payload);
                req.end();
            } else if (typeof fetch === "function") {
                fetch(this.endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload
                }).catch(err => {
                    if (!this.skipSocketLogging) {
                        this.skipSocketLogging = true;
                        console.error("Socket logging error (flush):", err.message);
                        this.skipSocketLogging = false;
                    }
                });
            } else {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", this.endpoint, true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(payload);
            }
        } catch (err) {
            if (!this.skipSocketLogging) {
                this.skipSocketLogging = true;
                console.error("Socket logging error (flush):", err.message);
                this.skipSocketLogging = false;
            }
        }
        this.socketBuffer = [];
    };

    // -------------------------------------------------------------------------
    // Global List of SlogTargets and Dispatcher
    // -------------------------------------------------------------------------
    let slogTargets = [];


    function dispatchLog(level, msg, extraArgs, component, opts) {
	// If clientTimestamp is provided, use that bracket
	const ts = opts && opts.clientTimestamp
	      ? opts.clientTimestamp
	      : formatTimestamp(new Date());

	let line = `[${ts}] `;
	if (component) {
	    line += `.${component} `;
	}
	line += msg;

	if (extraArgs && extraArgs.length > 0) {
	    line += " " + extraArgs.map(stringify).join(" ");
	}
	if (opts && opts.prependNewlines) {
	    line = "\n".repeat(opts.prependNewlines) + line;
	}

	const details = { level, msg, extraArgs, component, opts, timestamp: ts, line };

	// 1. Find all targets that match the log level and (component).
	let matchingTargets = [];
	for (let i = 0; i < slogTargets.length; i++) {
	    const target = slogTargets[i];
	    if (target.matchSelector(level, component)) {
		matchingTargets.push(target);
	    }
	}

	// 2. If a component is provided and at least one target is “component‐specific,”
	//    we remove any default targets from the final list.  
	//    We'll treat “component‐specific” as:
	//      • a target whose selector === component, OR
	//      • a target whose selector === "_remote" if component starts with "_remote"
	if (component) {
	    const hasSpecific = slogTargets.some(t =>
		t.selector === component ||
		    (t.selector === "_remote" && component.startsWith("_remote"))
	    );
	    if (hasSpecific) {
		matchingTargets = matchingTargets.filter(t =>
		    t.selector === component ||
			(t.selector === "_remote" && component.startsWith("_remote"))
		);
	    }
	}

	// 3. Dispatch the log to the final set of matching targets
	matchingTargets.forEach(target => target.logMessage(details));
    }
    
    // -------------------------------------------------------------------------
    // Helpers for processing log() arguments
    // -------------------------------------------------------------------------
    function processLogArgs(args) {
        let substitutionMap = null, msg, remaining;
        if (
            args.length >= 2 &&
		typeof args[0] === "object" && args[0] !== null &&
		!Array.isArray(args[0]) &&
		!(args[0] instanceof Error) &&
		typeof args[1] === "string"
        ) {
            substitutionMap = args[0];
            msg = args[1];
            remaining = args.slice(2);
        } else {
            msg = args[0];
            remaining = args.slice(1);
        }
        return { msg, remaining };
    }

    function processComponentLogArgs(component, args) {
        let substitutionMap = null, msg, remaining;
        if (
            args.length >= 2 &&
		typeof args[0] === "object" && args[0] !== null &&
		!Array.isArray(args[0]) &&
		!(args[0] instanceof Error) &&
		typeof args[1] === "string"
        ) {
            substitutionMap = args[0];
            msg = args[1];
            remaining = args.slice(2);
        } else {
            msg = args[0];
            remaining = args.slice(1);
        }
        return { msg, remaining, component };
    }
    
    // -------------------------------------------------------------------------
    // Public API (Non-Component)
    // -------------------------------------------------------------------------
    function sdebug(...args) {
        const { msg, remaining } = processLogArgs(args);
        const finalMsg = (typeof msg === "string") ? formatMessage("debug", msg) : msg;
        dispatchLog("debug", finalMsg, remaining, "", {});
    }
    function slog(...args) {
        const { msg, remaining } = processLogArgs(args);
        const finalMsg = (typeof msg === "string") ? formatMessage("log", msg) : msg;
        dispatchLog("log", finalMsg, remaining, "", {});
    }
    function swarn(...args) {
        const { msg, remaining } = processLogArgs(args);
        const finalMsg = (typeof msg === "string") ? formatMessage("warn", msg) : msg;
        dispatchLog("warn", finalMsg, remaining, "", {});
    }
    function serror(...args) {
        const { msg, remaining } = processLogArgs(args);
        const finalMsg = (typeof msg === "string") ? formatMessage("error", msg) : msg;
        dispatchLog("error", finalMsg, remaining, "", {});
    }
    
    // -------------------------------------------------------------------------
    // Public API (Component-Specific)
    // -------------------------------------------------------------------------
    function csdebug(component, ...args) {
        const { msg, remaining } = processComponentLogArgs(component, args);
        const finalMsg = (typeof msg === "string") ? formatMessage("debug", msg) : msg;
        dispatchLog("debug", finalMsg, remaining, component, {});
    }
    function cslog(component, ...args) {
        const { msg, remaining } = processComponentLogArgs(component, args);
        const finalMsg = (typeof msg === "string") ? formatMessage("log", msg) : msg;
        dispatchLog("log", finalMsg, remaining, component, {});
    }
    function cswarn(component, ...args) {
        const { msg, remaining } = processComponentLogArgs(component, args);
        const finalMsg = (typeof msg === "string") ? formatMessage("warn", msg) : msg;
        dispatchLog("warn", finalMsg, remaining, component, {});
    }
    function cerror(component, ...args) {
        const { msg, remaining } = processComponentLogArgs(component, args);
        const finalMsg = (typeof msg === "string") ? formatMessage("error", msg) : msg;
        dispatchLog("error", finalMsg, remaining, component, {});
    }

    // -------------------------------------------------------------------------
    // slogConfig / slogConfigAdd
    // -------------------------------------------------------------------------
    function slogConfig(options) {
        // Clear existing
        slogTargets = [];
        slogConfigAdd(options);
    }

    function slogConfigAdd(options) {
        for (let key in options) {
            if (options.hasOwnProperty(key)) {
                if (key.indexOf("slog") === 0) {
                    let selector;
                    if (key === "slog") {
                        selector = ""; // default
                    } else if (key.startsWith("slog.")) {
                        selector = key.slice("slog.".length);
                    } else {
                        selector = key;
                    }
                    let targetConfigs = options[key];
                    if (!Array.isArray(targetConfigs)) {
                        targetConfigs = [targetConfigs];
                    }
                    targetConfigs.forEach(cfg => {
                        const resolved = (typeof cfg === "string")
                              ? { type: "console", level: cfg }
                              : cfg;
                        const t = new SlogTarget(selector, resolved);
                        slogTargets.push(t);
                    });
                }
            }
        }
        if (slogTargets.length === 0) {
            throw new Error("slogConfig() did not configure any slog targets. Provide at least one target!");
        }
        csdebug("slogger", `Slogger configuration updated with ${slogTargets.length} targets.`);
    }

    // -------------------------------------------------------------------------
    // slogExpressEndpoint (Server Only)
    // -------------------------------------------------------------------------
    function slogExpressEndpoint(app, endpoint, uniqueClientId) {
        cslog("slogger", `Creating Slogger express endpoint at ${endpoint}`);
        if (!app || typeof app.post !== "function") {
            throw new Error("Invalid Express app instance provided.");
        }

        app.post(endpoint, (req, res) => {
            const body = req.body;
            if (!body || !body.line) {
                return res.status(400).send("Invalid log payload: expecting a 'line' field.");
            }
            // 1. Parse the entire line
            const parsed = slogParseLine(body.line); 
            // 2. Find client ID
            let clientId = "unknown";
            try {
                clientId = uniqueClientId(req);
            } catch (err) {
		throw err; /// WRAP ??? XXX
	    }
            // 3. Build final component
            let finalComponent = `_remote[CLIENT ${clientId}]`;
            if (parsed.component) {
                finalComponent += "." + parsed.component;
            }
            // 4. Store client timestamp
            const opts = { clientTimestamp: parsed.timestamp };
            // 5. Dispatch
            switch (parsed.level) {
            case "debug":  csdebug(finalComponent, opts, parsed.message); break;
            case "warn":   cswarn(finalComponent, opts, parsed.message);  break;
            case "error":  cerror(finalComponent, opts, parsed.message);  break;
            default:       cslog(finalComponent, opts, parsed.message);   break;
            }
            res.status(200).send("Logged");
        });
    }

    // -------------------------------------------------------------------------
    // slogParseLine
    // -------------------------------------------------------------------------
    // Extract bracketed timestamp, optional .component, optional level prefix,
    // and remainder as the message
    function slogParseLine(line) {
        const result = {
            timestamp: null,
            component: null,
            level: null,
            message: null
        };
        // 1. bracketed timestamp
        let match = line.match(/^\[([^\]]+)\]\s*/);
        if (match) {
            result.timestamp = match[1].trim();
            line = line.slice(match[0].length);
        }
        // 2. leading dot-component
        match = line.match(/^(\.[^\s]+)\s*/);
        if (match) {
            result.component = match[1].slice(1);
            line = line.slice(match[0].length);
        }
        // 3. recognized level prefix
        match = line.match(/^\s*(debug|warn|error|log)\s*:\s*(.*)$/i);
        if (match) {
            result.level = match[1].toLowerCase();
            result.message = match[2].trim();
        } else {
            // default to "log"
            result.level = "log";
            result.message = line.trim();
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // Return 
    // -------------------------------------------------------------------------
    return {
        sdebug,
        slog,
        swarn,
        serror,
        csdebug,
        cslog,
        cswarn,
        cerror,
        slogConfig,
        slogConfigAdd,
        slogExpressEndpoint
    };
});
