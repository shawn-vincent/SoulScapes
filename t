===== ./soulscapes-client/node_modules/sucrase/dist/NameManager.js =====
"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _getIdentifierNames = require('./util/getIdentifierNames'); var _getIdentifierNames2 = _interopRequireDefault(_getIdentifierNames);

 class NameManager {
    __init() {this.usedNames = new Set()}

  constructor(code, tokens) {;NameManager.prototype.__init.call(this);
    this.usedNames = new Set(_getIdentifierNames2.default.call(void 0, code, tokens));
  }

  claimFreeName(name) {
    const newName = this.findFreeName(name);
    this.usedNames.add(newName);
    return newName;
  }

  findFreeName(name) {
    if (!this.usedNames.has(name)) {
      return name;
    }
    let suffixNum = 2;
    while (this.usedNames.has(name + String(suffixNum))) {
      suffixNum++;
    }
    return name + String(suffixNum);
  }
} exports.default = NameManager;

===== ./soulscapes-client/node_modules/sucrase/dist/esm/NameManager.js =====

import getIdentifierNames from "./util/getIdentifierNames";

export default class NameManager {
    __init() {this.usedNames = new Set()}

  constructor(code, tokens) {;NameManager.prototype.__init.call(this);
    this.usedNames = new Set(getIdentifierNames(code, tokens));
  }

  claimFreeName(name) {
    const newName = this.findFreeName(name);
    this.usedNames.add(newName);
    return newName;
  }

  findFreeName(name) {
    if (!this.usedNames.has(name)) {
      return name;
    }
    let suffixNum = 2;
    while (this.usedNames.has(name + String(suffixNum))) {
      suffixNum++;
    }
    return name + String(suffixNum);
  }
}

===== ./soulscapes-client/node_modules/sucrase/dist/esm/HelperManager.js =====


const HELPERS = {
  require: `
    import {createRequire as CREATE_REQUIRE_NAME} from "module";
    const require = CREATE_REQUIRE_NAME(import.meta.url);
  `,
  interopRequireWildcard: `
    function interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj;
      } else {
        var newObj = {};
        if (obj != null) {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              newObj[key] = obj[key];
            }
          }
        }
        newObj.default = obj;
        return newObj;
      }
    }
  `,
  interopRequireDefault: `
    function interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  `,
  createNamedExportFrom: `
    function createNamedExportFrom(obj, localName, importedName) {
      Object.defineProperty(exports, localName, {enumerable: true, configurable: true, get: () => obj[importedName]});
    }
  `,
  // Note that TypeScript and Babel do this differently; TypeScript does a simple existence
  // check in the exports object and does a plain assignment, whereas Babel uses
  // defineProperty and builds an object of explicitly-exported names so that star exports can
  // always take lower precedence. For now, we do the easier TypeScript thing.
  createStarExport: `
    function createStarExport(obj) {
      Object.keys(obj)
        .filter((key) => key !== "default" && key !== "__esModule")
        .forEach((key) => {
          if (exports.hasOwnProperty(key)) {
            return;
          }
          Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]});
        });
    }
  `,
  nullishCoalesce: `
    function nullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return rhsFn();
      }
    }
  `,
  asyncNullishCoalesce: `
    async function asyncNullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return await rhsFn();
      }
    }
  `,
  optionalChain: `
    function optionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
  asyncOptionalChain: `
    async function asyncOptionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = await fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = await fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
  optionalChainDelete: `
    function optionalChainDelete(ops) {
      const result = OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `,
  asyncOptionalChainDelete: `
    async function asyncOptionalChainDelete(ops) {
      const result = await ASYNC_OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `,
};

export class HelperManager {
  __init() {this.helperNames = {}}
  __init2() {this.createRequireName = null}
  constructor( nameManager) {;this.nameManager = nameManager;HelperManager.prototype.__init.call(this);HelperManager.prototype.__init2.call(this);}

  getHelperName(baseName) {
    let helperName = this.helperNames[baseName];
    if (helperName) {
      return helperName;
    }
    helperName = this.nameManager.claimFreeName(`_${baseName}`);
    this.helperNames[baseName] = helperName;
    return helperName;
  }

  emitHelpers() {
    let resultCode = "";
    if (this.helperNames.optionalChainDelete) {
      this.getHelperName("optionalChain");
    }
    if (this.helperNames.asyncOptionalChainDelete) {
      this.getHelperName("asyncOptionalChain");
    }
    for (const [baseName, helperCodeTemplate] of Object.entries(HELPERS)) {
      const helperName = this.helperNames[baseName];
      let helperCode = helperCodeTemplate;
      if (baseName === "optionalChainDelete") {
        helperCode = helperCode.replace("OPTIONAL_CHAIN_NAME", this.helperNames.optionalChain);
      } else if (baseName === "asyncOptionalChainDelete") {
        helperCode = helperCode.replace(
          "ASYNC_OPTIONAL_CHAIN_NAME",
          this.helperNames.asyncOptionalChain,
        );
      } else if (baseName === "require") {
        if (this.createRequireName === null) {
          this.createRequireName = this.nameManager.claimFreeName("_createRequire");
        }
        helperCode = helperCode.replace(/CREATE_REQUIRE_NAME/g, this.createRequireName);
      }
      if (helperName) {
        resultCode += " ";
        resultCode += helperCode.replace(baseName, helperName).replace(/\s+/g, " ").trim();
      }
    }
    return resultCode;
  }
}

===== ./soulscapes-client/node_modules/sucrase/dist/HelperManager.js =====
"use strict";Object.defineProperty(exports, "__esModule", {value: true});

const HELPERS = {
  require: `
    import {createRequire as CREATE_REQUIRE_NAME} from "module";
    const require = CREATE_REQUIRE_NAME(import.meta.url);
  `,
  interopRequireWildcard: `
    function interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj;
      } else {
        var newObj = {};
        if (obj != null) {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              newObj[key] = obj[key];
            }
          }
        }
        newObj.default = obj;
        return newObj;
      }
    }
  `,
  interopRequireDefault: `
    function interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  `,
  createNamedExportFrom: `
    function createNamedExportFrom(obj, localName, importedName) {
      Object.defineProperty(exports, localName, {enumerable: true, configurable: true, get: () => obj[importedName]});
    }
  `,
  // Note that TypeScript and Babel do this differently; TypeScript does a simple existence
  // check in the exports object and does a plain assignment, whereas Babel uses
  // defineProperty and builds an object of explicitly-exported names so that star exports can
  // always take lower precedence. For now, we do the easier TypeScript thing.
  createStarExport: `
    function createStarExport(obj) {
      Object.keys(obj)
        .filter((key) => key !== "default" && key !== "__esModule")
        .forEach((key) => {
          if (exports.hasOwnProperty(key)) {
            return;
          }
          Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]});
        });
    }
  `,
  nullishCoalesce: `
    function nullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return rhsFn();
      }
    }
  `,
  asyncNullishCoalesce: `
    async function asyncNullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return await rhsFn();
      }
    }
  `,
  optionalChain: `
    function optionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
  asyncOptionalChain: `
    async function asyncOptionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = await fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = await fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
  optionalChainDelete: `
    function optionalChainDelete(ops) {
      const result = OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `,
  asyncOptionalChainDelete: `
    async function asyncOptionalChainDelete(ops) {
      const result = await ASYNC_OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `,
};

 class HelperManager {
  __init() {this.helperNames = {}}
  __init2() {this.createRequireName = null}
  constructor( nameManager) {;this.nameManager = nameManager;HelperManager.prototype.__init.call(this);HelperManager.prototype.__init2.call(this);}

  getHelperName(baseName) {
    let helperName = this.helperNames[baseName];
    if (helperName) {
      return helperName;
    }
    helperName = this.nameManager.claimFreeName(`_${baseName}`);
    this.helperNames[baseName] = helperName;
    return helperName;
  }

  emitHelpers() {
    let resultCode = "";
    if (this.helperNames.optionalChainDelete) {
      this.getHelperName("optionalChain");
    }
    if (this.helperNames.asyncOptionalChainDelete) {
      this.getHelperName("asyncOptionalChain");
    }
    for (const [baseName, helperCodeTemplate] of Object.entries(HELPERS)) {
      const helperName = this.helperNames[baseName];
      let helperCode = helperCodeTemplate;
      if (baseName === "optionalChainDelete") {
        helperCode = helperCode.replace("OPTIONAL_CHAIN_NAME", this.helperNames.optionalChain);
      } else if (baseName === "asyncOptionalChainDelete") {
        helperCode = helperCode.replace(
          "ASYNC_OPTIONAL_CHAIN_NAME",
          this.helperNames.asyncOptionalChain,
        );
      } else if (baseName === "require") {
        if (this.createRequireName === null) {
          this.createRequireName = this.nameManager.claimFreeName("_createRequire");
        }
        helperCode = helperCode.replace(/CREATE_REQUIRE_NAME/g, this.createRequireName);
      }
      if (helperName) {
        resultCode += " ";
        resultCode += helperCode.replace(baseName, helperName).replace(/\s+/g, " ").trim();
      }
    }
    return resultCode;
  }
} exports.HelperManager = HelperManager;

===== ./soulscapes-client/node_modules/watchpack/lib/getWatcherManager.js =====
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const DirectoryWatcher = require("./DirectoryWatcher");

class WatcherManager {
	constructor(options) {
		this.options = options;
		this.directoryWatchers = new Map();
	}

	getDirectoryWatcher(directory) {
		const watcher = this.directoryWatchers.get(directory);
		if (watcher === undefined) {
			const newWatcher = new DirectoryWatcher(this, directory, this.options);
			this.directoryWatchers.set(directory, newWatcher);
			newWatcher.on("closed", () => {
				this.directoryWatchers.delete(directory);
			});
			return newWatcher;
		}
		return watcher;
	}

	watchFile(p, startTime) {
		const directory = path.dirname(p);
		if (directory === p) return null;
		return this.getDirectoryWatcher(directory).watch(p, startTime);
	}

