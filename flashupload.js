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
 * For the sake of adapting to jQuery framework and fixing bugs, both JS and AS are modified vastly.
 * It worked fine all the way... until a new requirement came that different HTML node may use one single SWFUpload. It's hard for SWFUpload to handle that task.
 * Since SWFUpload has been working well, I decide to create a "new" class "FlashUpload" in which code is modified more throughly not only to fit my own style,
 * but to make the code smaller and smarter.
 * 
 * Fixed bugs:
 * 1. Recurring JS error when destroy in IE - add "Destroy" in flash, and invoke it in JS "destroy"
 * 2. Repeating "ExternalInterface Reinitialized" in IE - force to load flash without cache
 * 3. Tab trapping - tabindex -1 for flash object, and handle keydown of tab in flash to try to move focus back to browser
 * 4. Error occurs if invoking "CallFlash" before ready - cache "CallFlash" before flash is ready, and invokde when ready
 * 5. IE title problem when there's "#" in url - add "onHashTitle" event
 * 6. File size NaN error - file larger than 4GB will not be processed by flash
 * 
 * Known issue:
 * 1. Firefox cannot restore focus from flash https://addons.mozilla.org/en-US/firefox/addon/restore-window-focus-after-fla/ (unsolvable)
 * 
 * @fileoverview This FlashUpload is the child of SWFUpload (version 2.2.0 2009-03-25) actually.
 * @author <a href="mailto:jiancwan@cisco.com">Jianchun Wang</a>
 * @requires jQuery $gt;= 1.3.2
 * @description <h3>Change History:</h3>
 * <ul>
 *   <li><b>1.0.0 [2011-10-25/Jianchun]:</b> One year later, rewrite again (last time I rewrote it is 2011-10-23).</li>
 *   <li><b>1.0.1 [2012-01-17/Jianchun]:</b> Make file objects support multiple errors (because it happens in real life). PS. My baby girl is 10 days old this day :).</li>
 * </ul>
 */
// internal classes/objects definition
var FlashUpload = function(opts) {
	this._init(opts);
};
/**
 * @class FlashUpload
 * @param {Object} opts See defaults below.
 */
