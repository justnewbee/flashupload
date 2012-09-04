/**
 * For IE bug when destoy, I have to intrude into AS, and the day I begin to do AS is my birthday too!
 * @author <a href="mailto:jianchunw@hz.webex.com">Jianchun Wang</a>
 * <h3>Change History:</h3>
 * <ul>
 *   <li><b>1.0.0 [2011-04-15/Jianchun]: </b>Some code refinement, inlcuing variable naming conventions.</li>
 * </ul>
 */
package com.flashupload {
	import flash.net.FileReference;
	
	internal class FileItem {
		public static const STATUS_QUEUED : int = -1;
		public static const STATUS_IN_PROGRESS : int = -2;
		public static const STATUS_ERROR : int = -3;
		public static const STATUS_SUCCESS : int = -4;
		public static const STATUS_CANCELLED : int = -5;
		public static const STATUS_NEW : int = -6;// this status should never be sent to JavaScript
		
		private static var fileIdSequence : Number = 0;// tracks the file id sequence
		
		private var postObject : Object;
		private var type : String;
		private var creationdate : Number;
		private var modificationdate : Number;
		
		public var fileReference : FileReference;
		public var id : String;
		public var filestatus : int = 0;
		public var size : Number;
		public var name : String;
		
		/*
		 * The purpose of this function is to escape the property names so when Flash passes them back to javascript they can be interpretted correctly.
		 * NOTE: They have to be unescaped again by JavaScript.
		 *
		 * This works around a bug where Flash sends objects this way:
		 * object.parametername = "value";
		 * instead of
		 * object["parametername"] = "value";
		 * This can be a problem if the parameter name has characters that are not allowed in JavaScript identifiers:
		 * object.parameter.name! = "value";
		 * does not work but,
		 * object["parameter.name!"] = "value";
		 * would have worked.
		 */
		private static function escapeParamName(name : String) : String {
			return name.replace(/[^a-z0-9_]/gi, FileItem.escapeCharacter).replace(/^[0-9]/, FileItem.escapeCharacter);
		}
		
		private static function escapeCharacter() : String {
			var arg : String = arguments[0];
			return "$" + ("0000" + arg.charCodeAt(0).toString(16)).substr(-4, 4);
		}
		
		public function FileItem(fileReference : FileReference, controlId : String) {
			this.postObject = {};
			
			this.filestatus = FileItem.STATUS_NEW;
			this.fileReference = fileReference;
			this.id = controlId + "_" + (FileItem.fileIdSequence++);
			
			try {// attempt to retrieve the FileReference info, this can fail and so is wrapped in try..catch
				this.name = fileReference.name;
				this.size = fileReference.size;
				this.type = fileReference.type;
				this.creationdate = fileReference.creationDate ? fileReference.creationDate.getTime() : new Date().getTime();
				this.modificationdate = fileReference.modificationDate ? fileReference.modificationDate.getTime() : new Date(0).getTime();
			} catch (ex : Error) {
				this.filestatus = FileItem.STATUS_ERROR;
			}
		}
		
		public function addParam(name : String, value : String) : void {
			this.postObject[name] = value;
		}
		
		public function removeParam(name : String) : void {
			delete this.postObject[name];
		}
		
		public function getExt() : String {
			var dotIdxLast : Number = this.name.lastIndexOf(".");
			if (dotIdxLast >= 0) {
				return this.name.substr(dotIdxLast + 1).toLowerCase();
			}
			
			return "";
		}
		
		public function getPostObject(escape : Boolean = false) : Object {
			if (escape) {
				var escapedPostObject : Object = {};
				for (var k : String in this.postObject) {
					if (this.postObject.hasOwnProperty(k)) {
						escapedPostObject[FileItem.escapeParamName(k)] = this.postObject[k];
					}
				}
				return escapedPostObject;
			} else {
				return this.postObject;
			}
		}
		
		/**
		 * Create the simple file object that is passed to browser.
		 */
		public function toJsObject() : Object {
			return {
				id: this.id,
				filestatus: this.filestatus,
				name: this.name,
				size: this.size,
				type: this.type || "",
				creationdate: this.creationdate,
				modificationdate: this.modificationdate,
				post: this.getPostObject(true)
			};
		}
	}
}