	watchDirectory(directory, startTime) {
		return this.getDirectoryWatcher(directory).watch(directory, startTime);
	}
}

const watcherManagers = new WeakMap();
/**
 * @param {object} options options
 * @returns {WatcherManager} the watcher manager
 */
module.exports = options => {
	const watcherManager = watcherManagers.get(options);
	if (watcherManager !== undefined) return watcherManager;
	const newWatcherManager = new WatcherManager(options);
	watcherManagers.set(options, newWatcherManager);
	return newWatcherManager;
};
module.exports.WatcherManager = WatcherManager;

===== ./soulscapes-client/node_modules/websocket-driver/lib/websocket/driver/server.js =====
'use strict';

var util       = require('util'),
    HttpParser = require('../http_parser'),
    Base       = require('./base'),
    Draft75    = require('./draft75'),
    Draft76    = require('./draft76'),
    Hybi       = require('./hybi');

var Server = function(options) {
  Base.call(this, null, null, options);
  this._http = new HttpParser('request');
};
util.inherits(Server, Base);

var instance = {
  EVENTS: ['open', 'message', 'error', 'close', 'ping', 'pong'],

  _bindEventListeners: function() {
    this.messages.on('error', function() {});
    this.on('error', function() {});
  },

  parse: function(chunk) {
    if (this._delegate) return this._delegate.parse(chunk);

    this._http.parse(chunk);
    if (!this._http.isComplete()) return;

    this.method  = this._http.method;
    this.url     = this._http.url;
    this.headers = this._http.headers;
    this.body    = this._http.body;

    var self = this;
    this._delegate = Server.http(this, this._options);
    this._delegate.messages = this.messages;
    this._delegate.io = this.io;
    this._open();

    this.EVENTS.forEach(function(event) {
      this._delegate.on(event, function(e) { self.emit(event, e) });
    }, this);

    this.protocol = this._delegate.protocol;
    this.version  = this._delegate.version;

    this.parse(this._http.body);
    this.emit('connect', new Base.ConnectEvent());
  },

  _open: function() {
    this.__queue.forEach(function(msg) {
      this._delegate[msg[0]].apply(this._delegate, msg[1]);
    }, this);
    this.__queue = [];
  }
};

['addExtension', 'setHeader', 'start', 'frame', 'text', 'binary', 'ping', 'close'].forEach(function(method) {
  instance[method] = function() {
    if (this._delegate) {
      return this._delegate[method].apply(this._delegate, arguments);
    } else {
      this.__queue.push([method, arguments]);
      return true;
    }
  };
});

for (var key in instance)
  Server.prototype[key] = instance[key];

Server.isSecureRequest = function(request) {
  if (request.connection && request.connection.authorized !== undefined) return true;
  if (request.socket && request.socket.secure) return true;

  var headers = request.headers;
  if (!headers) return false;
  if (headers['https'] === 'on') return true;
  if (headers['x-forwarded-ssl'] === 'on') return true;
  if (headers['x-forwarded-scheme'] === 'https') return true;
  if (headers['x-forwarded-proto'] === 'https') return true;

  return false;
};

Server.determineUrl = function(request) {
  var scheme = this.isSecureRequest(request) ? 'wss:' : 'ws:';
  return scheme + '//' + request.headers.host + request.url;
};

Server.http = function(request, options) {
  options = options || {};
  if (options.requireMasking === undefined) options.requireMasking = true;

  var headers = request.headers,
      version = headers['sec-websocket-version'],
      key     = headers['sec-websocket-key'],
      key1    = headers['sec-websocket-key1'],
      key2    = headers['sec-websocket-key2'],
      url     = this.determineUrl(request);

  if (version || key)
    return new Hybi(request, url, options);
  else if (key1 || key2)
    return new Draft76(request, url, options);
  else
    return new Draft75(request, url, options);
};

module.exports = Server;

===== ./soulscapes-client/node_modules/@typescript-eslint/utils/dist/ts-eslint-scope/ScopeManager.js =====
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeManager = void 0;
const scope_manager_1 = __importDefault(require("eslint-scope/lib/scope-manager"));
const ScopeManager = scope_manager_1.default;
exports.ScopeManager = ScopeManager;
//# sourceMappingURL=ScopeManager.js.map
===== ./soulscapes-client/node_modules/@typescript-eslint/scope-manager/dist/ScopeManager.js =====
"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ScopeManager_options;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeManager = void 0;
const assert_1 = require("./assert");
const scope_1 = require("./scope");
const ClassFieldInitializerScope_1 = require("./scope/ClassFieldInitializerScope");
const ClassStaticBlockScope_1 = require("./scope/ClassStaticBlockScope");
class ScopeManager {
    get variables() {
        const variables = new Set();
        function recurse(scope) {
            scope.variables.forEach(v => variables.add(v));
            scope.childScopes.forEach(recurse);
        }
        this.scopes.forEach(recurse);
        return Array.from(variables).sort((a, b) => a.$id - b.$id);
    }
    constructor(options) {
        _ScopeManager_options.set(this, void 0);
        this.scopes = [];
        this.globalScope = null;
        this.nodeToScope = new WeakMap();
        this.currentScope = null;
        __classPrivateFieldSet(this, _ScopeManager_options, options, "f");
        this.declaredVariables = new WeakMap();
    }
    isGlobalReturn() {
        return __classPrivateFieldGet(this, _ScopeManager_options, "f").globalReturn === true;
    }
    isModule() {
        return __classPrivateFieldGet(this, _ScopeManager_options, "f").sourceType === 'module';
    }
    isImpliedStrict() {
        return __classPrivateFieldGet(this, _ScopeManager_options, "f").impliedStrict === true;
    }
    isStrictModeSupported() {
        return __classPrivateFieldGet(this, _ScopeManager_options, "f").ecmaVersion != null && __classPrivateFieldGet(this, _ScopeManager_options, "f").ecmaVersion >= 5;
    }
    isES6() {
        return __classPrivateFieldGet(this, _ScopeManager_options, "f").ecmaVersion != null && __classPrivateFieldGet(this, _ScopeManager_options, "f").ecmaVersion >= 6;
    }
    /**
     * Get the variables that a given AST node defines. The gotten variables' `def[].node`/`def[].parent` property is the node.
     * If the node does not define any variable, this returns an empty array.
     * @param node An AST node to get their variables.
     * @public
     */
    getDeclaredVariables(node) {
        var _a;
        return (_a = this.declaredVariables.get(node)) !== null && _a !== void 0 ? _a : [];
    }
    /**
     * Get the scope of a given AST node. The gotten scope's `block` property is the node.
     * This method never returns `function-expression-name` scope. If the node does not have their scope, this returns `null`.
     *
     * @param node An AST node to get their scope.
     * @param inner If the node has multiple scopes, this returns the outermost scope normally.
     *                If `inner` is `true` then this returns the innermost scope.
     * @public
     */
    acquire(node, inner = false) {
        var _a;
        function predicate(testScope) {
            if (testScope.type === 'function' && testScope.functionExpressionScope) {
                return false;
            }
            return true;
        }
        const scopes = this.nodeToScope.get(node);
        if (!scopes || scopes.length === 0) {
            return null;
        }
        // Heuristic selection from all scopes.
        // If you would like to get all scopes, please use ScopeManager#acquireAll.
        if (scopes.length === 1) {
            return scopes[0];
        }
        if (inner) {
            for (let i = scopes.length - 1; i >= 0; --i) {
                const scope = scopes[i];
                if (predicate(scope)) {
                    return scope;
                }
            }
            return null;
        }
        return (_a = scopes.find(predicate)) !== null && _a !== void 0 ? _a : null;
    }
    nestScope(scope) {
        if (scope instanceof scope_1.GlobalScope) {
            (0, assert_1.assert)(this.currentScope == null);
            this.globalScope = scope;
        }
        this.currentScope = scope;
        return scope;
    }
    nestBlockScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.BlockScope(this, this.currentScope, node));
    }
    nestCatchScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.CatchScope(this, this.currentScope, node));
    }
    nestClassScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.ClassScope(this, this.currentScope, node));
    }
    nestClassFieldInitializerScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new ClassFieldInitializerScope_1.ClassFieldInitializerScope(this, this.currentScope, node));
    }
    nestClassStaticBlockScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new ClassStaticBlockScope_1.ClassStaticBlockScope(this, this.currentScope, node));
    }
    nestConditionalTypeScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.ConditionalTypeScope(this, this.currentScope, node));
    }
    nestForScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.ForScope(this, this.currentScope, node));
    }
    nestFunctionExpressionNameScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.FunctionExpressionNameScope(this, this.currentScope, node));
    }
    nestFunctionScope(node, isMethodDefinition) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.FunctionScope(this, this.currentScope, node, isMethodDefinition));
    }
    nestFunctionTypeScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.FunctionTypeScope(this, this.currentScope, node));
    }
    nestGlobalScope(node) {
        return this.nestScope(new scope_1.GlobalScope(this, node));
    }
    nestMappedTypeScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.MappedTypeScope(this, this.currentScope, node));
    }
    nestModuleScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.ModuleScope(this, this.currentScope, node));
    }
    nestSwitchScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.SwitchScope(this, this.currentScope, node));
    }
    nestTSEnumScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.TSEnumScope(this, this.currentScope, node));
    }
    nestTSModuleScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.TSModuleScope(this, this.currentScope, node));
    }
    nestTypeScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.TypeScope(this, this.currentScope, node));
    }
    nestWithScope(node) {
        (0, assert_1.assert)(this.currentScope);
        return this.nestScope(new scope_1.WithScope(this, this.currentScope, node));
    }
}
exports.ScopeManager = ScopeManager;
_ScopeManager_options = new WeakMap();
//# sourceMappingURL=ScopeManager.js.map
===== ./soulscapes-client/node_modules/react-dom/server.js =====
'use strict';

