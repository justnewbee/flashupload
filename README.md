#FlashUpload

##Description
---------------------
FlashUpload is inspired by [SWFUpload][].

##TODOs
- ADD `onFileUploadBeforeStart` option
- Auto start upload after browse

##Getting Started

##Change History
---------------------

###**1.0.2** _2012-10-24/Jianchun_
- RMV Option `httpSuccess`, this is rarely used actually, and it still fires IOErrorEvent in flash which extra logic is needed to handle it, so I give it up.
- RMV These attributes are removed from file object - `type`, `creationdate`, `modificationdate`.
- IMP Use single JS function `handleFileEvent` for all file events.
- UPD Change `callJs` in Flash to non-static, and accept arguments as `Array` instead of `...parameters`.
- IMP Options as flashvar are now well managed inside `Options` object.
- IMP Error code is changed from number to human friendly string which are well managed in `Err` object.
- IMP Status code is changed from number to human friendly string.
- IMP Move JS interfaces called by AS from FlashUpload.prototype to FlashUpload's static namespace so that instances are cleaner.
- REM `FileItem` is now much lighter no longer giving `post` to JS, so JS method `_unescapeFilePost` is no longer needed either.

###**V1.0.1** _2011-12-01-17/Jianchun_
- IMPROVED File objects now support multiple errors (because it happens in real life).

###**V1.0.0** _2011-10-25/Jianchun_
- One year after using SWFUpload and fixing its bugs, rewrite again in a deeper way (last time I rewrote it is 2011-10-23).

#Bugs fixed for [SWFUpload][]
Here're the bugs fixed
- FIX File size NaN error - file larger than 4GB will not be processed by flash
- FIX Recurring JS error when destroy in IE - add `Destroy` in flash, and invoke it in JS `destroy` method
- FIX Repeating "ExternalInterface Reinitialized" in IE - force to load flash without cache
- FIX Tab trapping - tabindex -1 for flash object, and handle keydown of tab in flash to try to move focus back to browser
- FIX Error occurs if invoking `CallFlash` before ready - cache `CallFlash` before flash is ready, and invoke them when ready
- FIX IE title problem when there's "#" in url - add `onHashTitle` event

##Open Issues
---------------------
- [Firefox cannot restore focus from flash](https://addons.mozilla.org/en-US/firefox/addon/restore-window-focus-after-fla/ "It's unresolvable")

[SWFUpload]: http://code.google.com/p/swfupload/ "JavaScript & Flash Upload Library"