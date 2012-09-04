/**
 * For IE bug when destoy, I have to intrude into AS, and the day I begin to do AS is my birthday too!
 * @author <a href="mailto:jiancwan@cisco.com">Jianchun Wang</a>
 * <h3>Change History:</h3>
 * <ul>
 *   <li><b>1.0.0 [2011-10-25/Jianchun]: </b>After so many has been modified, the name is change at last.</li>
 * </ul>
 */
package com.flashupload {
	import flash.display.Sprite;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.events.DataEvent;
	import flash.events.Event;
	import flash.events.HTTPStatusEvent;
	import flash.events.IOErrorEvent;
	import flash.events.KeyboardEvent;
	import flash.events.MouseEvent;
	import flash.events.ProgressEvent;
	import flash.events.SecurityErrorEvent;
	import flash.events.TimerEvent;
	import flash.external.ExternalInterface;
	import flash.net.FileFilter;
	import flash.net.FileReference;
	import flash.net.FileReferenceList;
	import flash.net.URLRequest;
	import flash.net.URLRequestMethod;
	import flash.net.URLVariables;
	import flash.system.Security;
	import flash.utils.Timer;
	
	public class FlashUpload extends Sprite {
		private static const EXTERNAL_INTERFACES : Array = ["SetOption", "GetOption",
			"Browse", "StartUpload", "CancelUpload", "CancelQueue",
			"GetFile", "AddFileParam", "RemoveFileParam",
			"Destroy","TestExternalInterface"];
		
		private var cursorSprite : Sprite;
		private var keepBusy : Function;
		private var browserMultiple : FileReferenceList = new FileReferenceList();
		private var browserSingle : FileReference = null;// no set because it cannot be reused like the FileReferenceList, it gets setup in the Browse method
		private var fileQueue : Array;// holds a list of all items that are to be uploaded
		private var currFileItem : FileItem = null;// currently being uploaded FileItem
		private var hasCalledFlashReady : Boolean = false;
		private var timerRestoreExtInt : Timer = null;
		private var timerServerData : Timer = null;
		private var timerAssumeSuccess : Timer = null;
		
		private var options : Options;
		
		private static function externalCall(flashupload : FlashUpload, fn : String, ...parameters) : * {
			var jsCall : String = flashupload.GetOption("jsCall"),
				movieName : String = flashupload.GetOption("movieName");
			
			switch (parameters.length) {
			case 3:
				return ExternalInterface.call(jsCall, movieName, fn, escapeMessage(parameters[0]), escapeMessage(parameters[1]), escapeMessage(parameters[2]));
			case 2:
				return ExternalInterface.call(jsCall, movieName, fn, escapeMessage(parameters[0]), escapeMessage(parameters[1]));
			case 1:
				return ExternalInterface.call(jsCall, movieName, fn, escapeMessage(parameters[0]));
			default:
				return ExternalInterface.call(jsCall, movieName, fn);
			}
		}
		
		/**
		 * Escapes all the backslashes which are not translated correctly in the Flash -> JavaScript Interface
		 *
		 * These functions had to be developed because the ExternalInterface has a bug that simply places the
		 * value a string in quotes (except for a " which is escaped) in a JavaScript string literal which
		 * is executed by the browser. These often results in improperly escaped string literals if your
		 * input string has any backslash characters. For example the string:
		 * "c:\Program Files\uploadtools\"
		 * is placed in a string literal (with quotes escaped) and becomes:
		 * var __flash__temp = "\"c:\Program Files\uploadtools\\"";
		 * This statement will cause errors when executed by the JavaScript interpreter:
		 * 1) The first \" is succesfully transformed to a "
		 * 2) \P is translated to P and the \ is lost
		 * 3) \u is interpreted as a unicode character and causes an error in IE
		 * 4) \\ is translated to \
		 * 5) leaving an unescaped " which causes an error
		 *
		 * I fixed this by escaping \ characters in all outgoing strings. The above escaped string becomes:
		 * var __flash__temp = "\"c:\\Program Files\\uploadtools\\\"";
		 * which contains the correct string literal.
		 *
		 * Note: The "var __flash__temp = " portion of the example is part of the ExternalInterface not part of my escaping routine.
		 */
		private static function escapeMessage(message : *) : * {
			if (message is String) {
				message = escapeString(message);
			} else if (message is Array) {
				message = escapeArray(message);
			} else if (message is FileItem) {
				message = escapeObject((message as FileItem).toJsObject());
			} else if (message is Err) {
				message = escapeObject((message as Err).toJsObject());
			} else if (message is Object) {
				message = escapeObject(message);
			}
			
			return message;
		}
		
		private static function escapeString(message : String) : String {
			return message.replace(/\\/g, "\\\\");
		}
		
		private static function escapeArray(messageArr : Array) : Array {
			for (var i : uint = 0, l : uint = messageArr.length; i < l; i++) {
				messageArr[i] = escapeMessage(messageArr[i]);
			}
			return messageArr;
		}
		
		private static function escapeObject(messageObj : Object) : Object {
			for (var name : String in messageObj) {
				messageObj[name] = escapeMessage(messageObj[name]);
			}
			return messageObj;
		}
		
		/**
		 * Constructor
		 */
		public function FlashUpload() {
			Security.allowDomain("*");// allow uploading to any domain
			this.fileQueue = [];
			
			// setups, the sequence should not change
			this.setupParams();
			this.setupUI();
			this.setupExternalInterface();
			this.setupEvents();
			
			if (externalCall(this, "testExternalInterface")) {
				externalCall(this, "flashReady");
				this.hasCalledFlashReady = true;
			}
			
			externalCall(this, "hashTitle");
			this.log("Init Complete");
		}
		
		// =================================================
		// private utility functions
		// =================================================
		private function setupParams() : void {
			this.options = new Options(this.loaderInfo.parameters);// passed in via the flashVars param node of flash or flash url params, if no, it'll be an empty object
		}
		
		private function setupUI() : void {
			stage.align = StageAlign.TOP_LEFT;
			stage.scaleMode = StageScaleMode.NO_BORDER;
			stage.stageFocusRect = false;
			
			var cursorSprite : Sprite = new Sprite();
			cursorSprite.graphics.beginFill(0xFFFFFF, 0);
			cursorSprite.graphics.drawRect(0, 0, stage.stageWidth, stage.stageHeight);
			cursorSprite.graphics.endFill();
			cursorSprite.buttonMode = true;
			cursorSprite.x = 0;
			cursorSprite.y = 0;
			cursorSprite.useHandCursor = !this.GetOption("arrowCursor");
			stage.addChild(cursorSprite);
			
			this.cursorSprite = cursorSprite;
		}
		
		private function setupExternalInterface() : void {
			for each (var callback : String in FlashUpload.EXTERNAL_INTERFACES) {
				try {
					ExternalInterface.addCallback(callback, this[callback]);
				} catch (ex : Error) {
					this.log("ExternalInterface \"" + callback + "\" cannot be set: " + ex.message);
				}
			}
			
			externalCall(this, "cleanup");
		}
		
		private function setupEvents() : void {
			var flashupload : FlashUpload = this;
			var counter : Number = 0;
			this.keepBusy = function() : void {// keep Flash Player busy so it doesn't show the "flash script is running slowly" error
				if (++counter > 100) {
					counter = 0;
				}
			};
			this.addEventListener(Event.ENTER_FRAME, this.keepBusy);
			
			// setup file FileReferenceList events
			this.browserMultiple.addEventListener(Event.SELECT, this.handleFileSelect);
			this.browserMultiple.addEventListener(Event.CANCEL, this.handleBrowseEnd);
			
			stage.addEventListener(MouseEvent.MOUSE_DOWN, function(event : MouseEvent) : void {
				externalCall(flashupload, "hashTitle");
			});
			stage.addEventListener(MouseEvent.CLICK, function(event : MouseEvent) : void {
				flashupload.handleStageClick(event);
			});
			stage.addEventListener(KeyboardEvent.KEY_DOWN, function(event : KeyboardEvent) : void {
				if (13 == event.keyCode) {// enter, should be the same as click
					event.preventDefault();
					flashupload.handleStageClick(event);
				}
			});
			
			// start periodically checking the external interface
			var timer : Timer = new Timer(2000, 0);
			timer.addEventListener(TimerEvent.TIMER, function() : void {
				flashupload.checkExternalInterface();
			});
			timer.start();
			this.timerRestoreExtInt = timer;
		}
		
		/**
		 * Used to periodically check that the External Interface functions are still working
		 */
		private function checkExternalInterface() : void {
			if (!externalCall(this, "testExternalInterface")) {
				this.setupExternalInterface();
				this.log("ExternalInterface reinitialized!");
				if (!this.hasCalledFlashReady) {
					externalCall(this, "flashReady");
					externalCall(this, "hashTitle");
					this.hasCalledFlashReady = true;
				}
			}
		}
		
		private function processFileList(fileReferenceList : Array) : void {
			this.log("Received file(s) selected from file browser, processing...");
			
			var queuedCount : Number = 0;
			
			for each (var fileRef : FileReference in fileReferenceList) {
				var fileItem : FileItem = new FileItem(fileRef, this.GetOption("movieName"));
				var errs : Array = [];
				
				// size check
				var sizeMax : Number = this.GetOption("sizeMax"),
					sizeMin : Number = this.GetOption("sizeMin"),
					size : Number = fileItem.size;
				if (isNaN(size)) {// when file size is bigger than 4G, flash will throw I/O exception while getting size, and the size would be set to NaN
					errs.push(Err.getSizeInaccessible());
				} else if (size === 0) {
					errs.push(Err.getSizeZero());
				} else if (sizeMax > 0 && size > sizeMax) {
					errs.push(Err.getSizeTooBig());
				} else if (sizeMin > 0 && size < sizeMin) {
					errs.push(Err.getSizeTooSmall());
				}// size OK
				
				// type check
				var typesAllowed : Array = this.GetOption("typesAllowed"),
					typesDisallowed : Array = this.GetOption("typesDisallowed"),
					ext : String = fileItem.getExt(),
					typeInvalid : Boolean = false;
				if (typesAllowed.length) {// typesAllowed takes priority to typesDisallowed
					typeInvalid = true;
					for each (var extAllowed : String in typesAllowed) {
						if (extAllowed == ext) {
							typeInvalid = false;
							break;
						}
					}
				} else if (typesDisallowed.length) {
					for each (var extDisallowed : String in typesDisallowed) {
						if (extDisallowed == ext) {
							typeInvalid = true;
							break;
						}
					}
				}// type OK
				if (typeInvalid) {
					errs.push(Err.getTypeInvalid());
				}
				
				// name check
				var nameIllegalChars : Array = this.GetOption("nameIllegalChars"),
					nameMax : Number = this.GetOption("nameMax"),
					nameMin : Number = this.GetOption("nameMin"),
					name : String = fileItem.name,
					nameSize : Number = name.length;
				for each (var char : String in nameIllegalChars) {
					if (name.indexOf(char) >= 0) {
						errs.push(Err.getNameInvalid());// NOTE this error can co-exist with the other name errors
						break;
					}
				}
				if (nameMax > 0 && nameSize > nameMax) {// queue full only for file can be queued
					errs.push(Err.getNameTooLong());
				} else if (nameMin > 0 && nameSize < nameMin) {
					errs.push(Err.getNameTooShort());
				}
				
				// extenernal validate check
				var validation : String = externalCall(this, "validate", fileItem);
				if (validation) {
					errs.push(Err.getValidationFail(validation));
				}
				
				// queue limit check, only for those without validation errors
				var queueLimit : Number = this.GetOption("queueLimit");
				if (!errs.length && queueLimit > 0 && this.fileQueue.length >= queueLimit) {// queue full only for file can be queued
					errs.push(Err.getQueueFull());
				}
				
				if (errs.length) {
					fileItem.filestatus = FileItem.STATUS_ERROR;
					fileItem.fileReference = null;
					this.log("[QueueError] \"" + fileItem.id + "\" - error count: " + errs.length);
					externalCall(this, "fileQueueError", fileItem, errs);
				} else {
					fileItem.filestatus = FileItem.STATUS_QUEUED;
					this.fileQueue.push(fileItem);
					queuedCount++;
					this.log("[Queued] \"" + fileItem.id + "\" is queued");
					externalCall(this, "fileQueued", fileItem);
				}
			}
			
			this.log("[BrowseEnd] Finished processing files. Selected=" + fileReferenceList.length + ", Queued=" + queuedCount + ", Total queued=" + this.fileQueue.length);
			externalCall(this, "browseEnd", fileReferenceList.length, queuedCount, this.fileQueue.length);
		}
		
		private function fileUploadSuccess(fileItem : FileItem, serverData : String, responseReceived : Boolean = true) : void {
			if (this.timerServerData) {
				this.timerServerData.stop();
				this.timerServerData = null;
			}
			if (this.timerAssumeSuccess !== null) {
				this.timerAssumeSuccess.stop();
				this.timerAssumeSuccess = null;
			}
			
			fileItem.filestatus = FileItem.STATUS_SUCCESS;
			
			serverData = serverData || "";
			serverData = serverData.replace(/^\s+|\s+$/g, "");
			
			this.log("[Success] \"" + fileItem.id + "\" Data: " + serverData);
			externalCall(this, "fileUploadSuccess", fileItem, serverData, responseReceived);
			
			this.fileUploadComplete(fileItem);
		}
		
		private function fileUploadError(fileItem : FileItem, err : Err) : void {
			fileItem.filestatus = FileItem.STATUS_ERROR;
			
			this.log("[Error] \"" + fileItem.id + "\" " + err.name + ": " + err.message);
			externalCall(this, "fileUploadError", fileItem, [err]);
			
			this.fileUploadComplete(fileItem);
		}
		
		private function fileUploadComplete(fileItem : FileItem) : void {
			var current : Boolean = fileItem == this.currFileItem;
			if (current) {
				if (this.timerAssumeSuccess) {
					this.timerAssumeSuccess.stop();
					this.timerAssumeSuccess = null;
				}
				this.currFileItem = null;
			}
			
			this.clearFileReference(fileItem);
			
			this.log("[Complete] \"" + fileItem.id + "\" life cycle complete");
			externalCall(this, "fileUploadComplete", fileItem);
		}
		
		private function buildRequest() : URLRequest {
			var request : URLRequest = new URLRequest();
			request.method = URLRequestMethod.POST;
			
			var filePost : Object = this.currFileItem.getPostObject();
			var postParams : Object = this.GetOption("postParams");
			var uploadUrl : String = this.GetOption("uploadUrl");
			var key : String;
			
			if (this.GetOption("useQueryString")) {
				var pairs : Array = [];
				for (key in postParams) {
					if (postParams.hasOwnProperty(key)) {
						pairs.push(escape(key) + "=" + escape(postParams[key]));
					}
				}
				
				for (key in filePost) {
					if (filePost.hasOwnProperty(key)) {
						pairs.push(escape(key) + "=" + escape(filePost[key]));
					}
				}
				
				request.url = uploadUrl + (uploadUrl.indexOf("?") > -1 ? "&" : "?") + pairs.join("&");
			} else {
				var post : URLVariables = new URLVariables();
				for (key in postParams) {
					if (postParams.hasOwnProperty(key)) {
						post[key] = postParams[key];
					}
				}
				
				for (key in filePost) {
					if (filePost.hasOwnProperty(key)) {
						post[key] = filePost[key];
					}
				}
				
				request.url = uploadUrl;
				request.data = post;
			}
			
			return request;
		}
		
		private function findQueuedFileItem(fileId : String = "", remove : Boolean = false) : FileItem {
			var index : Number = -1;
			if (!fileId) {// get the first in the queue
				index = 0;
			} else {
				for (var i : Number = 0; i < this.fileQueue.length; i++) {
					if (FileItem(this.fileQueue[i]).id == fileId) {
						index = i;
						break;
					}
				}
			}
			
			var fileItem : FileItem = this.fileQueue[index] || null;
			if (fileItem && remove) {
				this.fileQueue.splice(index, 1);
			}
			
			return fileItem;
		}
		
		private function clearFileReference(fileItem : FileItem) : void {
			if (fileItem && fileItem.fileReference) {
				fileItem.fileReference.removeEventListener(Event.OPEN, this.handleFileOpen);
				fileItem.fileReference.removeEventListener(ProgressEvent.PROGRESS, this.handleFileProgress);
				fileItem.fileReference.removeEventListener(IOErrorEvent.IO_ERROR, this.handleIOError);
				fileItem.fileReference.removeEventListener(SecurityErrorEvent.SECURITY_ERROR, this.handleSecurityError);
				fileItem.fileReference.removeEventListener(HTTPStatusEvent.HTTP_STATUS, this.handleHTTPError);
				fileItem.fileReference.removeEventListener(DataEvent.UPLOAD_COMPLETE_DATA, this.handleSeverData);
				
				fileItem.fileReference = null;
			}
		}
		
		private function log(msg : String) : void {
			if (!this.GetOption("debug") || !msg) {
				return;
			}
			try {
				externalCall(this, "log", "(FLASH) " + msg);
			} catch (ex : Error) {}// pretend nothing happened
		}
		
		// =================================================
		// event handler functions
		// =================================================
		private function handleStageClick(event : Event) : void {
			if (this.GetOption("disabled")) {
				return;
			}
			this.Browse();
		}
		
		private function handleFileSelect(event : Event) : void {
			if (this.GetOption("multiple")) {
				this.processFileList(this.browserMultiple.fileList);
			} else {
				this.processFileList([this.browserSingle]);
			}
		}
		
		private function handleBrowseEnd(event : Event) : void {
			this.log("[BrowseEnd] Browse cancelled");
			externalCall(this, "browseEnd", 0, 0, this.fileQueue.length);
		}
		
		private function handleFileOpen(event : Event) : void {
			this.log("[OPEN] \"" + this.currFileItem.id + "\" is opened for uploading (suppressed all progress events)");
			externalCall(this, "fileUploadProgress", this.currFileItem, 0, this.currFileItem.fileReference.size);
		}
		
		private function handleFileProgress(event : ProgressEvent) : void {
			// On early than Mac OS X 10.3 bytesLoaded is always -1, convert this to zero. Do bytesTotal for good measure.
			// http://livedocs.adobe.com/flex/3/langref/flash/net/FileReference.html#event:progress
			var bytesLoaded : Number = event.bytesLoaded < 0 ? 0 : event.bytesLoaded;
			var bytesTotal : Number = event.bytesTotal < 0 ? 0 : event.bytesTotal;
			
			// Because Flash never fires a complete event if the server doesn't respond after 30 seconds or on Macs if there
			// is no content in the response we'll set a timer and assume that the upload is successful after the defined amount of time.
			// If the timeout is zero then we won't use the timer.
			if (bytesLoaded === bytesTotal && bytesTotal > 0 && this.GetOption("assumeSuccessTimeout") > 0) {
				if (this.timerAssumeSuccess) {
					this.timerAssumeSuccess.stop();
					this.timerAssumeSuccess = null;
				}
				
				this.timerAssumeSuccess = new Timer(this.GetOption("assumeSuccessTimeout"), 1);
				this.timerAssumeSuccess.addEventListener(TimerEvent.TIMER_COMPLETE, handleTimerAssumeSuccess);
				this.timerAssumeSuccess.start();
			}
			
			externalCall(this, "fileUploadProgress", this.currFileItem, bytesLoaded, bytesTotal);
		}
		
		// NOTE: Flash Player does not support Uploads that require authentication. Attempting this will trigger an
		// IOError or it will prompt for a username and password and may crash the browser (FireFox/Opera)
		private function handleIOError(event : IOErrorEvent) : void {
			// Only trigger an IOError event if we haven't already done an HTTP error
			if (this.currFileItem.filestatus != FileItem.STATUS_ERROR) {
				this.fileUploadError(this.currFileItem, Err.getIOError(event.text));
			}
		}
		
		private function handleSecurityError(event : SecurityErrorEvent) : void {
			this.fileUploadError(this.currFileItem, Err.getSecurityError(event.text));
		}
		
		private function handleHTTPError(event : HTTPStatusEvent) : void {
			var isSuccessStatus : Boolean = false;
			var httpSuccess : Array = this.GetOption("httpSuccess");
			
			for (var i : Number = 0; i < httpSuccess.length; i++) {
				if (this.GetOption("httpSuccess")[i] === event.status) {
					isSuccessStatus = true;
					break;
				}
			}
			
			if (isSuccessStatus) {
				this.log("Translating HTTPError status code \"" + event.status + "\" to UploadSuccess");
				
				var serverDataEvent : DataEvent = new DataEvent(DataEvent.UPLOAD_COMPLETE_DATA, event.bubbles, event.cancelable, "");
				this.handleSeverData(serverDataEvent);
			} else {// TODO IOError is also called so we don't want to complete the upload yet
				this.fileUploadError(this.currFileItem, Err.getHttpError(event.status.toString()));
			}
		}
		
		private function handleComplete(event : Event) : void {
			/*
			 * Because we cannot do COMPLETE or DATA events (we have to do both) we cannot just call fileUploadSuccess from the complete handler,
			 * we have to wait for the Data event which may never come. However, testing shows it always comes within a couple milliseconds
			 * if it is going to come so the solution is:
			 * 
			 * Set a timer in the COMPLETE event (which always fires) and if DATA is fired it will stop the timer and call fileUploadComplete
			 * If the timer expires then DATA won't be fired and we call fileUploadComplete
			 */
			if (this.timerServerData) {
				this.timerServerData.stop();
				this.timerServerData = null;
			}
			
			this.timerServerData = new Timer(100, 1);
			this.timerServerData.addEventListener(TimerEvent.TIMER, this.handleTimerServerData);
			this.timerServerData.start();
		}
		
		private function handleSeverData(event : DataEvent) : void {
			this.fileUploadSuccess(this.currFileItem, event.data);
		}
		
		private function handleTimerAssumeSuccess(event : TimerEvent) : void {
			this.log("[AssumeSuccess] " + this.GetOption("assumeSuccessTimeout") + " ms without server response");
			this.fileUploadSuccess(this.currFileItem, "", false);
		}
		
		private function handleTimerServerData(event : TimerEvent) : void {
			this.fileUploadSuccess(this.currFileItem, "");
		}
		
		private function getFileFilters() : Array {
			var types : Array = [];
			for each (var ext : String in this.GetOption("typesAllowed")) {
				types.push("*." + ext);
			}
			
			var extStr : String = types.join(";") || "*.*";
			return [new FileFilter(this.GetOption("typesDescription") + " (" + extStr + ")", extStr)];
		}
		
		// =================================================
		// Below are externally exposed functions for JS all of which are initiated with uppercase.
		// DONOT rename them!
		// =================================================
		/**
		 * Called when JS destroy to fix IE recurring JS error bug.
		 */
		public function Destroy() : void {
			if (this.timerRestoreExtInt) {
				this.timerRestoreExtInt.stop();
				this.timerRestoreExtInt = null;
			}
			if (this.timerServerData) {
				this.timerServerData.stop();
				this.timerServerData = null;
			}
			if (this.timerAssumeSuccess) {
				this.timerAssumeSuccess.stop();
				this.timerAssumeSuccess = null;
			}
			if (this.keepBusy != null) {// should use "!= null" or compile error will happen in FlashDevelop
				this.removeEventListener(Event.ENTER_FRAME, this.keepBusy);
				this.keepBusy = null;
			}
		}
		
		public function Browse() : void {
			this.log("[Browse] Browsing " + (this.GetOption("multiple") ? "multiple files" : "single file"));
			try {
				if (this.GetOption("multiple")) {
					this.browserMultiple.browse(this.getFileFilters());
				} else {
					this.browserSingle = new FileReference();
					this.browserSingle.addEventListener(Event.SELECT, this.handleFileSelect);
					this.browserSingle.addEventListener(Event.CANCEL, this.handleBrowseEnd);
					this.browserSingle.browse(this.getFileFilters());
				}
				externalCall(this, "browseStart");
			} catch (ex : Error) {
				this.log("[Browse] Exception: " + ex.message);
				externalCall(this, "browseException");
			}
		}
		
		/**
		 * Start a file to upload.
		 */
		public function StartUpload(fileId : String = "") : void {
			if (this.currFileItem) {// only upload a file uploads are being processed
				this.log("[StartUpload] Upload already in progress, not starting another");
				return;
			}
			
			this.log("[StartUpload] Try to find " + (fileId ? "file \"" + fileId + "\"" : "first file in queue"));
			
			this.currFileItem = this.findQueuedFileItem(fileId, true);// true to "rip" that fileItem out
			if (!this.currFileItem) {
				if (fileId) {
					this.log("[StartUpload:Error] \"" + fileId + "\" FileNotFound: not found in queue");
					externalCall(this, "fileUploadError", {
						id: fileId
					}, [Err.getFileNotFound()]);
				}
				this.log("[StartUpload] No files found in the queue");
				return;
			}
			
			if (!this.GetOption("uploadUrl")) {// missing upload url used to requeue the file and set status back to queued
				this.fileUploadError(this.currFileItem, Err.getMissingUploadUrl());
				return;
			}
			
			/*
			 * Below are code from previouse ReturnUploadStart method.
			 * 
			 * The process of starting upload used to be like:
			 * JS_startUpload --> AS_StartUpload --> JS_uploadStart --> JS_upload_start_handler + JS_return_upload_start_handler -(true/false)-> AS_ReturnUploadStart
			 * This method used to have a "startUpload : Boolean" parameter, for which, if we return false in JS_upload_start_handler and do JS_startUpload in JS_upload_complete_handler,
			 * it'll create an infinite loop.
			 * 
			 * I don't get it, is there any profit we can get from returning a boolean value from JS_upload_start_handler?
			 * I wanted to make it break the chain to much simpler:
			 * JS_startUpload --> AS_StartUpload --> JS_uploadStart --> JS_upload_start_handler
			 */
			this.currFileItem.filestatus = FileItem.STATUS_IN_PROGRESS;
			this.log("[StartUpload] \"" + this.currFileItem.id + "\" starts uploading to " + this.GetOption("uploadUrl"));
			externalCall(this, "fileUploadStart", this.currFileItem);
			
			try {// Set the event handlers
				this.currFileItem.fileReference.addEventListener(Event.OPEN, this.handleFileOpen);
				this.currFileItem.fileReference.addEventListener(ProgressEvent.PROGRESS, this.handleFileProgress);
				this.currFileItem.fileReference.addEventListener(IOErrorEvent.IO_ERROR, this.handleIOError);
				this.currFileItem.fileReference.addEventListener(SecurityErrorEvent.SECURITY_ERROR, this.handleSecurityError);
				this.currFileItem.fileReference.addEventListener(HTTPStatusEvent.HTTP_STATUS, this.handleHTTPError);
				this.currFileItem.fileReference.addEventListener(Event.COMPLETE, this.handleComplete);
				this.currFileItem.fileReference.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, this.handleSeverData);
				
				this.currFileItem.fileReference.upload(this.buildRequest(), this.GetOption("filedataName"), false);
			} catch (ex : Error) {
				this.fileUploadError(this.currFileItem, Err.getUploadFail(ex.errorID + "\n" + ex.name + "\n" + ex.message + "\n" + ex.getStackTrace()));
			}
		}
		
		/**
		 * Cancels the upload specified by fileId.
		 * If the file is currently uploading it is cancelled and the fileUploadComplete event gets called.
		 * If the file is not currently uploading then only the uploadCancelled event is fired.
		 */
		public function CancelUpload(fileId : String = "", triggerErrorEvent : Boolean = true) : Boolean {
			var fileItem : FileItem;
			if (!fileId) {// if fileId not specified, cancel the current or the first in the queue
				fileItem = this.currFileItem ? this.currFileItem : this.findQueuedFileItem(fileId, true);
			} else {
				fileItem = (this.currFileItem && this.currFileItem.id == fileId) ? this.currFileItem : this.findQueuedFileItem(fileId, true);
			}
			
			if (!fileItem) {
				return false;
			}
			
			var current : Boolean = fileItem == this.currFileItem;
			fileItem.fileReference.cancel();
			fileItem.filestatus = FileItem.STATUS_CANCELLED;
			
			this.log("[CancelUpload] \"" + fileItem.id + "\" was cancelled" + (triggerErrorEvent ? "" : " (suppressed fileUploadError event)"));
			if (triggerErrorEvent) {
				externalCall(this, "fileUploadError", fileItem, [Err.getCancelled(current)]);// DONT use this.fileUploadError because we don't want to trigger complete
			}
			if (current) {
				this.fileUploadComplete(fileItem);
			}
			return true;
		}
		
		/**
		 * Cancel all uploads.
		 */
		public function CancelQueue(triggerErrorEvent : Boolean = true) : void {
			var cancelled : Boolean = this.CancelUpload("", triggerErrorEvent);
			while (cancelled) {
				cancelled = this.CancelUpload("", triggerErrorEvent);
			}
		}
		
		/**
		 * Get file object by file id.
		 */
		public function GetFile(fileId : String = "") : Object {
			var fileItem : FileItem = fileId ? this.findQueuedFileItem(fileId) : this.currFileItem;
			return fileItem ? fileItem.toJsObject() : null;
		}
		
		/**
		 * Add post param to file which has not been started.
		 */
		public function AddFileParam(fileId : String, name : String, value : String) : Boolean {
			var fileItem : FileItem = this.findQueuedFileItem(fileId);
			if (fileItem) {
				fileItem.addParam(name, value);
				return true;
			} else {
				return false;
			}
		}
		
		/**
		 * Remove post param to file.
		 */
		public function RemoveFileParam(fileId : String, name : String) : Boolean {
			var fileItem : FileItem = this.findQueuedFileItem(fileId);
			if (fileItem) {
				fileItem.removeParam(name);
				return true;
			} else {
				return false;
			}
		}
		
		public function GetOption(name: String) : * {
			return this.options.get(name);
		}
		
		public function SetOption(name: String, val : *) : * {
			this.options.set(name, val);
		}
		
		/**
		 * Called by JS to see if it can access the external interface
		 */
		public function TestExternalInterface() : Boolean {
			return true;
		}
	}
}