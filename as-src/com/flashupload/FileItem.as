package com.flashupload {
	import flash.net.FileReference;
	
	internal class FileItem {
		public static const STATUS_QUEUED : String = "queued";
		public static const STATUS_UPLOADING : String = "uploading";
		public static const STATUS_UPLOADED : String = "uploaded";
		public static const STATUS_ERROR : String = "error";
		public static const STATUS_CANCELLED : String = "cancelled";
		
		private static var seq : Number = 0;// tracking file id sequence
		
		public var fileReference : FileReference;
		public var id : String;
		public var name : String;
		public var size : Number;
		public var status : String = "";// empty string for NEW
		
		private var params : Object;
		
		public function FileItem(fileReference : FileReference, controlId : String) {
			this.params = {};
			
			this.fileReference = fileReference;
			this.id = controlId + "_file_" + (FileItem.seq++);
			this.name = fileReference.name;
			
			try {
				this.size = fileReference.size;// can error if file size larger than 4GB
			} catch (err : Error) {
				this.status = FileItem.STATUS_ERROR;
			}
		}
		
		public function addParam(name : String, value : String) : void {
			this.params[name] = value;
		}
		
		public function removeParam(name : String) : void {
			this.params[name] = null;// do NOT use `delete` because we want to override global params
		}
		
		public function getExt() : String {
			var dotIdxLast : Number = this.name.lastIndexOf(".");
			if (dotIdxLast >= 0) {
				return this.name.substr(dotIdxLast + 1).toLowerCase();
			}
			
			return "";
		}
		
		public function getParams() : Object {
			return this.params;
		}
		
		public function toJsObject() : Object {
			return {
				id: this.id,
				status: this.status,
				name: this.name,
				size: this.size
			};
		}
	}
}