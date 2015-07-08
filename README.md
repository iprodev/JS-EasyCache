JS-EasyCache
===============================
This is a easy & fast library that emulates `memcache` functions using HTML5 `localStorage` with lossless data compression support, so that you can cache data on the client
and associate an expiration time with each piece of data. If the `localStorage` limit (~5MB) is exceeded, it tries to create space by removing the items that are closest to expiring anyway. If `localStorage` is not available at all in the browser, the library degrades by simply not caching and all cache requests return null.

JS-EasyCache uses high-performance lossless data compression algorithm to make data stored size smaller so you can store more data to the `localStorage`.

Methods
-------

The library exposes 9 methods: `set()`, `get()`, `remove()`, `flush()`, `flushExpired()`, `setBucket()`, `resetBucket()`, `supported()`, and `enableWarnings()`.

* * *

### EasyCache.set
Stores the value in localStorage. Expires after specified number of minutes.
#### Arguments
1. `key` (**string**)
2. `value` (**Object|string**)
3. `time` (**number: optional**)

* * *

### EasyCache.get
Retrieves specified value from localStorage, if not expired.
#### Arguments
1. `key` (**string**)

#### Returns
**string | Object** : The stored value. If no value is available, null is returned.

* * *

### EasyCache.remove
Removes a value from localStorage.
#### Arguments
1. `key` (**string**)

* * *

### EasyCache.flush
Removes all EasyCache items from localStorage without affecting other data.

* * *

### EasyCache.setBucket
Appends CACHE_PREFIX so EasyCache will partition data in to different buckets
#### Arguments
1. `bucket` (**string**)

Usage
-------

The interface should be familiar to those of you who have used `memcache`, and should be easy to understand for those of you who haven't.

For example, you can store a string for 2 minutes using `EasyCache.set()`:

```js
EasyCache.set('greeting', 'Hello World!', 2);
```

You can then retrieve that string with `EasyCache.get()`:

```js
alert(EasyCache.get('greeting'));
```

You can remove that string from the cache entirely with `EasyCache.remove()`:

```js
EasyCache.remove('greeting');
```

You can remove all items from the cache entirely with `EasyCache.flush()`:

```js
EasyCache.flush();
```

You can remove only expired items from the cache entirely with `EasyCache.flushExpired()`:

```js
EasyCache.flushExpired();
```

Returns whether local storage is supported.:

```js
alert(EasyCache.supported());
```

The library also takes care of serializing objects, so you can store more complex data:

```js
EasyCache.set('data', {'name': 'Hemn', 'age': 26}, 2);
```

And then when you retrieve it, you will get it back as an object:

```js
alert(EasyCache.get('data').name);
```

If you have multiple instances of EasyCache running on the same domain, you can partition data in a certain bucket via:

```js
EasyCache.set('response', '...', 2);
EasyCache.setBucket('lib');
EasyCache.set('path', '...', 2);
EasyCache.flush(); // Only removes 'path' which was set in the lib bucket
EasyCache.resetBucket();
EasyCache.flush(); // Remove all EasyCache items and expiry markers without affecting rest of localStorage
```

For more live examples, play around with the demo here:
http://iprodev.github.io/JS-EasyCache/demo/index.html


Real-World Usage
----------
This library was originally developed with the use case of caching results of JSON API queries
to speed up my webapps and give them better protection against flaky APIs.

For example use `EasyCache` to fetch Youtube API results for 10 minutes:

```js
var key = 'youtube:' + query;
var json = EasyCache.get(key);
if (json) {
  processJSON(json);
} else {
  fetchJSON(query);
}

function processJSON(json) {
  // ..
}

function fetchJSON() {
  var searchUrl = 'http://gdata.youtube.com/feeds/api/videos';
  var params = {
   'v': '2', 'alt': 'jsonc', 'q': encodeURIComponent(query)
  }
  JSONP.get(searchUrl, params, null, function(json) {
    processJSON(json);
    EasyCache.set(key, json, 10);
  });
}
```

It does not have to be used for only expiration-based caching, however. It can also be used as just a wrapper for `localStorage`, as it provides the benefit of handling JS object (de-)serialization.

Browser Support
----------------

The `EasyCache` library should work in all browsers where `localStorage` is supported.
A list of those is here:
http://caniuse.com/#search=localstorage

## Credits

JS-EasyCache was created by [Hemn Chawroka](http://iprodev.com) from [iProDev](http://iprodev.com). Released under the MIT license.