module.exports = require('./server.node');

===== ./soulscapes-client/node_modules/spdy/lib/spdy/server.js =====
'use strict'

var assert = require('assert')
var https = require('https')
var http = require('http')
var tls = require('tls')
var net = require('net')
var util = require('util')
var selectHose = require('select-hose')
var transport = require('spdy-transport')
var debug = require('debug')('spdy:server')
var EventEmitter = require('events').EventEmitter

// Node.js 0.8, 0.10 and 0.12 support
Object.assign = process.versions.modules >= 46
  ? Object.assign // eslint-disable-next-line
  : util._extend

var spdy = require('../spdy')

var proto = {}

function instantiate (base) {
  function Server (options, handler) {
    this._init(base, options, handler)
  }
  util.inherits(Server, base)

  Server.create = function create (options, handler) {
    return new Server(options, handler)
  }

  Object.keys(proto).forEach(function (key) {
    Server.prototype[key] = proto[key]
  })

  return Server
}

proto._init = function _init (base, options, handler) {
  var state = {}
  this._spdyState = state

  state.options = options.spdy || {}

  var protocols = state.options.protocols || [
    'h2',
    'spdy/3.1', 'spdy/3', 'spdy/2',
    'http/1.1', 'http/1.0'
  ]

  var actualOptions = Object.assign({
    NPNProtocols: protocols,

    // Future-proof
    ALPNProtocols: protocols
  }, options)

  state.secure = this instanceof tls.Server

  if (state.secure) {
    base.call(this, actualOptions)
  } else {
    base.call(this)
  }

  // Support HEADERS+FIN
  this.httpAllowHalfOpen = true

  var event = state.secure ? 'secureConnection' : 'connection'

  state.listeners = this.listeners(event).slice()
  assert(state.listeners.length > 0, 'Server does not have default listeners')
  this.removeAllListeners(event)

  if (state.options.plain) {
    this.on(event, this._onPlainConnection)
  } else { this.on(event, this._onConnection) }

  if (handler) {
    this.on('request', handler)
  }

  debug('server init secure=%d', state.secure)
}

proto._onConnection = function _onConnection (socket) {
  var state = this._spdyState

  var protocol
  if (state.secure) {
    protocol = socket.npnProtocol || socket.alpnProtocol
  }

  this._handleConnection(socket, protocol)
}

proto._handleConnection = function _handleConnection (socket, protocol) {
  var state = this._spdyState

  if (!protocol) {
    protocol = state.options.protocol
  }

  debug('incoming socket protocol=%j', protocol)

  // No way we can do anything with the socket
  if (!protocol || protocol === 'http/1.1' || protocol === 'http/1.0') {
    debug('to default handler it goes')
    return this._invokeDefault(socket)
  }

  socket.setNoDelay(true)

  var connection = transport.connection.create(socket, Object.assign({
    protocol: /spdy/.test(protocol) ? 'spdy' : 'http2',
    isServer: true
  }, state.options.connection || {}))

  // Set version when we are certain
  if (protocol === 'http2') { connection.start(4) } else if (protocol === 'spdy/3.1') {
    connection.start(3.1)
  } else if (protocol === 'spdy/3') { connection.start(3) } else if (protocol === 'spdy/2') {
    connection.start(2)
  }

  connection.on('error', function () {
    socket.destroy()
  })

  var self = this
  connection.on('stream', function (stream) {
    self._onStream(stream)
  })
}

// HTTP2 preface
var PREFACE = 'PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n'
var PREFACE_BUFFER = Buffer.from(PREFACE)

function hoseFilter (data, callback) {
  if (data.length < 1) {
    return callback(null, null)
  }

  // SPDY!
  if (data[0] === 0x80) { return callback(null, 'spdy') }

  var avail = Math.min(data.length, PREFACE_BUFFER.length)
  for (var i = 0; i < avail; i++) {
    if (data[i] !== PREFACE_BUFFER[i]) { return callback(null, 'http/1.1') }
  }

  // Not enough bytes to be sure about HTTP2
  if (avail !== PREFACE_BUFFER.length) { return callback(null, null) }

  return callback(null, 'h2')
}

proto._onPlainConnection = function _onPlainConnection (socket) {
  var hose = selectHose.create(socket, {}, hoseFilter)

  var self = this
  hose.on('select', function (protocol, socket) {
    self._handleConnection(socket, protocol)
  })

  hose.on('error', function (err) {
    debug('hose error %j', err.message)
    socket.destroy()
  })
}

proto._invokeDefault = function _invokeDefault (socket) {
  var state = this._spdyState

  for (var i = 0; i < state.listeners.length; i++) { state.listeners[i].call(this, socket) }
}

proto._onStream = function _onStream (stream) {
  var state = this._spdyState

  var handle = spdy.handle.create(this._spdyState.options, stream)

  var socketOptions = {
    handle: handle,
    allowHalfOpen: true
  }

  var socket
  if (state.secure) {
    socket = new spdy.Socket(stream.connection.socket, socketOptions)
  } else {
    socket = new net.Socket(socketOptions)
  }

  // This is needed because the `error` listener, added by the default
  // `connection` listener, no longer has bound arguments. It relies instead
  // on the `server` property of the socket. See https://github.com/nodejs/node/pull/11926
  // for more details.
  // This is only done for Node.js >= 4 in order to not break compatibility
  // with older versions of the platform.
  if (process.versions.modules >= 46) { socket.server = this }

  handle.assignSocket(socket)

  // For v0.8
  socket.readable = true
  socket.writable = true

  this._invokeDefault(socket)

  // For v0.8, 0.10 and 0.12
  if (process.versions.modules < 46) {
    // eslint-disable-next-line
    this.listenerCount = EventEmitter.listenerCount.bind(this)
  }

  // Add lazy `checkContinue` listener, otherwise `res.writeContinue` will be
  // called before the response object was patched by us.
  if (stream.headers.expect !== undefined &&
      /100-continue/i.test(stream.headers.expect) &&
      this.listenerCount('checkContinue') === 0) {
    this.once('checkContinue', function (req, res) {
      res.writeContinue()

      this.emit('request', req, res)
    })
  }

  handle.emitRequest()
}

proto.emit = function emit (event, req, res) {
  if (event !== 'request' && event !== 'checkContinue') {
    return EventEmitter.prototype.emit.apply(this, arguments)
  }

  if (!(req.socket._handle instanceof spdy.handle)) {
    debug('not spdy req/res')
    req.isSpdy = false
    req.spdyVersion = 1
    res.isSpdy = false
    res.spdyVersion = 1
    return EventEmitter.prototype.emit.apply(this, arguments)
  }

  var handle = req.connection._handle

  req.isSpdy = true
  req.spdyVersion = handle.getStream().connection.getVersion()
  res.isSpdy = true
  res.spdyVersion = req.spdyVersion
  req.spdyStream = handle.getStream()

  debug('override req/res')
  res.writeHead = spdy.response.writeHead
  res.end = spdy.response.end
  res.push = spdy.response.push
  res.writeContinue = spdy.response.writeContinue
  res.spdyStream = handle.getStream()

  res._req = req

  handle.assignRequest(req)
  handle.assignResponse(res)

  return EventEmitter.prototype.emit.apply(this, arguments)
}

exports.Server = instantiate(https.Server)
exports.PlainServer = instantiate(http.Server)

exports.create = function create (base, options, handler) {
  if (typeof base === 'object') {
    handler = options
    options = base
    base = null
  }

  if (base) {
    return instantiate(base).create(options, handler)
  }

  if (options.spdy && options.spdy.plain) { return exports.PlainServer.create(options, handler) } else {
    return exports.Server.create(options, handler)
  }
}

===== ./soulscapes-client/src/components/AvatarHorizontalGridLayout.js =====
// src/components/AvatarHorizontalGridLayout.js
import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import AvatarLayout from './AvatarLayout';
import ZoomControl from './ZoomControl';
import styles from './AvatarHorizontalGridLayout.module.css';

const AvatarHorizontalGridLayout = ({ children, initialSize = 80, gap = 10 }) => {
  // State for the current avatar size.
  const [avatarSize, setAvatarSize] = useState(initialSize);
  const scrollContainerRef = useRef(null);
  const [rows, setRows] = useState(1);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Zoom callbacks.
  const handleZoomIn = () => {
    setAvatarSize(prev => prev * 1.1);
  };
  const handleZoomOut = () => {
    setAvatarSize(prev => prev / 1.1);
  };
  const handleZoomFit = () => {
    setAvatarSize(initialSize);
  };

  // Update number of rows based on container height.
  const updateRows = () => {
    if (scrollContainerRef.current) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      const newRows = Math.max(1, Math.floor((containerHeight + gap) / (avatarSize + gap)));
      setRows(newRows);
    }
  };

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    updateRows();

    const resizeObserver = new ResizeObserver(() => {
      updateRows();
    });
    resizeObserver.observe(scrollContainerRef.current);

    const currentContainer = scrollContainerRef.current;

    return () => {
      resizeObserver.disconnect();
    };
  }, [avatarSize, gap]);

  // Simple scroll function.
  const scrollByAmount = (direction) => {
    if (scrollContainerRef.current) {
      const amount = scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({ left: direction * amount, behavior: 'smooth' });
    }
  };

  // Clone children to pass the updated size prop.
  const updatedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { size: avatarSize });
    }
    return child;
  });

  return (
    <div className={styles.container}>
      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        <AvatarLayout
          className={styles.avatarHorizontalGrid}
          style={{
            '--grid-rows': rows,
            '--avatar-size': `${avatarSize}px`,
            '--avatar-gap': `${gap}px`,
          }}
        >
          {updatedChildren}
        </AvatarLayout>
      </div>

    </div>
  );
};

AvatarHorizontalGridLayout.propTypes = {
  children: PropTypes.node,
  initialSize: PropTypes.number,
  gap: PropTypes.number,
};

