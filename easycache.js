/**
 * JS-EasyCache v1.0.0
 *
 * By Hemn Chawroka
 * http://iprodev.com
 *
 * Free to use and abuse under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 */

/* jshint undef:true, browser:true, node:true */
/* global define */
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else if (typeof module !== "undefined" && module.exports) {
		// CommonJS/Node module
		module.exports = factory();
	} else {
		// Browser globals
		root.EasyCache = factory();
	}
}(this, function() {

	// Prefix for all EasyCache keys
	var CACHE_PREFIX = 'EasyCache-';

	// Suffix for the key name on the expiration items in localStorage
	var CACHE_SUFFIX = '-cacheexpiration';

	// expiration date radix (set to Base-36 for most space savings)
	var EXPIRY_RADIX = 10;

	// time resolution in minutes
	var EXPIRY_UNITS = 60 * 1000;

	// ECMAScript max Date (epoch + 1e8 days)
	var MAX_DATE = Math.floor(8.64e15 / EXPIRY_UNITS);

	var storageSupported;
	var cachedJSON;
	var cacheBucket = '';
	var warnings = false;	// private property
	var fromCharCode = String.fromCharCode;

	// LZ-based compression algorithm
	var LZString = {
		compress: function(uncompressed) {
			return LZString._compress(uncompressed, 16, function(a) {
				return fromCharCode(a);
			});
		},
		_compress: function(uncompressed, bitsPerChar, getCharFromInt) {
			if (uncompressed == null) return "";
			var i, value,
				context_dictionary = {},
				context_dictionaryToCreate = {},
				context_c = "",
				context_wc = "",
				context_w = "",
				context_enlargeIn = 2, // Compensate for the first entry which should not count
				context_dictSize = 3,
				context_numBits = 2,
				context_data = [],
				context_data_val = 0,
				context_data_position = 0,
				ii;

			for (ii = 0; ii < uncompressed.length; ii += 1) {
				context_c = uncompressed.charAt(ii);
				if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
					context_dictionary[context_c] = context_dictSize++;
					context_dictionaryToCreate[context_c] = true;
				}

				context_wc = context_w + context_c;
				if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
					context_w = context_wc;
				} else {
					if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
						if (context_w.charCodeAt(0) < 256) {
							for (i = 0; i < context_numBits; i++) {
								context_data_val = (context_data_val << 1);
								if (context_data_position == bitsPerChar - 1) {
									context_data_position = 0;
									context_data.push(getCharFromInt(context_data_val));
									context_data_val = 0;
								} else {
									context_data_position++;
								}
							}
							value = context_w.charCodeAt(0);
							for (i = 0; i < 8; i++) {
								context_data_val = (context_data_val << 1) | (value & 1);
								if (context_data_position == bitsPerChar - 1) {
									context_data_position = 0;
									context_data.push(getCharFromInt(context_data_val));
									context_data_val = 0;
								} else {
									context_data_position++;
								}
								value = value >> 1;
							}
						} else {
							value = 1;
							for (i = 0; i < context_numBits; i++) {
								context_data_val = (context_data_val << 1) | value;
								if (context_data_position == bitsPerChar - 1) {
									context_data_position = 0;
									context_data.push(getCharFromInt(context_data_val));
									context_data_val = 0;
								} else {
									context_data_position++;
								}
								value = 0;
							}
							value = context_w.charCodeAt(0);
							for (i = 0; i < 16; i++) {
								context_data_val = (context_data_val << 1) | (value & 1);
								if (context_data_position == bitsPerChar - 1) {
									context_data_position = 0;
									context_data.push(getCharFromInt(context_data_val));
									context_data_val = 0;
								} else {
									context_data_position++;
								}
								value = value >> 1;
							}
						}
						context_enlargeIn--;
						if (context_enlargeIn == 0) {
							context_enlargeIn = Math.pow(2, context_numBits);
							context_numBits++;
						}
						delete context_dictionaryToCreate[context_w];
					} else {
						value = context_dictionary[context_w];
						for (i = 0; i < context_numBits; i++) {
							context_data_val = (context_data_val << 1) | (value & 1);
							if (context_data_position == bitsPerChar - 1) {
								context_data_position = 0;
								context_data.push(getCharFromInt(context_data_val));
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = value >> 1;
						}


					}
					context_enlargeIn--;
					if (context_enlargeIn == 0) {
						context_enlargeIn = Math.pow(2, context_numBits);
						context_numBits++;
					}
					// Add wc to the dictionary.
					context_dictionary[context_wc] = context_dictSize++;
					context_w = String(context_c);
				}
			}

			// Output the code for w.
			if (context_w !== "") {
				if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
					if (context_w.charCodeAt(0) < 256) {
						for (i = 0; i < context_numBits; i++) {
							context_data_val = (context_data_val << 1);
							if (context_data_position == bitsPerChar - 1) {
								context_data_position = 0;
								context_data.push(getCharFromInt(context_data_val));
								context_data_val = 0;
							} else {
								context_data_position++;
							}
						}
						value = context_w.charCodeAt(0);
						for (i = 0; i < 8; i++) {
							context_data_val = (context_data_val << 1) | (value & 1);
							if (context_data_position == bitsPerChar - 1) {
								context_data_position = 0;
								context_data.push(getCharFromInt(context_data_val));
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = value >> 1;
						}
					} else {
						value = 1;
						for (i = 0; i < context_numBits; i++) {
							context_data_val = (context_data_val << 1) | value;
							if (context_data_position == bitsPerChar - 1) {
								context_data_position = 0;
								context_data.push(getCharFromInt(context_data_val));
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = 0;
						}
						value = context_w.charCodeAt(0);
						for (i = 0; i < 16; i++) {
							context_data_val = (context_data_val << 1) | (value & 1);
							if (context_data_position == bitsPerChar - 1) {
								context_data_position = 0;
								context_data.push(getCharFromInt(context_data_val));
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = value >> 1;
						}
					}
					context_enlargeIn--;
					if (context_enlargeIn == 0) {
						context_enlargeIn = Math.pow(2, context_numBits);
						context_numBits++;
					}
					delete context_dictionaryToCreate[context_w];
				} else {
					value = context_dictionary[context_w];
					for (i = 0; i < context_numBits; i++) {
						context_data_val = (context_data_val << 1) | (value & 1);
						if (context_data_position == bitsPerChar - 1) {
							context_data_position = 0;
							context_data.push(getCharFromInt(context_data_val));
							context_data_val = 0;
						} else {
							context_data_position++;
						}
						value = value >> 1;
					}


				}
				context_enlargeIn--;
				if (context_enlargeIn == 0) {
					context_enlargeIn = Math.pow(2, context_numBits);
					context_numBits++;
				}
			}

			// Mark the end of the stream
			value = 2;
			for (i = 0; i < context_numBits; i++) {
				context_data_val = (context_data_val << 1) | (value & 1);
				if (context_data_position == bitsPerChar - 1) {
					context_data_position = 0;
					context_data.push(getCharFromInt(context_data_val));
					context_data_val = 0;
				} else {
					context_data_position++;
				}
				value = value >> 1;
			}

			// Flush the last char
			while (true) {
				context_data_val = (context_data_val << 1);
				if (context_data_position == bitsPerChar - 1) {
					context_data.push(getCharFromInt(context_data_val));
					break;
				} else context_data_position++;
			}
			return context_data.join('');
		},

		decompress: function(compressed) {
			if (compressed == null) return "";
			if (compressed == "") return null;
			return LZString._decompress(compressed.length, 32768, function(index) {
				return compressed.charCodeAt(index);
			});
		},

		_decompress: function(length, resetValue, getNextValue) {
			var dictionary = [],
				next,
				enlargeIn = 4,
				dictSize = 4,
				numBits = 3,
				entry = "",
				result = [],
				i,
				w,
				bits, resb, maxpower, power,
				c,
				data = {
					val: getNextValue(0),
					position: resetValue,
					index: 1
				};

			for (i = 0; i < 3; i += 1) {
				dictionary[i] = i;
			}

			bits = 0;
			maxpower = Math.pow(2, 2);
			power = 1;
			while (power != maxpower) {
				resb = data.val & data.position;
				data.position >>= 1;
				if (data.position == 0) {
					data.position = resetValue;
					data.val = getNextValue(data.index++);
				}
				bits |= (resb > 0 ? 1 : 0) * power;
				power <<= 1;
			}

			switch (next = bits) {
				case 0:
					bits = 0;
					maxpower = Math.pow(2, 8);
					power = 1;
					while (power != maxpower) {
						resb = data.val & data.position;
						data.position >>= 1;
						if (data.position == 0) {
							data.position = resetValue;
							data.val = getNextValue(data.index++);
						}
						bits |= (resb > 0 ? 1 : 0) * power;
						power <<= 1;
					}
					c = fromCharCode(bits);
					break;
				case 1:
					bits = 0;
					maxpower = Math.pow(2, 16);
					power = 1;
					while (power != maxpower) {
						resb = data.val & data.position;
						data.position >>= 1;
						if (data.position == 0) {
							data.position = resetValue;
							data.val = getNextValue(data.index++);
						}
						bits |= (resb > 0 ? 1 : 0) * power;
						power <<= 1;
					}
					c = fromCharCode(bits);
					break;
				case 2:
					return "";
			}
			dictionary[3] = c;
			w = c;
			result.push(c);
			while (true) {
				if (data.index > length) {
					return "";
				}

				bits = 0;
				maxpower = Math.pow(2, numBits);
				power = 1;
				while (power != maxpower) {
					resb = data.val & data.position;
					data.position >>= 1;
					if (data.position == 0) {
						data.position = resetValue;
						data.val = getNextValue(data.index++);
					}
					bits |= (resb > 0 ? 1 : 0) * power;
					power <<= 1;
				}

				switch (c = bits) {
					case 0:
						bits = 0;
						maxpower = Math.pow(2, 8);
						power = 1;
						while (power != maxpower) {
							resb = data.val & data.position;
							data.position >>= 1;
							if (data.position == 0) {
								data.position = resetValue;
								data.val = getNextValue(data.index++);
							}
							bits |= (resb > 0 ? 1 : 0) * power;
							power <<= 1;
						}

						dictionary[dictSize++] = fromCharCode(bits);
						c = dictSize - 1;
						enlargeIn--;
						break;
					case 1:
						bits = 0;
						maxpower = Math.pow(2, 16);
						power = 1;
						while (power != maxpower) {
							resb = data.val & data.position;
							data.position >>= 1;
							if (data.position == 0) {
								data.position = resetValue;
								data.val = getNextValue(data.index++);
							}
							bits |= (resb > 0 ? 1 : 0) * power;
							power <<= 1;
						}
						dictionary[dictSize++] = fromCharCode(bits);
						c = dictSize - 1;
						enlargeIn--;
						break;
					case 2:
						return result.join('');
				}

				if (enlargeIn == 0) {
					enlargeIn = Math.pow(2, numBits);
					numBits++;
				}

				if (dictionary[c]) {
					entry = dictionary[c];
				} else {
					if (c === dictSize) {
						entry = w + w.charAt(0);
					} else {
						return null;
					}
				}
				result.push(entry);

				// Add w+entry[0] to the dictionary.
				dictionary[dictSize++] = w + entry.charAt(0);
				enlargeIn--;

				w = entry;

				if (enlargeIn == 0) {
					enlargeIn = Math.pow(2, numBits);
					numBits++;
				}

			}
		}
	};

	// Determines if localStorage is supported in the browser;
	// result is cached for better performance instead of being run each time.
	// Feature detection is based on how Modernizr does it;
	// it's not straightforward due to FF4 issues.
	// It's not run at parse-time as it takes 200ms in Android.
	function supportsStorage() {
		var key = '__easycachetest__';
		var value = key;

		if (storageSupported !== undefined) {
			return storageSupported;
		}

		try {
			setItem(key, value);
			removeItem(key);
			storageSupported = true;
		} catch (e) {
			if (isOutOfSpace(e)) { // If we hit the limit, then it means we have support, 
				storageSupported = true; // just maxed it out and even the set test failed.
			} else {
				storageSupported = false;
			}
		}
		return storageSupported;
	}

	// Check to set if the error is us dealing with being out of space
	function isOutOfSpace(e) {
		if (e && e.name === 'QUOTA_EXCEEDED_ERR' ||
			e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
			e.name === 'QuotaExceededError') {
			return true;
		}
		return false;
	}

	// Determines if native JSON (de-)serialization is supported in the browser.
	function supportsJSON() {
		/*jshint eqnull:true */
		if (cachedJSON === undefined) {
			cachedJSON = (window.JSON != null);
		}
		return cachedJSON;
	}

	/**
	 * Returns a string where all RegExp special characters are escaped with a \.
	 * @param {String} text
	 * @return {string}
	 */
	function escapeRegExpSpecialCharacters(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	}

	/**
	 * Returns the full string for the localStorage expiration item.
	 * @param {String} key
	 * @return {string}
	 */
	function expirationKey(key) {
		return key + CACHE_SUFFIX;
	}

	/**
	 * Returns the number of minutes since the epoch.
	 * @return {number}
	 */
	function currentTime() {
		return Math.floor((new Date().getTime()) / EXPIRY_UNITS);
	}

	/**
	 * Wrapper functions for localStorage methods
	 */

	function getItem(key) {
		return localStorage.getItem(CACHE_PREFIX + cacheBucket + key);
	}

	function setItem(key, value) {
		// Fix for iPad issue - sometimes throws QUOTA_EXCEEDED_ERR on setItem.
		localStorage.removeItem(CACHE_PREFIX + cacheBucket + key);
		localStorage.setItem(CACHE_PREFIX + cacheBucket + key, value);
	}

	function removeItem(key) {
		localStorage.removeItem(CACHE_PREFIX + cacheBucket + key);
	}

	function eachKey(fn) {
		var prefixRegExp = new RegExp('^' + CACHE_PREFIX + escapeRegExpSpecialCharacters(cacheBucket) + '(.*)');
		// Loop in reverse as removing items will change indices of tail
		for (var i = localStorage.length - 1; i >= 0; --i) {
			var key = localStorage.key(i);
			key = key && key.match(prefixRegExp);
			key = key && key[1];
			if (key && key.indexOf(CACHE_SUFFIX) < 0) {
				fn(key, expirationKey(key));
			}
		}
	}

	function flushItem(key) {
		var exprKey = expirationKey(key);

		removeItem(key);
		removeItem(exprKey);
	}

	function flushExpiredItem(key) {
		var exprKey = expirationKey(key);
		var expr = getItem(exprKey);

		if (expr) {
			var expirationTime = parseInt(expr, EXPIRY_RADIX);

			// Check if we should actually kick item out of storage
			if (currentTime() >= expirationTime) {
				removeItem(key);
				removeItem(exprKey);
				return true;
			}
		}
	}

	function warn(message, err) {
		if (!warnings) return;
		if (!('console' in window) || typeof window.console.warn !== 'function') return;
		window.console.warn("JS-EasyCache - " + message);
		if (err) window.console.warn("JS-EasyCache - The error was: " + err.message);
	}

	var EasyCache = {
		/**
		 * Stores the value in localStorage. Expires after specified number of minutes.
		 * @param {string} key
		 * @param {Object|string} value
		 * @param {number} time
		 */
		set: function(key, value, time) {
			if (!supportsStorage()) return;

			// If we don't get a string value, try to stringify
			// In future, localStorage may properly support storing non-strings
			// and this can be removed.
			if (typeof value !== 'string') {
				if (!supportsJSON()) return;
				try {
					value = JSON.stringify(value);
				} catch (e) {
					// Sometimes we can't stringify due to circular refs
					// in complex objects, so we won't bother storing then.
					return;
				}
			}

			if (value) {
				value = LZString.compress(value);
			}

			try {
				setItem(key, value);
			} catch (e) {
				if (isOutOfSpace(e)) {
					// If we exceeded the quota, then we will sort
					// by the expire time, and then remove the N oldest
					var storedKeys = [];
					var storedKey;
					eachKey(function(key, exprKey) {
						var expiration = getItem(exprKey);
						if (expiration) {
							expiration = parseInt(expiration, EXPIRY_RADIX);
						} else {
							// TODO: Store date added for non-expiring items for smarter removal
							expiration = MAX_DATE;
						}
						storedKeys.push({
							key: key,
							size: (getItem(key) || '').length,
							expiration: expiration
						});
					});
					// Sorts the keys with oldest expiration time last
					storedKeys.sort(function(a, b) {
						return (b.expiration - a.expiration);
					});

					var targetSize = (value || '').length;
					while (storedKeys.length && targetSize > 0) {
						storedKey = storedKeys.pop();
						warn("Cache is full, removing item with key '" + key + "'");
						flushItem(storedKey.key);
						targetSize -= storedKey.size;
					}
					try {
						setItem(key, value);
					} catch (e) {
						// value may be larger than total quota
						warn("Could not add item with key '" + key + "', perhaps it's too big?", e);
						return;
					}
				} else {
					// If it was some other error, just give up.
					warn("Could not add item with key '" + key + "'", e);
					return;
				}
			}

			// If a time is specified, store expiration info in localStorage
			if (time) {
				setItem(expirationKey(key), (currentTime() + time).toString(EXPIRY_RADIX));
			} else {
				// In case they previously set a time, remove that info from localStorage.
				removeItem(expirationKey(key));
			}
		},

		/**
		 * Retrieves specified value from localStorage, if not expired.
		 * @param {string} key
		 * @return {string|Object}
		 */
		get: function(key) {
			if (!supportsStorage()) return null;

			// Return the de-serialized item if not expired
			if (flushExpiredItem(key)) {
				return null;
			}

			// Tries to de-serialize stored value if its an object, and returns the normal value otherwise.
			var value = getItem(key);

			if (value) {
				value = LZString.decompress(value);
			}

			if (!value || !supportsJSON()) {
				return value;
			}

			try {
				// We can't tell if its JSON or a string, so we try to parse
				return JSON.parse(value);
			} catch (e) {
				// If we can't parse, it's probably because it isn't an object
				return value;
			}
		},

		/**
		 * Removes a value from localStorage.
		 * Equivalent to 'delete' in memcache, but that's a keyword in JS.
		 * @param {string} key
		 */
		remove: function(key) {
			if (!supportsStorage()) return;

			flushItem(key);
		},

		/**
		 * Returns whether local storage is supported.
		 * Currently exposed for testing purposes.
		 * @return {boolean}
		 */
		supported: function() {
			return supportsStorage();
		},

		/**
		 * Flushes all EasyCache items and expiry markers without affecting rest of localStorage
		 */
		flush: function() {
			if (!supportsStorage()) return;

			eachKey(function(key) {
				flushItem(key);
			});
		},

		/**
		 * Flushes expired EasyCache items and expiry markers without affecting rest of localStorage
		 */
		flushExpired: function() {
			if (!supportsStorage()) return;

			eachKey(function(key) {
				flushExpiredItem(key);
			});
		},

		/**
		 * Appends CACHE_PREFIX so EasyCache will partition data in to different buckets.
		 * @param {string} bucket
		 */
		setBucket: function(bucket) {
			cacheBucket = bucket;
		},

		/**
		 * Resets the string being appended to CACHE_PREFIX so EasyCache will use the default storage behavior.
		 */
		resetBucket: function() {
			cacheBucket = '';
		},

		/**
		 * Sets whether to display warnings when an item is removed from the cache or not.
		 */
		enableWarnings: function(enabled) {
			warnings = enabled;
		}
	};

	// Return the module
	return EasyCache;
}));