window.FlashUpload = FlashUpload;
$.extend(FlashUpload, /** @lends FlashUpload */{
	OPTS: {
		doc: null,// IE7 won't report "invalid argument" when manipulating DOM in iframe document while using jquery from parent
		text: "",
		flashUrl: "flashupload.swf",
		nocache: false,
		attachPoint: "body",
		cover: false,
		css: null,
		validate: null,
		/* -- options given to flash -- */
		uploadUrl: "",
		filedataName: "",
		typesDescription: "All Files",
		debug: true,
		multiple: true,
		disabled: false,
		arrowCursor: false,
		useQueryString: false,
		httpSuccess: null,// array
		postParams: null,// object
		queueLimit: 0,
		assumeSuccessTimeout: 0,
		// basic validation
		sizeMax: 0,
		sizeMin: 0,
		/**
		 * flash.net.FileFilter(description:String, extension:String) will take "*.jpg;*.png*.gif;*.bmp;" for extension, I'll just make it simpler.
		 * 1. "" or [] will be "*.*"
		 * 2. Array - ["JPG", "png", "gif", "bmp"]
		 * 3. String - "JPG,png/gif;bmp", delimiter can be , or ; or /
		 * Either Array or String, each type can be only extension or with a "*." prefix, and case-insensitive.
		 * @type Array|String
		 */
		typesAllowed: "",
		typesDisallowed: "",
		nameMax: 0,
		nameMin: 0,
		nameIllegalChars: "",
		/* -- handlers -- */
		onDebug: null,
		onHashTitle: null,
		onFlashReady: null,
		onMouseEnter: null,
		onMouseLeave: null,
		onBrowseBeforeStart: null,
		onBrowseStart: null,
		onBrowseException: null,
		onBrowseEnd: null,
		onFileQueued: null,
		onFileQueueError: null,
		onFileUploadStart: null,
		onFileUploadProgress: null,
		onFileUploadError: null,
		onFileUploadSuccess: null,
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
	
	FILE_STATUS: {
		QUEUED: -1,
		IN_PROGRESS: -2,
		ERROR: -3,
		COMPLETE: -4,
		CANCELLED: -5
	},
	
	HANDLERS: {// default event handlers, "this" is FlashUpload instance
		/**
		 * The default onDebug.
		 * If you want to print debug messages call the "log(*...)" function.
		 */
		debug: function() {
			if (!window.console) {
				return;
			}
			if ($.browser.msie) {// IE do NOT support logging object, neither console.xxx.apply, so...
				console.info(Array.prototype.join.call(arguments, " "));
			} else {// Chrome/Safari develop tool's console only works under console itself, console.info.apply(null, args) will throw "TypeError: Illegal invocation".
				console.info.apply(console, arguments);
			}
		}
	},
	
	_instances: {},
	
	_uuid: (function() {
		var id = 0;
		return function() {
			return "flashuload_" + id++;
		};
	})(),
	/**
	 * The xxxCallback-s are removed now from AS. AS only interacts with JS using this interface.
	 * Every JS call is now in safe hands, this gids rid of IE's recurring "Object required" error when flash is removed from dom without desroying.
	 * Parameters will be movieName, fn, ...(params for fn)
	 */
	callByAS: function() {
		var args = Array.prototype.slice.call(arguments, 0),
			movieName = args.shift(),
			fn = args.shift(),
			flashupload = FlashUpload._instances[movieName];
		
		if (flashupload) {
			return flashupload[fn].apply(flashupload, args);
		}
	}
});
$.extend(FlashUpload.prototype, /** @lends FlashUpload.prototype */{
	/**
	 * The id for the movie.
	 * @type String
	 */
	_movieName: "",
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
		var movieName = FlashUpload._uuid(),
			options = $.extend({}, FlashUpload.OPTS, opts);
		
		if (options.debug) {
			options.onDebug = options.onDebug || FlashUpload.HANDLERS.debug;
		} else {
			delete options.onDebug;
		}
		
		if (options.nocache || $.browser.msie) {// IE has problem with flash cache (repeating "ExternalInterface Reinitialized"), see http://www.swfupload.org/forum/generaldiscussion/2159
			options.flashUrl = options.flashUrl + (options.flashUrl.indexOf("?") < 0 ? "?" : "&") + "nocache=" + new Date().getTime();
		}
		
		options.postParams = options.postParams || {};
		options.httpSuccess = options.httpSuccess || [];
		
		this._movieName = movieName;
		this._options = options;
		this._eventQueue = [];
		
		// load flash
		var movie = this._getMovieElement();
		if (movie) {
			this.log("(JS) EXCEPTION: cannot add the flash movie because movie id is already taken!");
			return;
		}
		
		var attachPoint = $(options.attachPoint);// Get the element where we will be placing the flash movie
		if (!attachPoint.length) {
			this.log("(JS) EXCEPTION: cannot find the attachPoint element!");
			return;
		}
		
		this._getUI(attachPoint);
		FlashUpload._instances[movieName] = this;// Setup global control tracking
		this.log("(JS) Created!", options);
	},
	/* -------------------- PRIVATE -------------------- */
	/**
	 * Retrieves the DOM reference to the Flash element added by FlashUpload.
	 * @returns {DOMNode}
	 */
	_getMovieElement: function() {
		return $("#" + this._movieName)[0];
	},
	/**
	 * Get UI as JQNode.
	 * @param {JQNode} [attachPoint] Where to put the UI, if provided, UI will be created when not found.
	 * @returns JQNode || null
	 */
	_getUI: function(attachPoint) {
		var $ui = $("#" + this._movieName).parent();
		if ($ui.length) {
			return $ui;
		}
		if (!attachPoint) {
			return null;
		}
		
		var $attachPoint = $(attachPoint),
			options = this._options,
			paramPairs = [];
		
		if (options.postParams) {
			for (var k in options.postParams) {
				if (options.postParams.hasOwnProperty(k)) {
					paramPairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(postParams[k]));
				}
			}
		}
		
		var flahVarsStr = ["jsCall=", encodeURIComponent("FlashUpload.callByAS"),
				"&amp;movieName=", encodeURIComponent(this._movieName),
				"&amp;uploadUrl=", encodeURIComponent(options.uploadUrl),
				"&amp;filedataName=", encodeURIComponent(options.filedataName),
				"&amp;typesDescription=", encodeURIComponent(options.typesDescription),
				"&amp;httpSuccess=", encodeURIComponent(options.httpSuccess.join(",")),
				"&amp;queueLimit=", encodeURIComponent(options.queueLimit),
				"&amp;assumeSuccessTimeout=", encodeURIComponent(options.assumeSuccessTimeout),
				
				"&amp;debug=", encodeURIComponent(options.debug),
				"&amp;multiple=", encodeURIComponent(options.multiple),
				"&amp;disabled=", encodeURIComponent(options.disabled),
				"&amp;arrowCursor=", encodeURIComponent(options.arrowCursor),
				"&amp;useQueryString=", encodeURIComponent(options.useQueryString),
				
				"&amp;sizeMax=", encodeURIComponent(options.sizeMax),
				"&amp;sizeMin=", encodeURIComponent(options.sizeMin),
				"&amp;typesAllowed=", encodeURIComponent($.isArray(options.typesAllowed) ? options.typesAllowed.join(",") : options.typesAllowed),
				"&amp;typesDisallowed=", encodeURIComponent($.isArray(options.typesDisallowed) ? options.typesDisallowed.join(",") : options.typesDisallowed),
				"&amp;nameMax=", encodeURIComponent(options.nameMax),
				"&amp;nameMin=", encodeURIComponent(options.nameMin),
				"&amp;nameIllegalChars=", encodeURIComponent($.isArray(options.nameIllegalChars) ? options.nameIllegalChars.join("") : options.nameIllegalChars),
				
				"&amp;postParams=", encodeURIComponent(paramPairs.join("&amp;"))].join("");
		
		$ui = $(["<span tabindex=\"-1\" class=\"nb-flashupload\">",
					options.text,
					"<object type=\"application/x-shockwave-flash\" ",
							"id=\"", this._movieName, "\" ",// IE requires that flash element HAVE id to invoke ExternalInterface
							"tabindex=\"-1\" ",// FF and IE will still get in the object when tabbing, FF will trap tab, IE will tab out
							"data=\"", options.flashUrl, "\" ",
							"style=\"width: 100%; height: 100%; position: absolute; top: 0; left: 0;\">",
					"<param name=\"wmode\" value=\"transparent\" />",
					"<param name=\"quality\" value=\"high\" />",
					"<param name=\"allowScriptAccess\" value=\"always\" />",
					"<param name=\"movie\" value=\"", options.flashUrl, "\" />",
					"<param name=\"flashvars\" value=\"", flahVarsStr, "\" />",
					"<p>When you see this message, the flash is not loaded or disabled.</p>",
				"</object>",
			"</span>"].join(""), options.doc).css($.extend({
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
	 * @private
	 * @param {String} funcName
	 * @param {Array} argArr
	 */
	_callFlash: function(funcName, argArr) {
		var movie = this._getMovieElement();
		
		if (!movie) {
			this.log("(JS) EXCEPTION: Could not find Flash element when call flash function \"" + funcName + "\"");
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
				this.log("(JS) EXCEPTION: Fail to call flash \"" + funcName + "\": " + ex.message);
			}
			
			if (returnValue && typeof returnValue.post === "object") {// Unescape file post param values
				this._unescapeFilePost(returnValue);
			}
			
			return returnValue;
		}
	},
	/**
	 * WARNING: Don't call this.log inside here or you'll create an infinite loop.
	 * 
	 * @param {String} handlerName
	 * @param {Array} [args]
	 */
	_queueEvent: function(handlerName, args) {
		var handler = this._options[handlerName];
		
		if (handler) {
			var _this = this,
				eventQueue = this._eventQueue;
			// ExternalInterface library is buggy so the event calls are added to a queue and executed by a setTimeout.
			// This ensures that events are executed in a determinate order so the ExternalInterface bug is avoided.
			eventQueue.push({
				fn: handler,
				args: args || []
			});
			setTimeout(function() {// execute next event in the queue
				var o = eventQueue.shift();
				if (o) {
					o.fn.apply(_this, o.args);
				}
			}, 0);
		}
	},
	/**
	 * Part of a work-around for a flash bug where objects passed through ExternalInterface cannot have
	 * properties that contain characters that are not valid for JavaScript identifiers.
	 * To work around this the Flash Component escapes the parameter names and we must unescape again before passing them along.
	 */
	_unescapeFilePost: function(file) {
		if (!file || !file.post) {
			return;
		}
		
		var regX = /[$]([0-9a-f]{4})/i,
			unescapedPost = {},
			k, uk, match;
		for (k in file.post) {
			if (file.post.hasOwnProperty(k)) {
				uk = k;
				while ((match = regX.exec(uk)) !== null) {
					uk = uk.replace(match[0], String.fromCharCode(parseInt("0x" + match[1], 16)));
				}
				unescapedPost[uk] = file.post[k];
			}
		}
		
		file.post = unescapedPost;
	},
	/* ---------------------- PUBLIC ---------------------- */
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
			FlashUpload._instances[this._movieName] = null;
			delete FlashUpload._instances[this._movieName];
			
			this._options = null;
			this._eventQueue = null;
			
			$ui.remove();// Remove the movie element from the page
			return true;
		} catch (ex) {
			return false;
		}
	},
	/* ----------- Flash control methods -----------
	 * Your UI should use these to operate FlashUpload
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
	 * @param {Boolean} triggerErrorEvent If you do not want the fileUploadError event to trigger you can specify false for the triggerErrorEvent parameter.
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
	/* ------------- Settings methods -------------
	 * These methods change the FlashUpload settings.
	 * FlashUpload settings should not be changed directly on the settings object,
	 * since many of the settings need to be passed to Flash in order to take effect.
	 * --------------------------------------------*/
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
	 * Retrieve a File object by ID or Index.
	 * @param {String} fileID
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
	addPostParam: function(name, value) {
		this._options.postParams[name] = value;
		this.option("postParams", this._options.postParams);
	},
	/**
	 * Delete post name/value pair.
	 * @param {String} name
	 */
	removePostParam: function(name) {
		delete this._options.postParams[name];
		this.option("postParams", this._options.postParams);
	},
	/* -------------- Flash JS-side Callbacks --------------
	 * Below are private, however, since they're bound by AS, don't rename them without changing AS code.
	 * --------------------------------------------------- */
	/**
	 * Called by Flash to see if JS can call in to Flash (test if External Interface is working).
	 * @private
	 */
	testExternalInterface: function() {
		return this._callFlash("TestExternalInterface") || false;
	},
	/**
	 * Called by Flash after all internal validation check (size, type, name) is done.
	 * Use the initial validations first, if they can
	 * @returns {String}
	 * @private
	 */
	validate: function(file) {
		if (this._options.validate) {
			return this._options.validate.apply(this, arguments);
		}
	},
	/**
	 * NOTE: This event is called by Flash when it has finished loading.
	 * Use the "onFlashReady" event handler to execute custom code when FlashUpload has loaded.
	 * @private
	 */
	flashReady: function() {
		this.cleanup();
		this._queueEvent("onFlashReady");
		this._ready = true;
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
	 * Removes Flash added fuctions to the DOM node to prevent memory leaks in IE.
	 * This function is called by Flash each time the ExternalInterface functions are created.
	 * @private
	 */
	cleanup: function() {
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
			this.log("(JS) Removing Flash functions hooks (this should only run in IE to prevent memory leaks).");
			for (var k in movie) {
				try {// You have to try.. catch, in IE, getting "filters" will sometime throw "Unspecified error".
					if (typeof movie[k] === "function") {
						movie[k] = null;
					}
				} catch (ex) {}
			}
		}
	},
	/**
	 * Try to fix IE title change bug when there's # in url.
	 */
	hashTitle: function() {
		if (!$.browser.msie) {
			return;
		}
		var movie = this._getMovieElement();
		if (!movie) {
			return;
		}
		this._queueEvent("onHashTitle");
	},
	/**
	 * This is a chance to do something when the browse window opens
	 * @private
	 */
	browseStart: function() {
		this._queueEvent("onBrowseBeforeStart");// TODO in as
		this._queueEvent("onBrowseStart");
	},
	/**
	 * For non-IE browsers, the flash browsing dialog is not an model dialog, user can click on the page regardless of the browsing dialog hanging there.
	 * For flash, it never allows tiggering another browsing dialog when there's one alreay.
	 * Here we provide a chance to do something under this situation like giving some "smart" hint aroud the upload element.
	 * @private
	 */
	browseException: function() {
		this._queueEvent("onBrowseException");
	},
	/**
	 * Called after the file dialog has closed and the selected files have been queued.
	 * You could call startUpload here if you want the queued files to begin uploading immediately.
	 * NOTE: this happens after all "queued" and "queue_error" events.
	 * @private
	 * @param {Number} selectNum
	 * @param {Number} queuedNum
	 * @param {Number} totalQueuedNum
	 */
	browseEnd: function(selectNum, queuedNum, totalQueuedNum) {
		this._getUI().focus();
		this._queueEvent("onBrowseEnd", [selectNum, queuedNum, totalQueuedNum]);
	},
	/**
	 * Called when a file is successfully added to the queue.
	 * @private
	 * @param {FileItem} file
	 */
	fileQueued: function(file) {
		this._unescapeFilePost(file);
		this._queueEvent("onFileQueued", [file]);
	},
	/**
	 * Handle errors that occur when an attempt to queue a file fails.
	 * @private
	 * @param {FileItem} file
	 * @param {Array} errors An array of objects { name:String, message: String }-s.
	 */
	fileQueueError: function(file, errors) {
		this._unescapeFilePost(file);
		this._queueEvent("onFileQueueError", [file, errors]);
	},
	/**
	 * @private
	 * @param {FileItem} file
	 */
	fileUploadStart: function(file) {
		this._unescapeFilePost(file);
		this._queueEvent("onFileUploadStart", [file]);
	},
	/**
	 * @private
	 * @param {FileItem} file
	 * @param {Number} bytesComplete
	 * @param {Number} bytesTotal
	 */
	fileUploadProgress: function(file, bytesComplete, bytesTotal) {
		this._unescapeFilePost(file);
		this._queueEvent("onFileUploadProgress", [file, bytesComplete, bytesTotal]);
	},
	/**
	 * @private
	 * @param {FileItem} file
	 * @param {Array} errors
	 */
	fileUploadError: function(file, errors) {
		console.warn(errors);
		this._unescapeFilePost(file);
		this._queueEvent("onFileUploadError", [file, errors]);
	},
	/**
	 * @private
	 * @param {FileItem} file
	 * @param {Object} serverData
	 * @param {Object} responseReceived
	 */
	fileUploadSuccess: function(file, serverData, responseReceived) {
		this._unescapeFilePost(file);
		this._queueEvent("onFileUploadSuccess", [file, serverData, responseReceived]);
	},
	/**
	 * @private
	 * @param {FileItem} file
	 */
	fileUploadComplete: function(file) {
		this._unescapeFilePost(file);
		this._queueEvent("onFileUploadComplete", [file]);
	},
	/**
	 * Called by FlashUpload JS and AS functions when debug is enabled. Those message from AS will be tagged with wording "(FLASH)".
	 * The messages will be written to console (if exists) by default. You can override this event and have messages written where you want.
	 * @private
	 * @param {*} ...
	 */
	log: function() {
		if (this._options.debug && arguments.length) {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift("[FlashUpload] " + this._movieName);
			this._queueEvent("onDebug", args);
		}
	}
});
})(jQuery);