export default AvatarHorizontalGridLayout;

===== ./soulscapes-client/src/components/Avatar.js =====
import React, { useRef, useEffect, useState } from 'react';
import AvatarConfigWindow from './AvatarConfigWindow'; // Import the new component
import { X } from '@phosphor-icons/react'; // Import the close icon from Phosphor

const Avatar = ({ data , onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(data.isVideoLoading);

    const videoRef = useRef(null);

    
    useEffect(() => {
	if (data.videoStream && videoRef.current) {
	    if (data.videoStream instanceof MediaStream) { // ✅ Ensure it's a valid MediaStream
		console.log(`[${new Date().toISOString()}] ✅ Video stream set on  <Avatar>`,
			    data.videoStream);

		videoRef.current.srcObject = data.videoStream;
		setIsVideoLoading(false);
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ Invalid videoStream detected:`, data.videoStream);
		videoRef.current.srcObject = null; // Explicitly reset in case of invalid data
		setIsVideoLoading(true);
	    }
	}
    }, [data.videoStream]);


    const handleAvatarClick = () => {
	//setIsModalOpen(true);
    };

    const handleCloseModal = () => {
	setIsModalOpen(false);
    };

    const handleSave = (updatedData) => {
	onUpdate(updatedData); // Pass updated data back to the parent
	setIsModalOpen(false);
    };

    return (
	<>
	    <div onClick={handleAvatarClick} style={{ position: 'relative', cursor: 'pointer' }}>
		{/* Render the Avatar */}
		<div style={{
			 width: `${data.size}px`,
			 height: `${data.size}px`,
			 borderRadius: '50%',
			 backgroundColor: "black",
			 border: `solid ${data.color} 3px`,
			 display: 'flex',
			 alignItems: 'center',
			 justifyContent: 'center',
			 color: '#fff',
			 fontSize: '20px',
		     }}>
		    
		    {data.videoStream ? (
			<video ref={videoRef} autoPlay playsInline muted={data.local} style={{
				   width: "100%",
				   height: "100%",
				   objectFit: "cover",
				   borderRadius: "50%",
			       }} />
		    ) :
		     data.initials}
		</div>

		{/* Connection status overlay */}
		<div
		    style={{
			position: "absolute",
			top: "-10px",
			left: "50%",
			transform: "translateX(-50%)",
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			color: "#fff",
			padding: "3px 8px",
			borderRadius: "5px",
			fontSize: "12px",
		    }}
		>
		    {data.connectionStatus}
		</div>
		
	    </div>



	    {/* Render the modal if `isModalOpen` is true */}
	    {isModalOpen && (
		<AvatarConfigWindow
		    data={data}
		    onClose={handleCloseModal}
		    onSave={handleSave}
		/>
	    )}
	</>
    );
};

export default Avatar;

===== ./soulscapes-client/src/components/AvatarClusterLayout.js =====
// AvatarClusterLayout.js
import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force';
import AvatarLayout from './AvatarLayout';
import styles from './AvatarClusterLayout.module.css';

const AvatarClusterLayout = ({ children, initialSize = 80, margin = 20 }) => {
  const [avatarSize, setAvatarSize] = useState(initialSize);
  const outerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [nodes, setNodes] = useState([]);
  const [contentSize, setContentSize] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const handleZoomIn = () => setAvatarSize((prev) => prev * 1.1);
  const handleZoomOut = () => setAvatarSize((prev) => prev / 1.1);
  const handleZoomFit = () => setAvatarSize(initialSize);

  useEffect(() => {
    if (!outerRef.current) return;
    const updateSize = () => {
      if (!outerRef.current) return;
      const { clientWidth, clientHeight } = outerRef.current;
      if (clientWidth && clientHeight) {
        setContainerSize({ width: clientWidth, height: clientHeight });
      }
    };
    updateSize();
    const resizeObs = new ResizeObserver(() => updateSize());
    resizeObs.observe(outerRef.current);
    return () => resizeObs.disconnect();
  }, []);

  const childArray = useMemo(() => {
    return React.Children.toArray(children).map((child, index) => {
      const id = child.key != null ? child.key : `child-${index}`;
      return { id, element: child };
    });
  }, [children]);

  const updatedChildMap = useMemo(() => {
    const map = {};
    childArray.forEach((child) => {
      map[child.id] = React.cloneElement(child.element, { size: avatarSize });
    });
    return map;
  }, [childArray, avatarSize]);

  const computeBoundingBox = (nodesArr) => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodesArr.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });
    return { minX, maxX, minY, maxY };
  };

  const updateContentSize = (nodeArr) => {
    if (!containerSize.width || !containerSize.height || nodeArr.length === 0) return;
    const { minX, maxX, minY, maxY } = computeBoundingBox(nodeArr);
    const computedWidth = maxX - minX + 2 * margin;
    const computedHeight = maxY - minY + 2 * margin;
      const contentWidth = computedWidth; 
      const contentHeight = computedHeight;
      //console.log("Computed size", computedWidth, computedHeight);
    const offsetX = containerSize.width / 2 - (minX + maxX) / 2;
    const offsetY = containerSize.height / 2 - (minY + maxY) / 2;
    setContentSize({ width: contentWidth, height: contentHeight, offsetX, offsetY });
  };

  const strengthX = 0.1;
  const strengthY = 0.1;
  const strengthCollide = .5;
  const strengthAlpha = 0.3;

    const makeChildNodes = (childArray)=> {
      return childArray.map((child) => ({
          id: child.id,
          x: Math.random(0,400),
          y: Math.random(0,400),
          zoomed: false,
      }));
  }
    
    
  const simulationRef = useRef(null);
    if (!simulationRef.current) {
	simulationRef.current = forceSimulation(makeChildNodes(childArray))
	    .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
	    .force('x', forceX(0).strength(strengthX))
	    .force('y', forceY(0).strength(strengthY))
	    .alpha(strengthAlpha);
    }

    useEffect(() => {
    const { width, height } = containerSize;
    if (width === 0 || height === 0 || childArray.length === 0) return;

    const sim = simulationRef.current;
    const currentNodes = sim.nodes();

    const newNodes = childArray.map((child) => {
      const existingNode = currentNodes.find((n) => n.id === child.id);
      if (existingNode) {
	  //console.log("reusing existing node ", {existingNode})
          return { ...existingNode, id: child.id };
      } else {
	  const x = Math.floor(Math.random() * width);
	  const y = Math.floor(Math.random() * height);
	  //console.log("creating new node at ", {x,y})
	  return {
	      id: child.id,
	      x: x,
	      y: y,
	      zoomed: false,
        };
      }
    });

    sim.nodes(newNodes)
      .force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide))
      .force('x', forceX(width / 2).strength(strengthX))
      .force('y', forceY(height / 2).strength(strengthY))
      .alpha(strengthAlpha);

    sim.on('tick', () => {
      const currentNodes = sim.nodes();
      setNodes([...currentNodes]);
      updateContentSize(currentNodes);
    });

    return () => sim.stop();
  }, [containerSize.width, containerSize.height, childArray, avatarSize]);

  useEffect(() => {
    const { width, height } = containerSize;
    if (simulationRef.current && width && height) {
      simulationRef.current.force('x', forceX(width / 2).strength(strengthX));
      simulationRef.current.force('y', forceY(height / 2).strength(strengthY));
      simulationRef.current.alpha(strengthAlpha).restart();
    }
  }, [containerSize]);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.force('collide', forceCollide(avatarSize / 2 + 5).strength(strengthCollide));
      simulationRef.current.alpha(strengthAlpha).restart();
    }
  }, [avatarSize]);

  return (
    <div className={styles.container}>
      <div className={styles.outerContainer} ref={outerRef}>
        <AvatarLayout
          className={styles.simulationContent}
          style={{
            width: contentSize.width,
            height: contentSize.height,
            position: 'relative',
            '--avatar-size': `${avatarSize}px`,
          }}
        >
          {nodes.map((node) => {
            const childEl = updatedChildMap[node.id];
            return (
              <div
                key={node.id}
                className={styles.avatarWrapper}
                style={{
                  position: 'absolute',
                  left: node.x - avatarSize / 2 + contentSize.offsetX,
                  top: node.y - avatarSize / 2 + contentSize.offsetY,
                  width: avatarSize,
                  height: avatarSize,
                }}
              >
                {childEl}
              </div>
            );
          })}
        </AvatarLayout>
      </div>
    </div>
  );
};

AvatarClusterLayout.propTypes = {
  children: PropTypes.node,
  initialSize: PropTypes.number,
  margin: PropTypes.number,
};

export default AvatarClusterLayout;

===== ./soulscapes-client/src/components/AvatarConfigWindow.js =====
import React, { useState } from 'react';
import Avatar from './Avatar'; 
import { X } from '@phosphor-icons/react'; // Import the close icon from Phosphor

const AvatarConfigWindow = ({ data, onClose, onSave }) => {
  const [avatarData, setAvatarData] = useState(data);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAvatarData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    onSave(avatarData); // Pass updated data back to the parent
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeButton}>
          <X size={24} />
        </button>

        {/* Preview the Avatar */}
          <div style={styles.avatarPreview}>
	      <Avatar data={avatarData}/>
          </div>

      </div>
    </div>
  );
};

// Styles for the modal
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#888',
    borderRadius: '10px',
    padding: '20px',
    width: '80%',
    height: '80%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
  },
  avatarPreview: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '5px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  saveButton: {
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default AvatarConfigWindow;

===== ./soulscapes-client/src/components/AvatarLayout.js =====
// src/components/AvatarLayout.js
import React, { useRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

const AvatarLayout = React.forwardRef(({ children, className, style }, ref) => {
  const innerRef = useRef();

  return (
    <div className={className} style={style} ref={innerRef}>
      {children}
    </div>
  );
});

AvatarLayout.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default AvatarLayout;

===== ./soulscapes-client/src/components/AvatarSpace.js =====
// src/components/AvatarSpace.js
import React, { useState, useRef } from 'react';
import { ArrowsDownUp } from '@phosphor-icons/react';
import styles from './AvatarSpace.module.css';

const AvatarSpace = () => {
  // bottomHeight is the height of the bottom section (default 50px)
  const [bottomHeight, setBottomHeight] = useState(50);
  const containerRef = useRef(null);
  const dividerHeight = 12; // height of the divider bar

  const onMouseDown = (e) => {
    e.preventDefault();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Calculate new bottom height as the distance from the mouse to the container's bottom,
    // adjusted by half the divider height.
    let newBottomHeight = rect.bottom - e.clientY - dividerHeight / 2;
    // Set some minimum and maximum constraints:
    const minHeight = 30; // minimum height for the bottom section
    const maxHeight = rect.height - 30 - dividerHeight; // ensure top has at least 30px
    if (newBottomHeight < minHeight) newBottomHeight = minHeight;
    if (newBottomHeight > maxHeight) newBottomHeight = maxHeight;
    setBottomHeight(newBottomHeight);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={styles.avatarSpace} ref={containerRef}>
      {/* Top section occupies the remaining space */}
      <div
        className={styles.topSection}
        style={{ height: `calc(100% - ${bottomHeight + dividerHeight}px)` }}
      >
        {/* Top section content (transparent) */}
      </div>
      {/* Divider */}
      <div className={styles.divider} onMouseDown={onMouseDown}>
        <div className={styles.dividerHandle}>
          <ArrowsDownUp size={16} weight="regular" color="#fff" />
        </div>
      </div>
      {/* Bottom section (default height 50px, adjustable via dragging) */}
      <div
        className={styles.bottomSection}
        style={{ height: `${bottomHeight}px` }}
      >
        {/* Bottom section content (transparent) */}
      </div>
    </div>
  );
};

export default AvatarSpace;

===== ./soulscapes-client/src/services/LocalAvatarManager.js =====
import { EventEmitter } from "events";

class LocalAvatarManager extends EventEmitter {
  constructor() {
    super();
    
    const savedAvatar = JSON.parse(localStorage.getItem("localAvatar")) || {};

    this.avatar = {
      id: null,
      name: savedAvatar.name || "Anonymous",
      mood: savedAvatar.mood || "neutral",
      color: savedAvatar.color || "#00f",
	image: savedAvatar.image || null,
	size: 80,
	initials: this.getRandomInitials(),
      videoEnabled: savedAvatar.videoEnabled || false,
      audioEnabled: savedAvatar.audioEnabled || false,
	connectionStatus: "Disconnected", // NEW: Track connection status
	videoStream: null,
    };

      this.saveToStorage();

    console.log(`[${new Date().toISOString()}] 🎭 Loaded local avatar`, this.avatar);
  }

    
    getRandomInitials() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return letters.charAt(Math.floor(Math.random() * 26)) + 
            letters.charAt(Math.floor(Math.random() * 26));
    }

    async joinedRoom(room) {
	this.startVideoStream();
    }
    
    async startVideoStream() {
	try {
	    this.emit("videoStreamUpdated");

	    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
	    this.avatar.videoStream = stream;
	    this.avatar.videoEnabled = true;
	    this.emit("videoStreamUpdated", stream);
	    console.log(`[${new Date().toISOString()}] 📹 Video stream started`);
	} catch (error) {
	    console.error(`[${new Date().toISOString()}] ❌ Failed to get webcam`, error);
	    this.emit("videoStreamUpdated");
	}
    }
    
  setConnectionStatus(status) {
    this.avatar.connectionStatus = status;
    this.emit("statusChanged", status); // Notify listeners (React components)
    console.log(`[${new Date().toISOString()}] 🔄 Connection Status: ${status}`);
  }

  setAvatarData({ name, mood, color, image }) {
    if (name) this.avatar.name = name;
    if (mood) this.avatar.mood = mood;
    if (color) this.avatar.color = color;
    if (image) this.avatar.image = image;
    this.saveToStorage();
  }

  saveToStorage() {
    localStorage.setItem("localAvatar", JSON.stringify(this.avatar));
  }

  getAvatarData() {
    return this.avatar;
  }

    getVideoStream() {
    return this.avatar.videoStream;
  }

}

const localAvatarManager = new LocalAvatarManager();
export default localAvatarManager;

===== ./soulscapes-client/src/services/RoomManager.js =====
import { io } from "socket.io-client";
import localAvatarManager from "./LocalAvatarManager";
import remoteAvatarManager from "./RemoteAvatarManager";

class RoomManager {
    constructor() {
	this.socket = io("http://localhost:4000/rooms", {
	    reconnection: true,
	    reconnectionAttempts: 10,
	    reconnectionDelay: 2000,
	});

	this.peerConnections = {};
	this.room = null;

	this.socket.on("connect", () => {
	    console.log(`[${new Date().toISOString()}] ✅ Connected to server`);

	    if (localAvatarManager) {
		localAvatarManager.setConnectionStatus("Connected");
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ localAvatarManager is undefined!`);
	    }
	    
	    this.rejoinRoom();
	});

	this.socket.on("disconnect", () => {
	    console.warn(`[${new Date().toISOString()}] ❌ Disconnected. Reconnecting...`);
	    localAvatarManager.setConnectionStatus("Disconnected");
	});

	this.socket.on("user-list", this.handleUserList.bind(this));
	this.socket.on("user-joined", this.handleNewUser.bind(this));
	this.socket.on("user-left", this.handleUserLeft.bind(this));

	this.socket.on("offer", this.handleOffer.bind(this)); // ✅ Ensure it runs
	this.socket.on("answer", this.handleAnswer.bind(this));
    }

    async joinRoom(room) {
	if (this.room === room) {
	    console.warn(`[${new Date().toISOString()}] ⚠️ Already in room "${room}", skipping duplicate join.`);
	    return;
	}
	
	this.room = room;
	remoteAvatarManager.switchRoom(room); // Tell RemoteAvatarManager to reset
	localStorage.setItem("lastRoom", room);
	
	if (localAvatarManager.getAvatarData().connectionStatus !== "Connected") {
	    localAvatarManager.setConnectionStatus("Connecting...");
	}
	
	this.socket.emit("join-room", { room, avatarData: localAvatarManager.getAvatarData() });
	
	console.log(`[${new Date().toISOString()}] 🚪 Joining room "${room}"`);

	await localAvatarManager.joinedRoom(this.room);
    }

    rejoinRoom() {
	const lastRoom = localStorage.getItem("lastRoom");
	
	if (!lastRoom || this.room === lastRoom) {
	    console.warn(`[${new Date().toISOString()}] ⚠️ Skipping rejoin, already in room "${this.room}".`);
	    return;
	}
	
	console.log(`[${new Date().toISOString()}] 🔄 Rejoining room "${lastRoom}"`);
	this.joinRoom(lastRoom);
    }
    
    async handleUserList(users) {
	users.forEach(({ id, avatar }) => {
	    remoteAvatarManager.addUser(id, avatar);
	});
    }

    async handleNewUser({ id, avatar }) {
	console.log(`[${new Date().toISOString()}] 🚀 New user detected: ${id}`);
	remoteAvatarManager.addUser(id, avatar);

	console.log(`[${new Date().toISOString()}] 🔄 Attempting to start WebRTC call with ${id}`);
	this.startCall(id);
    }

    async handleUserLeft(id) {
	remoteAvatarManager.removeUser(id);
    }


    async startCall(peerId) {
	console.log(`[${new Date().toISOString()}] 📞 Starting call with ${peerId}`);

	if (this.peerConnections[peerId]) {
	    console.warn(`[${new Date().toISOString()}] ⚠️ Already have a peer connection with ${peerId}, skipping.`);
	    return;
	}

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[peerId] = peerConnection;

	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
	    console.log(`[${new Date().toISOString()}] 🎥 Adding local video tracks to call with ${peerId}`);
	    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
	} else {
	    console.warn(`[${new Date().toISOString()}] ⚠️ No local video stream found for ${peerId}`);
	}

	peerConnection.onicecandidate = (event) => {
	    if (event.candidate) {
		console.log(`[${new Date().toISOString()}] ❄️ Sending ICE candidate to ${peerId}`);
		this.socket.emit("ice-candidate", { target: peerId, candidate: event.candidate });
	    }
	};

	  // Capture peerId in a local variable for use in the callback
	const currentPeerId = peerId;
	peerConnection.ontrack = (event) => {
	    console.log(`[${new Date().toISOString()}] 📺 ontrack event for ${currentPeerId}`, event);
	    
	    // Use event.streams if available; otherwise, create a new MediaStream from the track(s)
	    let inboundStream;
	    if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
	    } else if (event.track) {
		// If no stream is provided, construct one from the received track.
		inboundStream = new MediaStream([event.track]);
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ No valid video tracks received from ${currentPeerId}`);
		return;
	    }
	    
	    console.log(`[${new Date().toISOString()}] 🔄 Setting video stream for ${currentPeerId}`, inboundStream);
	    remoteAvatarManager.setVideoStream(currentPeerId, inboundStream);
	};

	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	console.log(`[${new Date().toISOString()}] 📡 Sending WebRTC offer to ${currentPeerId}`);
	this.socket.emit("offer", { target: currentPeerId, offer });
    }


    async handleOffer({ offer, sender }) {
	console.log(`[${new Date().toISOString()}] 📡 Received WebRTC offer from ${sender}`);

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[sender] = peerConnection;

	peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
		console.log(`[${new Date().toISOString()}] ❄️ Sending ICE candidate to ${sender}`);
		this.socket.emit("ice-candidate", { target: sender, candidate: event.candidate });
            }
	};

	peerConnection.ontrack = (event) => {
            console.log(`[${new Date().toISOString()}] 📺 ontrack event for ${sender}`, event);
            let inboundStream;
            if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
            } else if (event.track) {
		inboundStream = new MediaStream([event.track]);
            } else {
		console.error(`[${new Date().toISOString()}] ❌ No valid video tracks received from ${sender}`);
		return;
            }
            console.log(`[${new Date().toISOString()}] 🔄 Setting video stream for ${sender}`, inboundStream);
            remoteAvatarManager.setVideoStream(sender, inboundStream);
	};

	// **New:** Add local tracks on the callee side so that the answer includes media.
	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
            console.log(`[${new Date().toISOString()}] 🎥 Adding local video tracks to call (callee side) with ${sender}`);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	} else {
            console.warn(`[${new Date().toISOString()}] ⚠️ No local video stream found on callee side for ${sender}`);
	}

	console.log(`[${new Date().toISOString()}] 🔄 Setting remote description for ${sender}`);
	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	console.log(`[${new Date().toISOString()}] 📡 Sending WebRTC answer to ${sender}`);
	this.socket.emit("answer", { target: sender, answer });
    }

    async handleOffer_old({ target, offer }) {
	console.log(`[${new Date().toISOString()}] 📡 Received WebRTC offer from ${target}`);

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[target] = peerConnection;

	peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
		console.log(`[${new Date().toISOString()}] ❄️ Sending ICE candidate to ${target}`);
		this.socket.emit("ice-candidate", { target, candidate: event.candidate });
            }
	};
	// Capture peerId in a local variable for use in the callback
	const currentPeerId = target;
	peerConnection.ontrack = (event) => {
	    console.log(`[${new Date().toISOString()}] 📺 ontrack event for ${currentPeerId}`, event);
	    
	    // Use event.streams if available; otherwise, create a new MediaStream from the track(s)
	    let inboundStream;
	    if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
	    } else if (event.track) {
		// If no stream is provided, construct one from the received track.
		inboundStream = new MediaStream([event.track]);
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ No valid video tracks received from ${currentPeerId}`);
		return;
	    }
	    
	    console.log(`[${new Date().toISOString()}] 🔄 Setting video stream for ${currentPeerId}`, inboundStream);
	    remoteAvatarManager.setVideoStream(currentPeerId, inboundStream);
	};

	// **New code: Add local video tracks on the callee side**
	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
            console.log(`[${new Date().toISOString()}] 🎥 Adding local video tracks to call (callee side) with ${target}`);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	} else {
            console.warn(`[${new Date().toISOString()}] ⚠️ No local video stream found on callee side for ${target}`);
	}

	console.log(`[${new Date().toISOString()}] 🔄 Setting remote description for ${target}`);
	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	console.log(`[${new Date().toISOString()}] 📡 Sending WebRTC answer to ${target}`);
	this.socket.emit("answer", { target, answer });
    }

    handleIceCandidate({ target, candidate }) {
	console.log(`[${new Date().toISOString()}] ❄️ Received ICE candidate from ${target}`);

	if (this.peerConnections[target]) {
	    this.peerConnections[target].addIceCandidate(new RTCIceCandidate(candidate))
		.then(() => console.log(`[${new Date().toISOString()}] ✅ ICE candidate added successfully`))
		.catch((error) => console.error(`[${new Date().toISOString()}] ❌ Failed to add ICE candidate`, error));
	} else {
	    console.warn(`[${new Date().toISOString()}] ⚠️ No peer connection found for ${target}`);
	}
    }

    async handleAnswer({ answer, sender }) {
	console.log(`[${new Date().toISOString()}] 📡 Received WebRTC answer from ${sender}`);
	
	const peerConnection = this.peerConnections[sender];
	if (!peerConnection) {
            console.error(`[${new Date().toISOString()}] ❌ No peer connection found for ${sender}`);
            return;
	}

	try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`[${new Date().toISOString()}] ✅ Set remote description from answer`);
	} catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Error setting remote description:`, error);
	}
    }
}

const roomManager = new RoomManager();
window.roomManager = roomManager;
export default roomManager;

===== ./soulscapes-client/src/services/RemoteAvatarManager.js =====
// RemoteAvatarManager.js
import { EventEmitter } from "events";

class RemoteAvatarManager extends EventEmitter {
  constructor() {
    super();
    this.avatars = {};
  }

  addUser(id, avatarData) {
    if (this.avatars[id]) return;
    // Initialize with no videoStream and mark as loading
    this.avatars[id] = { ...avatarData, videoStream: null, isVideoLoading: true };
    this.emit("updated");
  }

  setVideoStream(id, stream) {
    if (this.avatars[id]) {
      // Create a new object to trigger re-render in React:
      this.avatars[id] = { 
        ...this.avatars[id], 
        videoStream: stream, 
        isVideoLoading: false 
      };
      console.log(`[${new Date().toISOString()}] ✅ Video stream set for ${id}`, stream);
      this.emit("updated");
    }
  }

  removeUser(id) {
    if (this.avatars[id]) {
      delete this.avatars[id];
      this.emit("updated");
    }
  }

  getAvatarsForCurrentRoom() {
    return Object.values(this.avatars);
  }

  switchRoom(room) {
    // Reset avatars when switching rooms
    console.log(`[${new Date().toISOString()}] 🔄 Resetting avatars for new room`);
    this.avatars = {};
    this.emit("updated");
  }
}

const remoteAvatarManager = new RemoteAvatarManager();
export default remoteAvatarManager;

===== ./soulscapes-server/server.js =====
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = {}; // Track users and their avatars
const log = (msg, emoji = "🖥️") => console.log(`[${new Date().toISOString()}] ${emoji} ${msg}`);

const roomsNamespace = io.of("/rooms");

roomsNamespace.on("connection", (socket) => {
  log(`User connected: ${socket.id} 🌍`);

  socket.on("join-room", ({ room, avatarData }) => {
    socket.join(room);
    avatarData.id = socket.id;
    rooms[room] = rooms[room] || {};
    rooms[room][socket.id] = avatarData;

    log(`${socket.id} joined room "${room}" as ${avatarData.name} 🏠`);

    const existingUsers = Object.entries(rooms[room]).map(([id, avatar]) => ({ id, avatar }));
    socket.emit("user-list", existingUsers);
    socket.to(room).emit("user-joined", { id: socket.id, avatar: avatarData });
  });

  // --- New event handlers for WebRTC signaling ---

  socket.on("offer", (data) => {
    // Forward the offer to the target client.
    // Assume data has: { target, offer }
    log(`Forwarding offer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("offer", { offer: data.offer, sender: socket.id });
  });

  socket.on("answer", (data) => {
    // Forward the answer to the target client.
    // Assume data has: { target, answer }
    log(`Forwarding answer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("answer", { answer: data.answer, sender: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    // Forward the ICE candidate to the target client.
    // Assume data has: { target, candidate }
    log(`Forwarding ICE candidate from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("ice-candidate", { candidate: data.candidate, sender: socket.id });
  });

  // ---------------------------------------------------

  socket.on("disconnect", () => {
    log(`User disconnected: ${socket.id} ❌`);

    Object.keys(rooms).forEach((room) => {
      if (rooms[room][socket.id]) {
        delete rooms[room][socket.id];
        log(`Removed ${socket.id} from room "${room}" 🚪`);
        roomsNamespace.to(room).emit("user-left", socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  log(`WebRTC signaling server running on port ${PORT} 🚀`);
});

===== ./soulscapes-server/node_modules/engine.io/build/server.js =====
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = exports.BaseServer = void 0;
const qs = require("querystring");
const url_1 = require("url");
const base64id = require("base64id");
const transports_1 = require("./transports");
const events_1 = require("events");
const socket_1 = require("./socket");
const debug_1 = require("debug");
const cookie_1 = require("cookie");
const ws_1 = require("ws");
const webtransport_1 = require("./transports/webtransport");
const engine_io_parser_1 = require("engine.io-parser");
const debug = (0, debug_1.default)("engine");
const kResponseHeaders = Symbol("responseHeaders");
function parseSessionId(data) {
    try {
        const parsed = JSON.parse(data);
        if (typeof parsed.sid === "string") {
            return parsed.sid;
        }
    }
    catch (e) { }
}
class BaseServer extends events_1.EventEmitter {
    /**
     * Server constructor.
     *
     * @param {Object} opts - options
     */
    constructor(opts = {}) {
        super();
        this.middlewares = [];
        this.clients = {};
        this.clientsCount = 0;
        this.opts = Object.assign({
            wsEngine: ws_1.Server,
            pingTimeout: 20000,
            pingInterval: 25000,
            upgradeTimeout: 10000,
            maxHttpBufferSize: 1e6,
            transports: ["polling", "websocket"], // WebTransport is disabled by default
            allowUpgrades: true,
            httpCompression: {
                threshold: 1024,
            },
            cors: false,
            allowEIO3: false,
        }, opts);
        if (opts.cookie) {
            this.opts.cookie = Object.assign({
                name: "io",
                path: "/",
                // @ts-ignore
                httpOnly: opts.cookie.path !== false,
                sameSite: "lax",
            }, opts.cookie);
        }
        if (this.opts.cors) {
            this.use(require("cors")(this.opts.cors));
        }
        if (opts.perMessageDeflate) {
            this.opts.perMessageDeflate = Object.assign({
                threshold: 1024,
            }, opts.perMessageDeflate);
        }
        this.init();
    }
    /**
     * Compute the pathname of the requests that are handled by the server
     * @param options
     * @protected
     */
    _computePath(options) {
        let path = (options.path || "/engine.io").replace(/\/$/, "");
        if (options.addTrailingSlash !== false) {
            // normalize path
            path += "/";
        }
        return path;
    }
    /**
     * Returns a list of available transports for upgrade given a certain transport.
     *
     * @return {Array}
     */
    upgrades(transport) {
        if (!this.opts.allowUpgrades)
            return [];
        return transports_1.default[transport].upgradesTo || [];
    }
    /**
     * Verifies a request.
     *
     * @param {EngineRequest} req
     * @param upgrade - whether it's an upgrade request
     * @param fn
     * @protected
     */
    verify(req, upgrade, fn) {
        // transport check
        const transport = req._query.transport;
        // WebTransport does not go through the verify() method, see the onWebTransportSession() method
        if (!~this.opts.transports.indexOf(transport) ||
            transport === "webtransport") {
            debug('unknown transport "%s"', transport);
            return fn(Server.errors.UNKNOWN_TRANSPORT, { transport });
        }
        // 'Origin' header check
        const isOriginInvalid = checkInvalidHeaderChar(req.headers.origin);
        if (isOriginInvalid) {
            const origin = req.headers.origin;
            req.headers.origin = null;
            debug("origin header invalid");
            return fn(Server.errors.BAD_REQUEST, {
                name: "INVALID_ORIGIN",
                origin,
            });
        }
        // sid check
        const sid = req._query.sid;
        if (sid) {
            if (!this.clients.hasOwnProperty(sid)) {
                debug('unknown sid "%s"', sid);
                return fn(Server.errors.UNKNOWN_SID, {
                    sid,
                });
            }
            const previousTransport = this.clients[sid].transport.name;
            if (!upgrade && previousTransport !== transport) {
                debug("bad request: unexpected transport without upgrade");
                return fn(Server.errors.BAD_REQUEST, {
                    name: "TRANSPORT_MISMATCH",
                    transport,
                    previousTransport,
                });
            }
        }
        else {
            // handshake is GET only
            if ("GET" !== req.method) {
                return fn(Server.errors.BAD_HANDSHAKE_METHOD, {
                    method: req.method,
                });
            }
            if (transport === "websocket" && !upgrade) {
                debug("invalid transport upgrade");
                return fn(Server.errors.BAD_REQUEST, {
                    name: "TRANSPORT_HANDSHAKE_ERROR",
                });
            }
            if (!this.opts.allowRequest)
                return fn();
            return this.opts.allowRequest(req, (message, success) => {
                if (!success) {
                    return fn(Server.errors.FORBIDDEN, {
                        message,
                    });
                }
                fn();
            });
        }
        fn();
    }
    /**
     * Adds a new middleware.
     *
     * @example
     * import helmet from "helmet";
     *
     * engine.use(helmet());
     *
     * @param fn
     */
    use(fn) {
        this.middlewares.push(fn);
    }
    /**
     * Apply the middlewares to the request.
     *
     * @param req
     * @param res
     * @param callback
     * @protected
     */
    _applyMiddlewares(req, res, callback) {
        if (this.middlewares.length === 0) {
            debug("no middleware to apply, skipping");
            return callback();
        }
        const apply = (i) => {
            debug("applying middleware n°%d", i + 1);
            this.middlewares[i](req, res, (err) => {
                if (err) {
                    return callback(err);
                }
                if (i + 1 < this.middlewares.length) {
                    apply(i + 1);
                }
                else {
                    callback();
                }
            });
        };
        apply(0);
    }
    /**
     * Closes all clients.
     */
    close() {
        debug("closing all open clients");
        for (let i in this.clients) {
            if (this.clients.hasOwnProperty(i)) {
                this.clients[i].close(true);
            }
        }
        this.cleanup();
        return this;
    }
    /**
     * generate a socket id.
     * Overwrite this method to generate your custom socket id
     *
     * @param {IncomingMessage} req - the request object
     */
    generateId(req) {
        return base64id.generateId();
    }
    /**
     * Handshakes a new client.
     *
     * @param {String} transportName
     * @param {Object} req - the request object
     * @param {Function} closeConnection
     *
     * @protected
     */
    async handshake(transportName, req, closeConnection) {
        const protocol = req._query.EIO === "4" ? 4 : 3; // 3rd revision by default
        if (protocol === 3 && !this.opts.allowEIO3) {
            debug("unsupported protocol version");
            this.emit("connection_error", {
                req,
                code: Server.errors.UNSUPPORTED_PROTOCOL_VERSION,
                message: Server.errorMessages[Server.errors.UNSUPPORTED_PROTOCOL_VERSION],
                context: {
                    protocol,
                },
            });
            closeConnection(Server.errors.UNSUPPORTED_PROTOCOL_VERSION);
            return;
        }
        let id;
        try {
            id = await this.generateId(req);
        }
        catch (e) {
            debug("error while generating an id");
            this.emit("connection_error", {
                req,
                code: Server.errors.BAD_REQUEST,
                message: Server.errorMessages[Server.errors.BAD_REQUEST],
                context: {
                    name: "ID_GENERATION_ERROR",
                    error: e,
                },
            });
            closeConnection(Server.errors.BAD_REQUEST);
            return;
        }
        debug('handshaking client "%s"', id);
        try {
            var transport = this.createTransport(transportName, req);
            if ("polling" === transportName) {
                transport.maxHttpBufferSize = this.opts.maxHttpBufferSize;
                transport.httpCompression = this.opts.httpCompression;
            }
            else if ("websocket" === transportName) {
                transport.perMessageDeflate = this.opts.perMessageDeflate;
            }
        }
        catch (e) {
            debug('error handshaking to transport "%s"', transportName);
            this.emit("connection_error", {
                req,
                code: Server.errors.BAD_REQUEST,
                message: Server.errorMessages[Server.errors.BAD_REQUEST],
                context: {
                    name: "TRANSPORT_HANDSHAKE_ERROR",
                    error: e,
                },
            });
            closeConnection(Server.errors.BAD_REQUEST);
            return;
        }
        const socket = new socket_1.Socket(id, this, transport, req, protocol);
        transport.on("headers", (headers, req) => {
            const isInitialRequest = !req._query.sid;
            if (isInitialRequest) {
                if (this.opts.cookie) {
                    headers["Set-Cookie"] = [
                        // @ts-ignore
                        (0, cookie_1.serialize)(this.opts.cookie.name, id, this.opts.cookie),
                    ];
                }
                this.emit("initial_headers", headers, req);
            }
            this.emit("headers", headers, req);
        });
        transport.onRequest(req);
        this.clients[id] = socket;
        this.clientsCount++;
        socket.once("close", () => {
            delete this.clients[id];
            this.clientsCount--;
        });
        this.emit("connection", socket);
        return transport;
    }
    async onWebTransportSession(session) {
        const timeout = setTimeout(() => {
            debug("the client failed to establish a bidirectional stream in the given period");
            session.close();
        }, this.opts.upgradeTimeout);
        const streamReader = session.incomingBidirectionalStreams.getReader();
        const result = await streamReader.read();
        if (result.done) {
            debug("session is closed");
            return;
        }
        const stream = result.value;
        const transformStream = (0, engine_io_parser_1.createPacketDecoderStream)(this.opts.maxHttpBufferSize, "nodebuffer");
        const reader = stream.readable.pipeThrough(transformStream).getReader();
        // reading the first packet of the stream
        const { value, done } = await reader.read();
        if (done) {
            debug("stream is closed");
            return;
        }
        clearTimeout(timeout);
        if (value.type !== "open") {
            debug("invalid WebTransport handshake");
            return session.close();
        }
        if (value.data === undefined) {
            const transport = new webtransport_1.WebTransport(session, stream, reader);
            // note: we cannot use "this.generateId()", because there is no "req" argument
            const id = base64id.generateId();
            debug('handshaking client "%s" (WebTransport)', id);
            const socket = new socket_1.Socket(id, this, transport, null, 4);
            this.clients[id] = socket;
            this.clientsCount++;
            socket.once("close", () => {
                delete this.clients[id];
                this.clientsCount--;
            });
            this.emit("connection", socket);
            return;
        }
        const sid = parseSessionId(value.data);
        if (!sid) {
            debug("invalid WebTransport handshake");
            return session.close();
        }
        const client = this.clients[sid];
        if (!client) {
            debug("upgrade attempt for closed client");
            session.close();
        }
        else if (client.upgrading) {
            debug("transport has already been trying to upgrade");
            session.close();
        }
        else if (client.upgraded) {
            debug("transport had already been upgraded");
            session.close();
        }
        else {
            debug("upgrading existing transport");
            const transport = new webtransport_1.WebTransport(session, stream, reader);
            client._maybeUpgrade(transport);
        }
    }
}
exports.BaseServer = BaseServer;
/**
 * Protocol errors mappings.
 */
BaseServer.errors = {
    UNKNOWN_TRANSPORT: 0,
    UNKNOWN_SID: 1,
    BAD_HANDSHAKE_METHOD: 2,
    BAD_REQUEST: 3,
    FORBIDDEN: 4,
    UNSUPPORTED_PROTOCOL_VERSION: 5,
};
BaseServer.errorMessages = {
    0: "Transport unknown",
    1: "Session ID unknown",
    2: "Bad handshake method",
    3: "Bad request",
    4: "Forbidden",
    5: "Unsupported protocol version",
};
/**
 * Exposes a subset of the http.ServerResponse interface, in order to be able to apply the middlewares to an upgrade
 * request.
 *
 * @see https://nodejs.org/api/http.html#class-httpserverresponse
 */
class WebSocketResponse {
    constructor(req, socket) {
        this.req = req;
        this.socket = socket;
        // temporarily store the response headers on the req object (see the "headers" event)
        req[kResponseHeaders] = {};
    }
    setHeader(name, value) {
        this.req[kResponseHeaders][name] = value;
    }
    getHeader(name) {
        return this.req[kResponseHeaders][name];
    }
    removeHeader(name) {
        delete this.req[kResponseHeaders][name];
    }
    write() { }
    writeHead() { }
    end() {
        // we could return a proper error code, but the WebSocket client will emit an "error" event anyway.
        this.socket.destroy();
    }
}
/**
 * An Engine.IO server based on Node.js built-in HTTP server and the `ws` package for WebSocket connections.
 */
class Server extends BaseServer {
    /**
     * Initialize websocket server
     *
     * @protected
     */
    init() {
        if (!~this.opts.transports.indexOf("websocket"))
            return;
        if (this.ws)
            this.ws.close();
        this.ws = new this.opts.wsEngine({
            noServer: true,
            clientTracking: false,
            perMessageDeflate: this.opts.perMessageDeflate,
            maxPayload: this.opts.maxHttpBufferSize,
        });
        if (typeof this.ws.on === "function") {
            this.ws.on("headers", (headersArray, req) => {
                // note: 'ws' uses an array of headers, while Engine.IO uses an object (response.writeHead() accepts both formats)
                // we could also try to parse the array and then sync the values, but that will be error-prone
                const additionalHeaders = req[kResponseHeaders] || {};
                delete req[kResponseHeaders];
                const isInitialRequest = !req._query.sid;
                if (isInitialRequest) {
                    this.emit("initial_headers", additionalHeaders, req);
                }
                this.emit("headers", additionalHeaders, req);
                debug("writing headers: %j", additionalHeaders);
                Object.keys(additionalHeaders).forEach((key) => {
                    headersArray.push(`${key}: ${additionalHeaders[key]}`);
                });
            });
        }
    }
    cleanup() {
        if (this.ws) {
            debug("closing webSocketServer");
            this.ws.close();
            // don't delete this.ws because it can be used again if the http server starts listening again
        }
    }
    /**
     * Prepares a request by processing the query string.
     *
     * @private
     */
    prepare(req) {
        // try to leverage pre-existing `req._query` (e.g: from connect)
        if (!req._query) {
            req._query = (~req.url.indexOf("?") ? qs.parse((0, url_1.parse)(req.url).query) : {});
        }
    }
    createTransport(transportName, req) {
        return new transports_1.default[transportName](req);
    }
    /**
     * Handles an Engine.IO HTTP request.
     *
     * @param {EngineRequest} req
     * @param {ServerResponse} res
     */
    handleRequest(req, res) {
        debug('handling "%s" http request "%s"', req.method, req.url);
        this.prepare(req);
        req.res = res;
        const callback = (errorCode, errorContext) => {
            if (errorCode !== undefined) {
                this.emit("connection_error", {
                    req,
                    code: errorCode,
                    message: Server.errorMessages[errorCode],
                    context: errorContext,
                });
                abortRequest(res, errorCode, errorContext);
                return;
            }
            if (req._query.sid) {
                debug("setting new request for existing client");
                this.clients[req._query.sid].transport.onRequest(req);
            }
            else {
                const closeConnection = (errorCode, errorContext) => abortRequest(res, errorCode, errorContext);
                this.handshake(req._query.transport, req, closeConnection);
            }
        };
        this._applyMiddlewares(req, res, (err) => {
            if (err) {
                callback(Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
            }
            else {
                this.verify(req, false, callback);
            }
        });
    }
    /**
     * Handles an Engine.IO HTTP Upgrade.
     */
    handleUpgrade(req, socket, upgradeHead) {
        this.prepare(req);
        const res = new WebSocketResponse(req, socket);
        const callback = (errorCode, errorContext) => {
            if (errorCode !== undefined) {
                this.emit("connection_error", {
                    req,
                    code: errorCode,
                    message: Server.errorMessages[errorCode],
                    context: errorContext,
                });
                abortUpgrade(socket, errorCode, errorContext);
                return;
            }
            const head = Buffer.from(upgradeHead);
            upgradeHead = null;
            // some middlewares (like express-session) wait for the writeHead() call to flush their headers
            // see https://github.com/expressjs/session/blob/1010fadc2f071ddf2add94235d72224cf65159c6/index.js#L220-L244
            res.writeHead();
            // delegate to ws
            this.ws.handleUpgrade(req, socket, head, (websocket) => {
                this.onWebSocket(req, socket, websocket);
            });
        };
        this._applyMiddlewares(req, res, (err) => {
            if (err) {
                callback(Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
            }
            else {
                this.verify(req, true, callback);
            }
        });
    }
    /**
     * Called upon a ws.io connection.
     *
     * @param {ws.Socket} websocket
     * @private
     */
    onWebSocket(req, socket, websocket) {
        websocket.on("error", onUpgradeError);
        if (transports_1.default[req._query.transport] !== undefined &&
            !transports_1.default[req._query.transport].prototype.handlesUpgrades) {
            debug("transport doesnt handle upgraded requests");
            websocket.close();
            return;
        }
        // get client id
        const id = req._query.sid;
        // keep a reference to the ws.Socket
        req.websocket = websocket;
        if (id) {
            const client = this.clients[id];
            if (!client) {
                debug("upgrade attempt for closed client");
                websocket.close();
            }
            else if (client.upgrading) {
                debug("transport has already been trying to upgrade");
                websocket.close();
            }
            else if (client.upgraded) {
                debug("transport had already been upgraded");
                websocket.close();
            }
            else {
                debug("upgrading existing transport");
                // transport error handling takes over
                websocket.removeListener("error", onUpgradeError);
                const transport = this.createTransport(req._query.transport, req);
                transport.perMessageDeflate = this.opts.perMessageDeflate;
                client._maybeUpgrade(transport);
            }
        }
        else {
            const closeConnection = (errorCode, errorContext) => abortUpgrade(socket, errorCode, errorContext);
            this.handshake(req._query.transport, req, closeConnection);
        }
        function onUpgradeError() {
            debug("websocket error before upgrade");
            // websocket.close() not needed
        }
    }
    /**
     * Captures upgrade requests for a http.Server.
     *
     * @param {http.Server} server
     * @param {Object} options
     */
    attach(server, options = {}) {
        const path = this._computePath(options);
        const destroyUpgradeTimeout = options.destroyUpgradeTimeout || 1000;
        function check(req) {
            // TODO use `path === new URL(...).pathname` in the next major release (ref: https://nodejs.org/api/url.html)
            return path === req.url.slice(0, path.length);
        }
        // cache and clean up listeners
        const listeners = server.listeners("request").slice(0);
        server.removeAllListeners("request");
        server.on("close", this.close.bind(this));
        server.on("listening", this.init.bind(this));
        // add request handler
        server.on("request", (req, res) => {
            if (check(req)) {
                debug('intercepting request for path "%s"', path);
                this.handleRequest(req, res);
            }
            else {
                let i = 0;
                const l = listeners.length;
                for (; i < l; i++) {
                    listeners[i].call(server, req, res);
                }
            }
        });
        if (~this.opts.transports.indexOf("websocket")) {
            server.on("upgrade", (req, socket, head) => {
                if (check(req)) {
                    this.handleUpgrade(req, socket, head);
                }
                else if (false !== options.destroyUpgrade) {
                    // default node behavior is to disconnect when no handlers
                    // but by adding a handler, we prevent that
                    // and if no eio thing handles the upgrade
                    // then the socket needs to die!
                    setTimeout(function () {
                        // @ts-ignore
                        if (socket.writable && socket.bytesWritten <= 0) {
                            socket.on("error", (e) => {
                                debug("error while destroying upgrade: %s", e.message);
                            });
                            return socket.end();
                        }
                    }, destroyUpgradeTimeout);
                }
            });
        }
    }
}
exports.Server = Server;
/**
 * Close the HTTP long-polling request
 *
 * @param res - the response object
 * @param errorCode - the error code
 * @param errorContext - additional error context
 *
 * @private
 */
function abortRequest(res, errorCode, errorContext) {
    const statusCode = errorCode === Server.errors.FORBIDDEN ? 403 : 400;
    const message = errorContext && errorContext.message
        ? errorContext.message
        : Server.errorMessages[errorCode];
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        code: errorCode,
        message,
    }));
}
/**
 * Close the WebSocket connection
 *
 * @param {net.Socket} socket
 * @param {string} errorCode - the error code
 * @param {object} errorContext - additional error context
 */
function abortUpgrade(socket, errorCode, errorContext = {}) {
    socket.on("error", () => {
        debug("ignoring error from closed connection");
    });
    if (socket.writable) {
        const message = errorContext.message || Server.errorMessages[errorCode];
        const length = Buffer.byteLength(message);
        socket.write("HTTP/1.1 400 Bad Request\r\n" +
            "Connection: close\r\n" +
            "Content-type: text/html\r\n" +
            "Content-Length: " +
            length +
            "\r\n" +
            "\r\n" +
            message);
    }
    socket.destroy();
}
/* eslint-disable */
/**
 * From https://github.com/nodejs/node/blob/v8.4.0/lib/_http_common.js#L303-L354
 *
 * True if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 *
 * checkInvalidHeaderChar() is currently designed to be inlinable by v8,
 * so take care when making changes to the implementation so that the source
 * code size does not exceed v8's default max_inlined_source_size setting.
 **/
// prettier-ignore
const validHdrChars = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, // 0 - 15
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 32 - 47
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 48 - 63
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 80 - 95
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, // 112 - 127
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 128 ...
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 // ... 255
];
function checkInvalidHeaderChar(val) {
    val += "";
    if (val.length < 1)
        return false;
    if (!validHdrChars[val.charCodeAt(0)]) {
        debug('invalid header, index 0, char "%s"', val.charCodeAt(0));
        return true;
    }
    if (val.length < 2)
        return false;
    if (!validHdrChars[val.charCodeAt(1)]) {
        debug('invalid header, index 1, char "%s"', val.charCodeAt(1));
        return true;
    }
    if (val.length < 3)
        return false;
    if (!validHdrChars[val.charCodeAt(2)]) {
        debug('invalid header, index 2, char "%s"', val.charCodeAt(2));
        return true;
    }
    if (val.length < 4)
        return false;
    if (!validHdrChars[val.charCodeAt(3)]) {
        debug('invalid header, index 3, char "%s"', val.charCodeAt(3));
        return true;
    }
    for (let i = 4; i < val.length; ++i) {
        if (!validHdrChars[val.charCodeAt(i)]) {
            debug('invalid header, index "%i", char "%s"', i, val.charCodeAt(i));
            return true;
        }
    }
    return false;
}

