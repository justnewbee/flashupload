package com.flashupload {
	internal class Options {
		private static var OPTS : Object = {
			jsCall: "FlashUpload.callByAS",
			movieName: "",
			uploadUrl: "",
			filedataName: "filedata",
			typesDescription: "",
			debug: true,
			disabled: false,
			multiple: true,
			arrowCursor: false,
			useQueryString: false,
			queueLimit: 0,
			assumeSuccessTimeout: 0,
			httpSuccess: null,// array
			postParams: null,// object
			// for validation
			sizeMax: 0,
			sizeMin: 0,
			nameIllegalChars: null,// array
			nameMax: 0,
			nameMin: 0,
			typesAllowed: null,// array
			typesDisallowed: null// array
		};
		
		private var data : Object;
		
		public function Options(loaderParams : Object) {
			this.data = {};
			
			for (var k : String in OPTS) {
				if (OPTS.hasOwnProperty(k)) {
					this.set(k, loaderParams[k] || "");
				}
			}
		}
		
		public function set(name: String, val : *) : void {
			if (!OPTS.hasOwnProperty(name)) {
				return;
			}
			
			var parsedVal : *;
			switch (name) {
			case "typesAllowed":
			case "typesDisallowed":
				parsedVal = this.processTypes(val);
				break;
			case "nameIllegalChars":
				parsedVal = this.processNameIllegalChars(val);
				break;
			case "httpSuccess":
				parsedVal = this.processHttpSuccess(val);
				break;
			case "postParams":
				parsedVal = this.processPostParams(val);
				break;
			default:
				switch (typeof OPTS[name]) {
				case "boolean":
					if (val is Boolean) {
						parsedVal = val;
					} else if (val is Number) {
						parsedVal = !!val;
					} else {
						parsedVal = OPTS[name] ? val != "false" : val == "true";
					}
					break;
				case "number":
					parsedVal = Number(val) || OPTS[name];
					break;
				default:// string
					parsedVal = val || OPTS[name];
					break;
				}
				break;
			}
			
			this.data[name] = parsedVal;
		}
		
		public function get(name: String) : * {
			return this.data[name];
		}
		
		private function processTypes(types : *) : Array {
			var parsed : Array = [],
				typesAsString : String = "";
			
			if (types is String) {
				typesAsString = types as String;
			} else if (types is Array) {
				typesAsString = (types as Array).join(";");
			}
			
			for each (var ext : String in typesAsString.toLowerCase().split(/[,;\/\s]+/)) {
				var dotIdx : Number = ext.lastIndexOf(".");
				if (dotIdx >= 0) {
					ext = ext.substr(dotIdx + 1);
				}
				
				if (ext && ext != "*") {
					parsed.push(ext);
				}
			}
			
			return parsed;
		}
		
		private function processNameIllegalChars(nameIllegalChars : *) : Array {
			var chars : String = "";
			if (nameIllegalChars is String) {
				chars = nameIllegalChars as String;
			} else if (nameIllegalChars is Array) {
				chars = (nameIllegalChars as Array).join("");
			}
			
			// unlike JS, "".split("") in AS will generate [""], while in JS it's []
			chars = chars.replace(/ /g, "");
			
			return chars ? chars.split("") : [];
		}
		
		private function processHttpSuccess(httpSuccess : *) : Array {
			var parsed : Array = [],
				codesAsString : String = "";
			if (httpSuccess is String) {
				codesAsString = httpSuccess as String;
			} else if (httpSuccess is Array) {
				codesAsString = (httpSuccess as Array).join(" ");
			}
			
			for each (var code : * in codesAsString.split(/[,;\/\s]/)) {
				if (code) {
					parsed.push(Number(code));
				}
			}
			
			return parsed;
		}
		
		private function processPostParams(postParams : *) : Object {
			var parsed : Object = {};
			
			if (postParams is String) {
				for each (var nameValue : String in (postParams as String).split("&amp;")) {
					var eqIdx : Number = nameValue.indexOf("=");
					if (eqIdx > 0) {
						parsed[decodeURIComponent(nameValue.substring(0, eqIdx))] = decodeURIComponent(nameValue.substr(eqIdx + 1));
					}
				}
			} else if (postParams is Object) {
				parsed = postParams;
			}
			
			return parsed;
		}
	}
}