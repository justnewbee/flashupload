package com.flashupload {
	internal class Err {
		public var name : String;
		public var message : String;
		
		public function Err(name : String, message : String) {
			this.name = name;
			this.message = message;
		}
		
		public function toJsObject() : Object {
			return {
				name: this.name,
				message: this.message
			};
		}
		
		public static function getSizeZero() : Err {
			return new Err("SizeZero", "size is zero");
		}
		
		public static function getSizeInaccessible() : Err {
			return new Err("SizeInaccessible", "size is larger than 4GB and cannot be processed by flash");
		}
		
		public static function getSizeTooBig() : Err {
			return new Err("SizeTooBig", "size is too big");
		}
		
		public static function getSizeTooSmall() : Err {
			return new Err("SizeTooSmall", "size is too small");
		}
		
		public static function getTypeInvalid() : Err {
			return new Err("TypeInvalid", "type is not allowed");
		}
		
		public static function getNameInvalid() : Err {
			return new Err("NameInvalid", "name contains illegal chars");
		}
		
		public static function getNameTooLong() : Err {
			return new Err("NameTooLong", "name is too long");
		}
		
		public static function getNameTooShort() : Err {
			return new Err("NameTooShort", "name is too short");
		}
		
		public static function getValidationFail(msg : String) : Err {
			return new Err("ValidationFail", msg);
		}
		
		public static function getQueueFull() : Err {
			return new Err("QueueFull", "the queue is full");
		}
		
		public static function getFileNotFound() : Err {
			return new Err("FileNotFound", "cannot find file in the queue");
		}
		
		public static function getMissingUploadUrl() : Err {
			return new Err("MissingUploadUrl", "upload url is missing");
		}
		
		public static function getHttpError(msg : String) : Err {
			return new Err("HttpError", msg);
		}
		
		public static function getIOError(msg : String) : Err {
			return new Err("IOError", msg);
		}
		
		public static function getSecurityError(msg : String) : Err {
			return new Err("SecurityError", msg);
		}
		
		public static function getUploadFail(msg : String) : Err {
			return new Err("UploadFail", msg);
		}
		
		public static function getCancelled(uploading : Boolean) : Err {
			return new Err("Cancelled", uploading ? "cancelled when uploading" : "cancelled before upload");
		}
	}
}