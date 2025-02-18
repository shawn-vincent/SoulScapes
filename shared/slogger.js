(function (global, factory) {
    if (typeof module !== "undefined" && module.exports) {
	module.exports = factory();
    } else {
	global.slogger = factory();
    }
})(typeof global !== "undefined" ? global : this, function () {
    "use strict";

    // -------------------------------------------------------------------------
    // Environment Detection & Module Imports
    // -------------------------------------------------------------------------
    const isNode = (typeof process !== "undefined" &&
                    process.stdout &&
                    process.stderr);
    let fs, pathModule, http, https, url;
    if (isNode) {
	fs = require("fs");
	pathModule = require("path");
	http = require("http");
	https = require("https");
	url = require("url");
    }

    // -------------------------------------------------------------------------
    // Log Level Definitions
    // -------------------------------------------------------------------------
    const LEVELS = {
	debug: 0,
	log:   1,
	warn:  2,
	error: 3,
	none:  Infinity
    };

    // -------------------------------------------------------------------------
    // Precompiled Regular Expressions
    // -------------------------------------------------------------------------
    let RE_EMOJI;
    try {
	RE_EMOJI = /\p{Extended_Pictographic}/u;
    } catch (e) {
	RE_EMOJI = /^[^\w\s]/;
    }
    const RE_LOG_PREFIX = /^(\s*(debug|warn|error|log):\s*)(.*)$/i;
    const RE_TIMESTAMP  = /^\[([^\]]+)\]\s*/;
    const RE_COMPONENT  = /^((?:\._remote\[[^\]]+\](?:\.[^\s.\[]+)*)|(?:\.[^\s.\[]+(?:\.[^\s.\[]+)*))\s*/;
    const RE_LEVEL      = /^\s*(debug|warn|error|log)\s*:\s*(.*)$/i;

    // -------------------------------------------------------------------------
    // Formatter with Aggressive Timestamp Caching
    // -------------------------------------------------------------------------
    const Formatter = {
	_months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
		  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	// Cache by second rather than full millisecond.
	_lastSecond: 0,
	_lastFormattedSecond: "",
	_lastTz: "",
	formatTimestamp(date) {

	    if (!(date instanceof Date) || isNaN(date.getTime())) {
		// Log a warning and fallback to current time.
		console.error("Invalid date provided to formatTimestamp; using current time.", date);
		date = new Date();
	    }
	    
	    const t = date.getTime();
	    const sec = Math.floor(t / 1000);
	    if (sec !== this._lastSecond) {
		this._lastSecond = sec;
		const d = new Date(sec * 1000);
		const month = this._months[d.getMonth()];
		const day = d.getDate();
		const year = d.getFullYear();
		const yearStr = (year >= 2000 && year <= 2099)
		      ? "'" + String(year).slice(-2)
		      : String(year);
		const pad = (n, digits = 2) => String(n).padStart(digits, "0");
		const hours = pad(d.getHours());
		const minutes = pad(d.getMinutes());
		const seconds = pad(d.getSeconds());
		const tzMatch = d.toTimeString().match(/\(([^)]+)\)$/);
		const tz = tzMatch ? tzMatch[1].split(" ").map(w => w[0]).join("") : "";
		this._lastFormattedSecond = `${month} ${day} ${yearStr} ${hours}:${minutes}:${seconds}`;
		this._lastTz = tz;
	    }
	    const ms = String(date.getMilliseconds()).padStart(3, "0");
	    return `${this._lastFormattedSecond}.${ms} ${this._lastTz}`;
	},

	// Inside Formatter.stringify in slogger.js:
	stringify(arg) {
	    // If arg is an instance of Error, produce a structured summary.
	    if (arg instanceof Error) {
		try {
		    return JSON.stringify({
			message: arg.message,
			stack: arg.stack && arg.stack.split('\n').slice(0, 5).join('\n') // first 5 lines of stack
		    });
		} catch (e) {
		    return arg.toString();
		}
	    }
	    // Check if we're in a Node environment and if util.inspect is available.
	    if (isNode && typeof require === "function") {
		try {
		    const util = require("util");
		    // Special handling for MediaStream objects.
		    if (typeof MediaStream !== "undefined" && arg instanceof MediaStream) {
			return `MediaStream (tracks: ${arg.getTracks().length})`;
		    }
		    // Use util.inspect with a reasonable depth.
		    return util.inspect(arg, { depth: 2, colors: false });
		} catch (e) {
		    // Fallback if util.inspect isn't available.
		    try {
			return JSON.stringify(arg);
		    } catch (jsonErr) {
			return String(arg);
		    }
		}
	    } else {
		// In browser, add a check for MediaStream.
		if (typeof MediaStream !== "undefined" && arg instanceof MediaStream) {
		    return `MediaStream (tracks: ${arg.getTracks().length})`;
		}
		// Try a simple JSON conversion.
		try {
		    return JSON.stringify(arg);
		} catch (e) {
		    return String(arg);
		}
	    }
	},
	getDefaultEmoji(level) {
	    switch (level) {
            case "debug": return "🐛 ";
            case "log":   return "ℹ️ ";
            case "warn":  return "⚠️ ";
            case "error": return "❌ ";
            default:      return "";
	    }
	},
	formatMessage(level, msg) {
	    if (typeof msg !== "string") return msg;
	    if (level === "log") {
		if (RE_EMOJI.test(msg)) return msg.trim();
		let m = msg.match(/^\s*log:\s*(.*)$/i);
		if (m) return Formatter.getDefaultEmoji("log") + m[1].trim();
		return Formatter.getDefaultEmoji("log") + msg;
	    } else {
		const fixedLevel = level === "debug" ? "debug" : level.toUpperCase();
		if (RE_EMOJI.test(msg)) {
		    const parts = msg.split(" ");
		    return parts[0] + " " + fixedLevel + ": " + parts.slice(1).join(" ").trim();
		}
		let m = msg.match(new RegExp("^\\s*" + level + ":\\s*(.*)$", "i"));
		if (m) return Formatter.getDefaultEmoji(level) + fixedLevel + ": " + m[1].trim();
		return Formatter.getDefaultEmoji(level) + fixedLevel + ": " + msg;
	    }
	}
    };

    // -------------------------------------------------------------------------
    // Argument Processing Helper
    // -------------------------------------------------------------------------
    function processArgs(args) {
	let substitutionMap = null, msg, remaining;
	if (
	    args.length >= 2 &&
		typeof args[0] === "object" &&
		args[0] !== null &&
		!Array.isArray(args[0]) &&
		!(args[0] instanceof Error) &&
		typeof args[1] === "string"
	) {
	    substitutionMap = args[0];
	    msg = args[1];
	    remaining = Array.prototype.slice.call(args, 2);
	} else {
	    msg = args[0];
	    remaining = Array.prototype.slice.call(args, 1);
	}
	return { msg, remaining, substitutionMap };
    }

    // -------------------------------------------------------------------------
    // Base Target Class
    // -------------------------------------------------------------------------
    class SlogTarget {
	constructor(selector, config) {
	    this.selector = selector || "";
	    this.level = LEVELS.debug;
	    this.options = {};
	}
	matchSelector(messageLevel, component) {
	    // Check level threshold first.
	    if (LEVELS[messageLevel] < this.level) return false;
	    if (!this.selector || this.selector === "*") return true;
	    if (this.selector === "_remote") return component && component.startsWith("_remote");
	    return component === this.selector;
	}
	logMessage(details) {
	    throw new Error("logMessage not implemented");
	}
    }

    // -------------------------------------------------------------------------
    // Console Target
    // -------------------------------------------------------------------------
    class ConsoleTarget extends SlogTarget {
	constructor(selector, config) {
	    super(selector, config);
	    if (typeof config === "string") {
		this.level = LEVELS[config.toLowerCase()] || LEVELS.debug;
	    } else {
		this.level = LEVELS[config.level ? config.level.toLowerCase() : "debug"] || LEVELS.debug;
		this.options = Object.assign({}, config);
	    }
	}
	logMessage(details) {
	    const { level, line } = details;
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
		if (isNode) process.stderr.write("Console logging failed: " + err.message + "\n");
		else alert("Logging failure: " + err.message);
	    }
	}
    }

    // -------------------------------------------------------------------------
    // File Target (with asynchronous buffering & debounced flush)
    // -------------------------------------------------------------------------
    class FileTarget extends SlogTarget {
	constructor(selector, config) {
	    super(selector, config);
	    if (!isNode) throw new Error("File logging not supported in this environment.");
	    this.level = LEVELS[config.level ? config.level.toLowerCase() : "debug"] || LEVELS.debug;
	    this.options = Object.assign({}, config);
	    this.path = config.path || "./slogger.log";
	    this.rotateMaxSize = config.rotateMaxSize !== undefined ? config.rotateMaxSize : -1;
	    this.rotateMaxFiles = config.rotateMaxFiles || 5;
	    this.rollingPattern = config.rollingPattern || null;
	    this.currentFileSize = 0;
	    try {
		this.currentFileSize = fs.existsSync(this.path) ? fs.statSync(this.path).size : 0;
	    } catch (err) {
		console.error("Error initializing log file:", err);
	    }
	    this.buffer = [];
	    this.flushTimer = null;
	    this.flushInterval = 50; // flush every 50ms if data exists
	}
	scheduleFlush() {
	    if (this.flushTimer) return;
	    this.flushTimer = setTimeout(() => {
		this.flushTimer = null;
		this.flushBuffer();
	    }, this.flushInterval);
	}
	 flushBuffer() {
            if (this.buffer.length === 0) return;
            const data = this.buffer.join("\n") + "\n";
            this.buffer = [];
            const messageSize = Buffer.byteLength(data, "utf8");
            // Check if rotation is needed.
            if (this.rotateMaxSize > 0 && (this.currentFileSize + messageSize > this.rotateMaxSize)) {
                // Call our roll() method.
                this.roll();
            }
            fs.appendFile(this.path, data, (err) => {
                if (err) console.error("File logging error:", err);
                else this.currentFileSize += messageSize;
            });
        }
        // NEW: Roll (rotate) the log file.
        roll() {
	    slog("Rolling log file "+this.path);
            const now = new Date();
            let rolledFileName = "";
            if (this.rollingPattern && typeof this.rollingPattern === "string") {
                // Compute timezone abbreviation similar to formatTimestamp.
                const tzMatch = now.toTimeString().match(/\(([^)]+)\)$/);
                const tz = tzMatch ? tzMatch[1].split(" ").map(w => w[0]).join("") : "";
                rolledFileName = this.rollingPattern
                    .replace(/yyyy/g, now.getFullYear())
                    .replace(/mm/g, String(now.getMonth() + 1).padStart(2, '0'))
                    .replace(/dd/g, String(now.getDate()).padStart(2, '0'))
                    .replace(/hh/g, String(now.getHours()).padStart(2, '0'))
                    .replace(/MM/g, String(now.getMinutes()).padStart(2, '0'))
                    .replace(/ss/g, String(now.getSeconds()).padStart(2, '0'))
                    .replace(/SSS/g, String(now.getMilliseconds()).padStart(3, '0'))
                    .replace(/TZ/g, tz);
            } else {
                let base = this.path.toLowerCase().endsWith(".log")
                    ? this.path.slice(0, -4)
                    : this.path;
                rolledFileName = `${base}-[${now.getTime()}].log`;
            }
	    slog("Rolling to "+rolledFileName);

	    // actually roll the file.
            try {
                if (fs.existsSync(this.path)) fs.renameSync(this.path, rolledFileName);
                this.currentFileSize = 0;
                const dir = pathModule.dirname(this.path);
                const baseName = pathModule.basename(this.path, ".log");
                const pattern = new RegExp("^" + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "-\\[.*\\]\\.log$");
                let files = fs.readdirSync(dir).filter(f => pattern.test(f));
                if (files.length > this.rotateMaxFiles) {
                    files.sort();
                    files.slice(0, files.length - this.rotateMaxFiles)
                        .forEach(f => {
                            try { fs.unlinkSync(pathModule.join(dir, f)); } catch (e) { console.error("Error deleting rolled file", f, e); }
                        });
                }
            } catch (e) {
                console.error("File rotation error:", e);
            }

	    // touch the new file.
	    fs.appendFile(this.path, "", (err) => {
                if (err) console.error("Error touching new file:", err);
            });
	    
        }

	flushBuffer_old() {
	    if (this.buffer.length === 0) return;
	    const data = this.buffer.join("\n") + "\n";
	    this.buffer = [];
	    const messageSize = Buffer.byteLength(data, "utf8");
	    if (this.rotateMaxSize > 0 && (this.currentFileSize + messageSize > this.rotateMaxSize)) {
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
			.replace(/TZ/g, Formatter.getTimezoneAbbr(now));
		} else {
		    let base = this.path.toLowerCase().endsWith(".log")
			? this.path.slice(0, -4)
			: this.path;
		    rolledFileName = `${base}-[${now.getTime()}].log`;
		}
		try {
		    if (fs.existsSync(this.path)) fs.renameSync(this.path, rolledFileName);
		    this.currentFileSize = 0;
		    const dir = pathModule.dirname(this.path);
		    const baseName = pathModule.basename(this.path, ".log");
		    const pattern = new RegExp("^" + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "-\\[.*\\]\\.log$");
		    let files = fs.readdirSync(dir).filter(f => pattern.test(f));
		    if (files.length > this.rotateMaxFiles) {
			files.sort();
			files.slice(0, files.length - this.rotateMaxFiles)
			    .forEach(f => {
				try { fs.unlinkSync(pathModule.join(dir, f)); } catch (e) { console.error("Error deleting rolled file", f, e); }
			    });
		    }
		} catch (e) {
		    console.error("File rotation error:", e);
		}
	    }
	    fs.appendFile(this.path, data, (err) => {
		if (err) console.error("File logging error:", err);
		else this.currentFileSize += messageSize;
	    });
	}
	logMessage(details) {
	    this.buffer.push(details.line);
	    this.scheduleFlush();
	}
    }

    // -------------------------------------------------------------------------
    // Remote Target (with buffering & batched HTTP requests)
    // -------------------------------------------------------------------------
    class RemoteTarget extends SlogTarget {
	constructor(selector, config) {
	    super(selector, config);
	    this.level = LEVELS[config.level ? config.level.toLowerCase() : "debug"] || LEVELS.debug;
	    this.options = Object.assign({}, config);
	    this.endpoint = config.endpoint;
	    this.bufferSize = config.bufferSize || 10;
	    this.buffer = [];
	    this.flushTimer = null;
	    this.flushInterval = 100; // flush every 100ms if data exists
	}
	scheduleFlush() {
	    if (this.flushTimer) return;
	    this.flushTimer = setTimeout(() => {
		this.flushTimer = null;
		this.flushBuffer();
	    }, this.flushInterval);
	}
	flushBuffer() {
	    if (this.buffer.length === 0) return;
	    const payload = JSON.stringify({ lines: this.buffer });
	    this.buffer = [];
	    this.sendPayload(payload);
	}
	sendPayload(payload) {
	    if (isNode) {
		try {
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
		    req.on("error", err => console.error("Remote logging error:", err.message));
		    req.write(payload);
		    req.end();
		} catch (e) {
		    console.error("Remote logging error:", e.message);
		}
	    } else if (typeof fetch === "function") {
		fetch(this.endpoint, {
		    method: "POST",
		    headers: { "Content-Type": "application/json" },
		    body: payload
		}).catch(e => console.error("Remote logging error:", e.message));
	    } else {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", this.endpoint, true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(payload);
	    }
	}
	logMessage(details) {
	    this.buffer.push(details.line);
	    if (this.buffer.length >= this.bufferSize) {
		if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
		this.flushBuffer();
	    } else {
		this.scheduleFlush();
	    }
	}
    }

    // -------------------------------------------------------------------------
    // Custom Target: Delegates to a provided logger implementation
    // -------------------------------------------------------------------------
    class CustomTarget extends SlogTarget {
	constructor(selector, config) {
	    super(selector, config);
	    this.level = LEVELS[config.level ? config.level.toLowerCase() : "debug"] || LEVELS.debug;
	    this.options = Object.assign({}, config);
	    this.customLogger = config.type;
	    if (typeof this.customLogger.logMessage !== "function") {
		throw new Error("Custom target must implement logMessage() "+JSON.stringify(config));
	    }
	}
	logMessage(details) {
	    this.customLogger.logMessage(details);
	}
    }

    // -------------------------------------------------------------------------
    // Target Indexing for Crazy-Fast Filtering
    // -------------------------------------------------------------------------
    let targets = [];
    let targetIndex = {
	global: [],
	remote: [],
	specific: new Map()
    };
    function rebuildTargetIndex() {
	targetIndex.global = [];
	targetIndex.remote = [];
	targetIndex.specific = new Map();
	for (const t of targets) {
	    if (!t.selector || t.selector === "*") {
		targetIndex.global.push(t);
	    } else if (t.selector === "_remote") {
		targetIndex.remote.push(t);
	    } else {
		let arr = targetIndex.specific.get(t.selector);
		if (!arr) { arr = []; targetIndex.specific.set(t.selector, arr); }
		arr.push(t);
	    }
	}
    }

    // -------------------------------------------------------------------------
    // Helper: Create Target from Configuration
    // -------------------------------------------------------------------------
    function createTarget(selector, cfg) {
	const config = typeof cfg === "string" ? { type: "console", level: cfg } : cfg;
	if (typeof config.type !== "string")
	    return new CustomTarget(selector, config);
	
	const type = (config.type || "console").toLowerCase();
	if (type === "console") return new ConsoleTarget(selector, config);
	if (type === "file") return new FileTarget(selector, config);
	if (type === "remote") return new RemoteTarget(selector, config);
	throw new Error("unexpected type of slog: "+type);
    }

    // -------------------------------------------------------------------------
    // Logging Dispatch: Fast Central Path with Indexed Target Lookup
    // -------------------------------------------------------------------------
    function dispatchLog({ level, msg, extraArgs, component, timestamp, opts = {} }) {
	const ts = opts.clientTimestamp || Formatter.formatTimestamp(timestamp || new Date());
	const parts = [`[${ts}]`];
	if (component) parts.push(`.${component}`);
	parts.push(msg);
	if (extraArgs && extraArgs.length > 0) {
	    parts.push(extraArgs.map(Formatter.stringify).join(" "));
	}
	let line = parts.join(" ");
	if (opts.prependNewlines) {
	    line = "\n".repeat(opts.prependNewlines) + line;
	}
	const details = { level, msg, extraArgs, component, opts, timestamp: ts, line };

	let candidates;
	if (component) {
	    const specificArr = targetIndex.specific.get(component) || [];
	    const remoteArr = (component.startsWith("_remote") ? targetIndex.remote : []);
	    if (specificArr.length || remoteArr.length) {
		candidates = specificArr.concat(remoteArr);
	    } else {
		candidates = targetIndex.global;
	    }
	} else {
	    candidates = targetIndex.global;
	}
	// Final filter by log level threshold.
	const matched = candidates.filter(t => LEVELS[level] >= t.level);
	matched.forEach(t => t.logMessage(details));
    }

    // -------------------------------------------------------------------------
    // Central Log Function
    // -------------------------------------------------------------------------
    function log(level, component, args) {
	const { msg, remaining } = processArgs(args);
	const finalMsg = typeof msg === "string"
	      ? Formatter.formatMessage(level, msg)
	      : msg;
	dispatchLog({ level, msg: finalMsg, extraArgs: remaining, component, timestamp: new Date() });
    }

    // -------------------------------------------------------------------------
    // Public API: Non-Component Logging
    // -------------------------------------------------------------------------
    function sdebug(...args) { log("debug", "", args); }
    function slog(...args)   { log("log", "", args); }
    function swarn(...args)  { log("warn", "", args); }
    function serror(...args) { log("error", "", args); }

    // -------------------------------------------------------------------------
    // Public API: Component-Specific Logging
    // -------------------------------------------------------------------------
    function csdebug(component, ...args) { log("debug", component, args); }
    function cslog(component, ...args)   { log("log", component, args); }
    function cswarn(component, ...args)  { log("warn", component, args); }
    function cserror(component, ...args)  { log("error", component, args); }

    // -------------------------------------------------------------------------
    // Configuration Functions
    // -------------------------------------------------------------------------
    function slogConfig(options) {
	targets = [];
	slogConfigAdd(options);
    }
    function slogConfigAdd(options) {
	for (let key in options) {
	    if (Object.prototype.hasOwnProperty.call(options, key) && key.indexOf("slog") === 0) {
		let selector;
		if (key === "slog") selector = "";
		else if (key.startsWith("slog.")) selector = key.slice(5);
		else selector = key;
		let configs = options[key];
		if (!Array.isArray(configs)) configs = [configs];
		configs.forEach(cfg => targets.push(createTarget(selector, cfg)));
	    }
	}
	if (targets.length === 0) {
	    throw new Error("slogConfig() did not configure any targets. Provide at least one target!");
	}
	rebuildTargetIndex();
	csdebug("slogger", `Configuration updated with ${targets.length} targets.`);
    }

    // -------------------------------------------------------------------------
    // Express Endpoint Integration (Node Only)
    // -------------------------------------------------------------------------
    function slogExpressEndpoint(app, endpoint, uniqueClientId) {
	cslog("slogger", `Creating express endpoint at ${endpoint}`);
	if (!app || typeof app.post !== "function") {
	    throw new Error("Invalid Express app instance provided.");
	}

	app.post(endpoint, (req, res) => {
	    const body = req.body;
	    if (!body || !body.lines || !Array.isArray(body.lines)) {
		return res.status(400).send("Invalid payload: missing 'lines' array.");
	    }

	    const logLines = body.lines;
	    logLines.forEach(line => {
		if (typeof line !== 'string') {
		    serror('❌ Invalid line in logLines: ', line);
		    return;
		}
		const parsed = slogParseLine(line);
		let clientId = "unknown";
		try {
		    clientId = uniqueClientId(req);
		} catch (err) {
		    serror(`Error obtaining unique client ID: ${err.message}`);
		    clientId = "unknown";  // Ensure a valid clientId even in error cases.
		}
		let finalComponent = `_remote[${clientId}]`;
		if (parsed.component) finalComponent += "." + parsed.component;
		const opts = { clientTimestamp: parsed.timestamp };
		switch (parsed.level) {
		case "debug": csdebug(finalComponent, opts, parsed.message); break;
		case "warn":  cswarn(finalComponent, opts, parsed.message); break;
		case "error": cserror(finalComponent, opts, parsed.message); break;
		default:      cslog(finalComponent, opts, parsed.message); break;
		}
	    });
	    res.status(200).send("Logged");
	});
    }
    
    // -------------------------------------------------------------------------
    // Log Line Parser
    // -------------------------------------------------------------------------
    function slogParseLine(line) {
	const result = { timestamp: null, component: null, level: null, message: null };
	let m = line.match(RE_TIMESTAMP);
	if (m) {
	    result.timestamp = m[1].trim();
	    line = line.slice(m[0].length);
	}
	m = line.match(RE_COMPONENT);
	if (m) {
	    result.component = m[1].slice(1);
	    line = line.slice(m[0].length);
	}
	m = line.match(RE_LEVEL);
	if (m) {
	    result.level = m[1].toLowerCase();
	    result.message = m[2].trim();
	} else {
	    result.level = "log";
	    result.message = line.trim();
	}
	return result;
    }

    // -------------------------------------------------------------------------
    // NEW: Global function to roll all file targets.
    // -------------------------------------------------------------------------
    function slogRollAllLogs() {
	targets.forEach(target => {
	    if (target instanceof FileTarget) {
		target.roll();
	    }
	});
    }

    // -------------------------------------------------------------------------
    // Public API Export
    // -------------------------------------------------------------------------
    return {
	sdebug, slog, swarn, serror,
	csdebug, cslog, cswarn, cserror,
	slogConfig, slogConfigAdd,
	slogExpressEndpoint, slogParseLine,
	slogRollAllLogs
    };
});
