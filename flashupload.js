(function($) {
/**
 * FlashUpload derives from SWFUpoload. The copyright and copyleft will be the same as the one SWFUpload is using.
 * --------------- Copyright from SWFUpload ---------------
 * SWFUpload: http://www.swfupload.org, http://swfupload.googlecode.com
 * 
 * SWFUpload 1.0: Flash upload dialog - http://profandesign.se/swfupload/, http://www.vinterwebb.se/
 * 
 * SWFUpload is (&copy;) 2006-2007 Lars Huring, Olov Nilz n and Mammon Media and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * SWFUpload 2 is (&copy;) 2007-2008 Jake Roberts and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 * --------------- Copyright from SWFUpload -----------------
 * 
 * SWFUpload is a great upload utility, however, the code is somewhat old-fashioned and there's bugs it simply ignores.
 * It could be much better, so I decide to create a "new" class "FlashUpload", fixed bugs in SWFUpload and adding some cool stuff to it.
 * FlashUpload provides less and simpler but as powerful interfaces as SWFUpload.
 * 
 * @fileoverview This FlashUpload is the child of SWFUpload (version 2.2.0 2009-03-25) actually.
 * @author <a href="mailto:justnewbee@gmail.com">Jianchun Wang</a>
 * @requires jQuery $gt;= 1.3.2
 * @description An upload utility that uses flash to provide multiple file selection, progress feedback and other cool features.
 */
/**
 * @class
 * @name FlashUpload
 */
var FlashUpload = function() {
	this._init.apply(this, arguments);
};
$.extend(FlashUpload, /** @lends FlashUpload */{
	/**
	 * The UI template for generating a FlashUpload. The flash element here will always be transparent and fill up the outer span element.
	 * What people see is the span (only when styled or texted); transparent span can be used to "cover" visual elements on the page.
	 * @type String
	 */
	TMPL_UI: ["<span tabindex=\"-1\">",
				"${text}",
				"<object type=\"application/x-shockwave-flash\"",
						" tabindex=\"-1\"",// FF and IE will still get inside flash element when tabbing, FF traps tab, IE finally tabs out
						" id=\"${id}\"",// IE requires that flash element HAVE id to invoke ExternalInterface
						" data=\"${flashUrl}\"",
						" style=\"width: 100%; height: 100%; position: absolute; top: 0; left: 0;\">",
					"<param name=\"wmode\" value=\"transparent\" />",
					"<param name=\"quality\" value=\"high\" />",
					"<param name=\"allowScriptAccess\" value=\"always\" />",
					"<param name=\"movie\" value=\"${flashUrl}\" />",
					"<param name=\"flashvars\" value=\"${flahvars}\" />",
					"<p style=\"color: #AAA;\">${alt}</p>",
				"</object>",
			"</span>"].join(""),
	/**
	 * @namespace
	 */
	OPTS: {
		/**
		 * The flash url where you will deploy the `flashupload.swf` file.
		 * @type String
		 */
		flashUrl: "flashupload.swf",
		/**
		 * Adds "_=[TIMESTAMP]" to the flashUrl when false.
		 * @type Boolean
		 */
		cache: true,
		/**
		 * Where the UI is attached to in term of JQuery append, can be anything JQuery append accepts.
		 * @type String|Element...
		 */
		attachPoint: "body",
		/**
		 * Making it true will make the span element absolutely positioned and fill up the attachPoint.
		 * In this case you may not want to set the text option in the mean time.
		 * @type Boolean
		 */
		cover: false,
		/**
		 * The text label you want FlashUpload to display, will be HTML escaped.
		 * @type String
		 */
		text: "",
		/**
		 * Text for accessibility, can only be seen if the flash cannot be loaded.
		 * @type String
		 */
		alt: "When you see this message, the flash is not loaded or disabled.",
		/**
		 * Style the span element, width, height, color, background-color... what ever else that applies to an HTML element.
		 * @type Object
		 */
		css: null,
		/**
		 * Options given to flash provide basic validation on size, type and name, if there's more, use it for advanced validation.
		 * @type Function
		 */
		validate: null,
		// options given to flash as flashvar
		/**
		 * Enable debugging or not.
		 * @type Boolean
		 */
		debug: true,
		/**
		 * Where the files are to be uploaded, it should be set before a file is about to start uploading.
		 * @type String
		 */
		uploadUrl: "",
		/**
		 * The file data parameter name accepted by upload server, "filedata" is used as default in AS.
		 * @type String
		 */
		filedataName: "filedata",
		/**
		 * Description for allowed file types, used to change the type text in file browser window brought out by flash.
		 * The file types are also displayed in it, e.g. "Image files" for types of "png", "jpg", "bmp" will become "Image files (*.png, *.jpg, *.bmp)".
		 * @type String
		 */
		typesDescription: "All Files",
		/**
		 * Enable multiple file selection.
		 * @type Boolean
		 */
		multiple: true,
		/**
		 * Disable file selection.
		 * @type Boolean
		 */
		disabled: false,
		/**
		 * Whether the mouse cursor should be displayed as a hand (by default when `arrowCursor` is false) or arrow.
		 * @type Boolean
		 */
		arrowCursor: false,
		/**
		 * Use "GET" or "POST" (by default) mode.
		 * @type Boolean
		 */
		getMode: false,
		/**
		 * Global params you want to give to upload server alongside all files, if you want to do it only for individual files,
		 * use `addFileParam` and `removeFileParam`.
		 * @type Object
		 */
		params: null,
		/**
		 * Queue limitation, how many files can be put into the upload queue.
		 * @type Number
		 */
		queueLimit: 0,
		/**
		 * Due to some bugs in the Flash Player, server response may not be acknowledged, `assumeSuccessTimeout` is used to see
		 * if enough time has passed to fire upload success event anyway.
		 * @type Number
		 */
		assumeSuccessTimeout: 0,
		// basic validations
		/**
		 * Files larger than it will not be queued and will fire `onFileQueueError`.
		 * @type Number
		 */
		sizeMax: 0,
		/**
		 * Files smaller than it will not be queued and will fire `onFileQueueError`.
		 * @type Number
		 */
		sizeMin: 0,
		/**
		 * Used if only certain types are allowed, other files will NOT be displayed.
		 * 
		 * 
		 * flash.net.FileFilter(description:String, extension:String) will take "*.jpg;*.png*.gif;*.bmp;" for extension, I'll just make it simpler.
		 * 1. "" or [] will be "*.*"
		 * 2. Array - ["JPG", "png", "gif", "bmp"]
		 * 3. String - "JPG,png/gif;bmp", delimiter can be , or ; or /
		 * Either Array or String, each type can be only extension or with a "*." prefix, and case-insensitive.
		 * @type Array|String
		 */
		typesAllowed: "",
		/**
		 * Used if only certain types are not allowed, the files will STILL be displayed, but cannot be queued and will fire `onFileQueueError`.
		 * See `typesAllowed` for how you set this value.
		 * @type Array|String
		 */
		typesDisallowed: "",
		/**
		 * Files with name longer than it will not be queued and will fire `onFileQueueError`.
		 * @type Number
		 */
		nameMax: 0,
		/**
		 * Files with name shorter than it will not be queued and will fire `onFileQueueError`.
		 * @type Number
		 */
		nameMin: 0,
		/**
		 * Files with name containing any of these characters will not be queued and will fire `onFileQueueError`.
		 * You can put white space characters inside string as delimiter, but white space characters will NEVER be treated as illegal.
		 * @type Array|String
		 */
		nameIllegalChars: "",
		/* -- handlers -- */
		/**
		 * Default debug handler.
		 */
		onDebug: function() {
			if (!window.console) {
				return;
			}
			if ($.browser.msie) {// IE do NOT support logging object, neither console.xxx.apply, so...
				console.info(Array.prototype.join.call(arguments, " "));
			} else {// Chrome/Safari develop tool's console only works under console itself, console.info.apply(null, args) will throw "TypeError: Illegal invocation".
				console.info.apply(console, arguments);
			}
		},
		/**
		 * IE has a problem that document.title will be changed to "#..." when url has hash section "#...", the problem is from flash player ActiveX, because
		 * even if no flash is actually loaded, it still happens.
		 * The title changes when the flash finishes loads, or mousedown on the flash element.
		 * FlashUpload AS code will trigger JS `hashTitle` to inform JS of this event, users can use this event to walk by this problem.
		 * NOTE: You have to know how to get the correct title and do it only for IE.
		 * @type Function
		 */
		onHashTitle: null,
		/**
		 * Callback when flash elements finishes loads and initialization.
		 * @type Function
		 */
		onFlashReady: null,
		/**
		 * Callback when mouse enters ui element.
		 * @type Function
		 */
		onMouseEnter: null,
		/**
		 * Callback when mouse moves out of ui element.
		 * @type Function
		 */
		onMouseLeave: null,
		/**
		 * Callback right before file browser window opens, return false to prevent it from being opened.
		 * @type Function
		 */
		onBrowseBeforeStart: null,
		/**
		 * Callback when file window opens.
		 * @type Function
		 */
		onBrowseStart: null,
		/**
		 * Flash doesn't allow triggering multiple file window for one instance, if user clicks and hopes to see a file window pop up when
		 * there's one already (only maybe it's hanging behind the scene), this event will fire instead of onBrowseStart.
		 * NOTE this can only happen in non-ie browsers, IE treats the file window as modal dialog which disables IE until the file window closes.
		 * @type Function
		 */
		onBrowseException: null,
		/**
		 * Callback when file window closes.
		 * @type Function
		 */
		onBrowseEnd: null,
		/**
		 * Callback when a file is successfully added to the queue, fired before `onBrowseEnd`.
		 * @type Function
		 * @param {Object} file
		 */
		onFileQueued: null,
		/**
		 * Callback when a file fails validation and cannot be queued, fired before `onBrowseEnd`.
		 * @type Function
		 * @param {Object} file
		 * @param {Array} errors An array of objects { name:String, message: String }-s.
		 */
		onFileQueueError: null,
		/**
		 * Callback when a file starts uploading.
		 * @type Function
		 * @param {Object} file
		 */
		onFileUploadStart: null,
		/**
		 * Callback when progress information comes after a file starts upload, this events fires multiple times.
		 * @type Function
		 * @param {Object} file
		 * @param {Number} bytes How many bytes have been uploaded.
		 */
		onFileUploadProgress: null,
		/**
		 * Callback when file upload succeeds.
		 * @type Function
		 * @param {Object} file
		 * @param {Object} serverData If it's an assumed success, it will be an empty string.
		 * @param {Object} responseReceived The success is assumed after waiting for `options.assumeSuccessTimeout` will give `responseReceived` false.
		 */
		onFileUploadSuccess: null,
		/**
		 * Callback when file upload fails.
		 * @type Function
		 * @param {Object} file
		 * @param {Array} errors
		 */
		onFileUploadError: null,
		/**
		 * Callback when file finishes uploading (succeeded or failed).
		 * @type Function
		 * @param {Object} file
		 */
		onFileUploadComplete: null
	},
	
	ERR: {// only used outside, so no message as in HtmlUpload
		SIZE_ZERO: "SizeZero",
		SIZE_INACCESSIBLE: "SizeInaccessible",
		SIZE_TOO_BIG: "SizeTooBig",
		SIZE_TOO_SMALL: "SizeTooSmall",
		TYPE_INVALID: "TypeInvalid",
		NAME_INVALID: "NameInvalid",
		NAME_TOO_LONG: "NameTooLong",
		NAME_TOO_SHORT: "NameTooShort",
		QUEUE_FULL: "QueueFull",
		FILE_NOT_FOUND: "FileNotFound",
		MISSING_UPLAOD_URL: "MissingUploadUrl",
		HTTP_ERROR: "HttpError",
		IO_ERROR: "IOError",
		SECURITY_ERROR: "SecurityError",
		UPLOAD_FAIL: "UploadFail",
		CANCELLED: "Cancelled"
	},
	
	STATUS: {
		QUEUED : "queued",
		UPLOADING : "uploading",
		UPLOADED : "uploaded",
		ERROR : "error",
		CANCELLED : "cancelled"
	},
	
	_instances: {},
	
	_uuid: (function() {
		var id = 0;
		return function() {
			return "flashuload_" + id++;
		};
	})(),
	/**
	 * Replace place-holders inside a string with an object, adopted from mootools.
	 * @param {String} str The string with place holders.
	 * @param {Object} obj The key/value pairs used to substitute a string.
	 */
	_substitute: function(str, obj) {
		return (str || "").replace(/\\?\$\{([^{}]+)\}/g, function(match, key) {
			if (match.charAt(0) == "\\") {
				return match.slice(1);
			}
			return (obj[key] !== undefined) ? obj[key] : "";
		});
	},
	/**
	 * Encode HTML.
	 * @param str
	 * @returns {String}
	 */
	_htmlEncode: function(str) {
		return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ {2}/g, " &nbsp;");
	},
	/**
	 * The only interface exposed to AS. Every JS call is now in safe hands, this gets rid of
	 * IE's recurring "Object required" error when flash is removed from dom without destroying.
	 * @param {String} id
	 * @param {String} fn
	 * @param {Array} [args]
	 */
	callByFlash: function(id, fn, args) {
		var flashupload = FlashUpload._instances[id];
		if (flashupload) {
			return FlashUpload.CALLED_BY_FLASH[fn].apply(flashupload, args);
		}
	},
	/**
	 * Functions that will be called by Flash, DONOT rename them without changing AS code.
	 * In all these functions, "this" is FlashUpload instance.
	 * @namespace
	 */
	CALLED_BY_FLASH: {
		/**
		 * Check if JS can work in Flash (test if ExternalInterface is working).
		 * @returns {Boolean}
		 */
		testExternalInterface: function() {
			return this._callFlash("TestExternalInterface") || false;
		},
		/**
		 * Do advanced validation if basic validation provided by options (size, type, name) cannot suite your needs.
		 * @param {Object} file
		 * @returns {String}
		 */
		validate: function(file) {
			if (this._options.validate) {// return error string if the file object cannot pass validation
				return this._options.validate.apply(this, arguments);
			}
		},
		/**
		 * Invoked when the flash element finishes loading and invoke all the flash calls before ready.
		 */
		flashReady: function() {
			this._cleanup();
			this._ready = true;
			this._queueEvent("onFlashReady");
			if (this._unreadyFlashCalls) {
				var flashCall = this._unreadyFlashCalls.shift();
				while (flashCall) {
					this._callFlash(flashCall.funcName, flashCall.argArr);
					flashCall = this._unreadyFlashCalls.shift();
				}
				this._unreadyFlashCalls = null;
			}
		},
		/**
		 * Called by Flash each time the ExternalInterface functions are created.
		 */
		cleanup: function() {
			this._cleanup();
		},
		/**
		 * Try to fix IE title change bug when there's hash (#...) in url.
		 */
		hashTitle: function() {
			if (!$.browser.msie) {
				return;
			}
			this._queueEvent("onHashTitle");
		},
		/**
		 * Called before file browse window opens, return false in `onBrowseBeforeStart` to prevent it from being opened.
		 * @returns {Boolean}
		 */
		browseBeforeStart: function() {
			var callback = this._options.onBrowseBeforeStart;
			if (callback) {
				return callback.apply(this, arguments);
			}
		},
		/**
		 * This is a chance to do something when the browse window opens
		 */
		browseStart: function() {
			this._queueEvent("onBrowseStart");
		},
		/**
		 * For non-IE browsers, the file browser window is not an model dialog, user can click on the page regardless of it hanging there.
		 * For flash, it never allows triggering another file browser window when there's one already.
		 * Here we provide a chance to do something under this situation like giving some "smart" hint around the upload element.
		 */
		browseException: function() {
			this._queueEvent("onBrowseException");
		},
		/**
		 * Called after the file dialog has closed and the selected files are queued (or fail to be queued).
		 * You could call `startUpload` here if you want the queued files to begin uploading immediately.
		 * @param {Number} selectNum
		 * @param {Number} queuedNum
		 * @param {Number} totalQueuedNum
		 */
		browseEnd: function(selectNum, queuedNum, totalQueuedNum) {
			this._getUI().focus();
			this._queueEvent("onBrowseEnd", [selectNum, queuedNum, totalQueuedNum]);
		},
		/**
		 * Called on each file event, merged due to that old ones act in the same manner `this._queueEvent("onFileXxx", );`.
		 * @param {String} onFileXxx The callback event name.
		 * @param {Object} file
		 * @param {...} other_args
		 */
		handleFileEvent: function(/*onFileXxx, file[, ...other_args]*/) {
			var args = Array.prototype.slice.apply(arguments, [0]),
				onFileXxx = args.shift();
			
			this._queueEvent(onFileXxx, args);
		},
		/**
		 * Called by FlashUpload JS and AS functions when debug is enabled. Those message from AS will be tagged with wording "(FLASH)".
		 * The messages will be written to console (if exists) by default. You can override this event and have messages written where you want.
		 * @param {...}
		 */
		log: function() {
			this._log.apply(this, arguments);
		}
	}
});
$.extend(FlashUpload.prototype, /** @lends FlashUpload.prototype */{
	/**
	 * The id for the movie.
	 * @type String
	 */
	_id: "",
	/**
	 * Holds the options object.
	 */
	_options: null,
	/**
	 * An array to cache all the event calls.
	 * @type Array
	 */
	_eventQueue: null,
	/**
	 * To indicate that flash is ready, set in method "flashReady".
	 * @type Boolean
	 */
	_ready: false,
	/**
	 * Store "_callFlash" before flash is ready.
	 * @type Array
	 */
	_unreadyFlashCalls: null,
	/**
	 * Used by constructor.
	 * @param {Object} settings
	 */
	_init: function(opts) {
		var id = FlashUpload._uuid(),
			options = $.extend({}, FlashUpload.OPTS, opts);
		
		if (!options.cache || $.browser.msie) {// IE has problem with flash cache (repeating "ExternalInterface Reinitialized"), see http://www.swfupload.org/forum/generaldiscussion/2159
			options.flashUrl = options.flashUrl + (options.flashUrl.indexOf("?") < 0 ? "?" : "&") + "_=" + new Date().getTime();
		}
		
		options.params = options.params || {};
		
		this._id = id;
		this._options = options;
		this._eventQueue = [];
		
		// load flash
		var movie = this._getMovieElement();
		if (movie) {
			this._log("(JS) EXCEPTION: cannot add the flash movie because movie id is already taken!");
			return;
		}
		
		var attachPoint = $(options.attachPoint);// Get the element where we will be placing the flash movie
		if (!attachPoint.length) {
			this._log("(JS) EXCEPTION: cannot find the attachPoint element!");
			return;
		}
		
		this._getUI(attachPoint);
		FlashUpload._instances[id] = this;// Setup global control tracking
		this._log("(JS) Created!", options);
	},
	/**
	 * Removes Flash added functions to the DOM node to prevent memory leaks in IE.
	 */
	_cleanup: function() {
		var movie = this._getMovieElement();
		if (!movie) {
			return;
		}
		
		window.__flash__removeCallback = function(instance, name) {// Fix flash's own cleanup code so if the SWF movie was removed from the page it doesn't display errors.
			if (instance) {
				instance[name] = null;
			}
		};
		
		// Pro-actively unhook all the Flash functions
		if (typeof movie.CallFunction === "unknown") {
			this._log("(JS) Removing Flash functions hooks (this should only run in IE to prevent memory leaks).");
			for (var k in movie) {
				try {// You have to try.. catch, in IE, getting "filters" will throw "Unspecified error".
					if (typeof movie[k] === "function") {
						movie[k] = null;
					}
				} catch (ex) {}
			}
		}
	},
	/**
	 * JS side logging.
	 */
	_log: function() {
		if (this._options.debug && arguments.length) {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift("[FlashUpload] " + this._id);
			this._queueEvent("onDebug", args);
		}
	},
	/* -------------------- PRIVATE -------------------- */
	/**
	 * Retrieves the DOM reference to the Flash element added by FlashUpload.
	 * @returns {DOMNode}
	 */
	_getMovieElement: function() {
		return $("#" + this._id)[0];
	},
	/**
	 * Get UI as JQNode.
	 * @param {JQNode} [attachPoint] Where to put the UI, if provided, UI will be created when not found.
	 * @returns JQNode || null
	 */
	_getUI: function(attachPoint) {
		var $ui = $("#" + this._id).parent();
		if ($ui.length) {
			return $ui;
		}
		if (!attachPoint) {
			return null;
		}
		
		var $attachPoint = $(attachPoint),
			options = this._options,
			params = options.params,
			paramPairs = [];
		
		if (params) {
			for (var k in params) {
				if (params.hasOwnProperty(k)) {
					paramPairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
				}
			}
		}
		
		var flahvars = ["jsCall=", encodeURIComponent("FlashUpload.callByFlash"),
				"&amp;id=", encodeURIComponent(this._id),
				"&amp;uploadUrl=", encodeURIComponent(options.uploadUrl),
				"&amp;filedataName=", encodeURIComponent(options.filedataName),
				"&amp;typesDescription=", encodeURIComponent(options.typesDescription),
				"&amp;queueLimit=", encodeURIComponent(options.queueLimit),
				"&amp;assumeSuccessTimeout=", encodeURIComponent(options.assumeSuccessTimeout),
				"&amp;debug=", encodeURIComponent(options.debug),
				"&amp;multiple=", encodeURIComponent(options.multiple),
				"&amp;disabled=", encodeURIComponent(options.disabled),
				"&amp;arrowCursor=", encodeURIComponent(options.arrowCursor),
				"&amp;getMode=", encodeURIComponent(options.getMode),
				"&amp;sizeMax=", encodeURIComponent(options.sizeMax),
				"&amp;sizeMin=", encodeURIComponent(options.sizeMin),
				"&amp;typesAllowed=", encodeURIComponent($.isArray(options.typesAllowed) ? options.typesAllowed.join(",") : options.typesAllowed),
				"&amp;typesDisallowed=", encodeURIComponent($.isArray(options.typesDisallowed) ? options.typesDisallowed.join(",") : options.typesDisallowed),
				"&amp;nameMax=", encodeURIComponent(options.nameMax),
				"&amp;nameMin=", encodeURIComponent(options.nameMin),
				"&amp;nameIllegalChars=", encodeURIComponent($.isArray(options.nameIllegalChars) ? options.nameIllegalChars.join("") : options.nameIllegalChars),
				"&amp;params=", encodeURIComponent(paramPairs.join("&amp;"))].join("");
		
		$ui = $(FlashUpload._substitute(FlashUpload.TMPL_UI, {
				text: FlashUpload._htmlEncode(options.text),
				alt: FlashUpload._htmlEncode(options.alt),
				id: this._id,
				flashUrl: options.flashUrl,
				flahvars: flahvars
			})).css($.extend({
				display: "inline-block",
				position: "relative"
			}, options.css));
		
		if (options.cover) {
			if ($.inArray($attachPoint.css("position"), ["absolute", "relative", "fixed"]) < 0) {
				$attachPoint.css("position", "relative");
			}
			$ui.css({
				position: "absolute",
				top: 0,
				left: 0,
				width: $attachPoint.outerWidth(),
				height: $attachPoint.outerHeight()
			});
		}
		
		var _this = this;
		return $ui.bind("mouseenter", function() {
			if (options.onMouseEnter) {
				options.onMouseEnter.call(_this);
			}
		}).bind("mouseleave", function() {
			if (options.onMouseLeave) {
				options.onMouseLeave.call(_this);
			}
		}).appendTo($attachPoint);
	},
	/**
	 * Handle function calls made to the Flash element.
	 * Calls are made with a setTimeout for some functions to work around bugs in the ExternalInterface library.
	 * @param {String} funcName
	 * @param {Array} [argArr]
	 */
	_callFlash: function(funcName, argArr) {
		var movie = this._getMovieElement();
		
		if (!movie) {
			this._log("(JS) EXCEPTION: Could not find Flash element when call flash function \"" + funcName + "\"");
			return;
		}
		
		if (!this._ready) {
			this._unreadyFlashCalls = this._unreadyFlashCalls || [];
			this._unreadyFlashCalls.push({
				funcName: funcName,
				argArr: argArr
			});
		} else {// really call flash
			var returnValue, returnString;
			try {// Flash's method if calling ExternalInterface methods (adopted from MooTools).
				returnString = movie.CallFunction("<invoke name=\"" + funcName + "\" returntype=\"javascript\">" + __flash__argumentsToXML(argArr || [], 0) + "</invoke>");
				returnValue = eval(returnString);
			} catch (ex) {
				this._log("(JS) EXCEPTION: Fail to call flash \"" + funcName + "\": " + ex.message);
			}
			
			return returnValue;
		}
	},
	/**
	 * ExternalInterface library is buggy so the event calls are added to a queue and executed by a setTimeout.
	 * This ensures that events are executed in a determinate order so the ExternalInterface bug is avoided.
	 * WARNING: Don't call `this._log` inside here or you'll create an infinite loop.
	 * 
	 * @param {String} handlerName
	 * @param {Array} [args]
	 */
	_queueEvent: function(handlerName, args) {
		var handler = this._options[handlerName];
		
		if (handler) {
			var eventQueue = this._eventQueue;
			
			eventQueue.push({
				ctx: this,
				fn: handler,
				args: args || []
			});
			setTimeout(function() {// execute next event in the queue
				var o = eventQueue.shift();
				if (o) {
					o.fn.apply(o.ctx, o.args);
				}
			}, 0);
		}
	},
	/**
	 * Coordinate the ui with w/h sizes and x/y positions.
	 * @param {Object} whlt Object containing width, height, left and top
	 */
	coords: function(whlt) {
		var $ui = this._getUI();
		if ($ui) {
			$ui.css(whlt);
		}
	},
	/**
	 * Used to remove a FlashUpload instance from the page.
	 * This method strives to remove all references to the SWF, and other objects so memory is properly freed.
	 * @return {Booelan} true if everything was destroyed; false if a failure occurs leaving FlashUpload in an inconsistant state.
	 */
	destroy: function() {
		var $ui = this._getUI(),
			movie = this._getMovieElement();
		if (!$ui || movie) {
			return true;
		}
		
		try {
			this.cancelUpload(null, false);// Make sure Flash is done before we try to remove it
			this._callFlash("Destroy");// It's mandatory that this method is called here to avoid recurring JS error in IE
			
			if (typeof movie.CallFunction === "unknown") {// We only want to do this in IE (DOM/JS IE 6/7 memory leak workaround)
				for (var k in movie) {// Loop through all the movie's properties and remove all function references
					try {
						if (typeof movie[k] === "function") {
							movie[k] = null;
						}
					} catch (ex1) {}
				}
			}
			
			// Destroy other references
			FlashUpload._instances[this._id] = null;
			delete FlashUpload._instances[this._id];
			
			this._options = null;
			this._eventQueue = null;
			
			$ui.remove();// Remove the movie element from the page
			return true;
		} catch (ex) {
			return false;
		}
	},
	/* ----------- Flash controling -----------
	 * Your UI should use these to operate FlashUpload
	 * NOTE that all AS interfaces exposed to JS are named capitalized like XxxYyy.
	 * --------------------------------------------*/
	/**
	 * @deprecated
	 * Calls for a File Selection Dialog window to appear.
	 * 
	 * WARNING: This function does not work in Flash Player 10.
	 * Flash Bug Warning for multiple selection: Flash limits the number of selectable files based on the combined length of the file names.
	 * If the selection name length is too long the dialog will fail in an unpredictable manner.
	 * There is no work-around for this bug.
	 */
	browse: function() {
		this._callFlash("Browse");
	},
	/**
	 * Starts uploading the first file in the queue unless the optional parameter "fileID" specifies the ID.
	 * @param {String} fileID
	 */
	startUpload: function(fileID) {
		this._callFlash("StartUpload", [fileID]);
	},
	/**
	 * Cancel any queued file.
	 * @param {String|Number} fileID The file ID or index. If you do not specify a fileID the current uploading file or first file in the queue is cancelled.
	 * @param {Boolean} triggerErrorEvent If you do not want `onFileUploadError` event to trigger you can specify false for the triggerErrorEvent parameter.
	 */
	cancelUpload: function(fileID, triggerErrorEvent) {
		this._callFlash("CancelUpload", [fileID, triggerErrorEvent !== false]);
	},
	/**
	 * Used to cancel all.
	 * @param {Boolean} triggerErrorEvent Same as in cancelUpload
	 */
	cancelQueue: function(triggerErrorEvent) {
		this._callFlash("CancelQueue", [triggerErrorEvent !== false]);
	},
	/**
	 * Getting/Setting option.
	 */
	option: function() {
		var name = arguments[0],
			val = arguments[1];
		if (!arguments.length) {
			return this._options;
		} else if (arguments.length === 1) {// getter
			return this._options[name];
		} else {// setter, only pre-defined and none-event option can be set
			if (!FlashUpload.OPTS.hasOwnProperty(name) || /^on[A-Z]/.test(name)) {
				return;
			}
			
			this._options[name] = val;
			this._callFlash("SetOption", [name, val]);
		}
	},
	/**
	 * Retrieve a file object by ID or Index.
	 * @param {String|Number} fileID
	 * @return {Object} file or null
	 */
	getFile: function(fileID) {
		return this._callFlash("GetFile", [fileID]);
	},
	/**
	 * Set a name/value pair that will be posted with the file specified by the Files ID.
	 * If the name already exists then the exiting value will be overwritten.
	 * @param {String|Number} fileID
	 * @param {String} name
	 * @param {Anything} value
	 */
	addFileParam: function(fileID, name, value) {
		return this._callFlash("AddFileParam", [fileID, name, value]);
	},
	/**
	 * Remove a previously set (by addFileParam) name/value pair from the specified file.
	 * @param {String|Number} fileID
	 * @param {String} name
	 */
	removeFileParam: function(fileID, name) {
		this._callFlash("RemoveFileParam", [fileID, name]);
	},
	/**
	 * Add post name/value pair. Each name can have only one value.
	 * @param {String} name
	 * @param {Anything} value
	 */
	addParam: function(name, value) {
		this._options.params[name] = value;
		this.option("params", this._options.params);
	},
	/**
	 * Delete post name/value pair.
	 * @param {String} name
	 */
	removeParam: function(name) {
		delete this._options.params[name];
		this.option("params", this._options.params);
	}
});

// export
window.FlashUpload = FlashUpload;
})(jQuery);