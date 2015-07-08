/* jshint undef:true, browser:true, node:true */
/* global QUnit, test, equal, asyncTest, start, define */

var startTests = function (EasyCache) {
  
  var originalConsole = window.console;

  QUnit.module('EasyCache', {
    setup: function() {
      // Reset localStorage before each test
      try {
        localStorage.clear();
      } catch(e) {}
    },
    teardown: function() {
      // Reset localStorage after each test
      try {
        localStorage.clear();
      } catch(e) {}
      window.console = originalConsole;
      EasyCache.enableWarnings(false);
    }
  });

  test('Testing set() and get() with string', function() {
    var key = 'thekey';
    var value = 'thevalue';
    EasyCache.set(key, value, 1);
    if (EasyCache.supported()) {
      equal(EasyCache.get(key), value, 'We expect value to be ' + value);
    } else {
      equal(EasyCache.get(key), null, 'We expect null value');
    }
  });

  if (EasyCache.supported()) {

    test('Testing set() with non-string values', function() {
      var key, value;

      key = 'numberkey';
      value = 2;
      EasyCache.set(key, value, 3);
      equal(EasyCache.get(key)+1, value+1, 'We expect incremented value to be ' + (value+1));

      key = 'arraykey';
      value = ['a', 'b', 'c'];
      EasyCache.set(key, value, 3);
      equal(EasyCache.get(key).length, value.length, 'We expect array to have length ' + value.length);

      key = 'objectkey';
      value = {'name': 'Hemn', 'age': 26};
      EasyCache.set(key, value, 3);
      equal(EasyCache.get(key).name, value.name, 'We expect name to be ' + value.name);
    });

    test('Testing remove()', function() {
      var key = 'thekey';
      EasyCache.set(key, 'bla', 2);
      EasyCache.remove(key);
      equal(EasyCache.get(key), null, 'We expect value to be null');
    });

    test('Testing flush()', function() {
      localStorage.setItem('outside-cache', 'not part of EasyCache');
      var key = 'thekey';
      EasyCache.set(key, 'bla', 100);
      EasyCache.flush();
      equal(EasyCache.get(key), null, 'We expect flushed value to be null');
      equal(localStorage.getItem('outside-cache'), 'not part of EasyCache', 'We expect localStorage value to still persist');
    });

    test('Testing setBucket()', function() {
      var key = 'thekey';
      var value1 = 'awesome';
      var value2 = 'awesomer';
      var bucketName = 'BUCKETONE';

      EasyCache.set(key, value1, 1);
      EasyCache.setBucket(bucketName);
      EasyCache.set(key, value2, 1);

      equal(EasyCache.get(key), value2, 'We expect "' + value2 + '" to be returned for the current bucket: ' + bucketName);
      EasyCache.flush();
      equal(EasyCache.get(key), null, 'We expect "' + value2 + '" to be flushed for the current bucket');
      EasyCache.resetBucket();
      equal(EasyCache.get(key), value1, 'We expect "' + value1 + '", the non-bucket value, to persist');
    });

    // We do this test last since it must wait 1 minute
    asyncTest('Testing set() and get() with string and expiration', 1, function() {

      var key = 'thekey';
      var value = 'thevalue';
      var minutes = 1;
      EasyCache.set(key, value, minutes);
      setTimeout(function() {
        equal(EasyCache.get(key), null, 'We expect value to be null');
        start();
      }, 1000*60*minutes);
    });

    asyncTest('Testing set() and get() with string and expiration in a different bucket', 2, function() {

      var key = 'thekey';
      var value1 = 'thevalue1';
      var value2 = 'thevalue2';
      var minutes = 1;
      var bucket = 'newbucket';
      EasyCache.set(key, value1, minutes * 2);
      EasyCache.setBucket(bucket);
      EasyCache.set(key, value2, minutes);
      setTimeout(function() {
        equal(EasyCache.get(key), null, 'We expect value to be null for the bucket: ' + bucket);
        EasyCache.resetBucket();
        equal(EasyCache.get(key), value1, 'We expect value to be ' + value1 + ' for the base bucket.');
        start();
      }, 1000*60*minutes);
    });

    asyncTest('Testing flush(expired)', function() {
      localStorage.setItem('outside-cache', 'not part of EasyCache');
      var unexpiredKey = 'unexpiredKey';
      var expiredKey = 'expiredKey';
      EasyCache.set(unexpiredKey, 'bla', 1);
      EasyCache.set(expiredKey, 'blech', 1/60); // Expire after one second

      setTimeout(function() {
        EasyCache.flushExpired();
        equal(EasyCache.get(unexpiredKey), 'bla', 'We expect unexpired value to survive flush');
        equal(EasyCache.get(expiredKey), null, 'We expect expired value to be flushed');
        equal(localStorage.getItem('outside-cache'), 'not part of EasyCache', 'We expect localStorage value to still persist');
        start();
      }, 1500);
    });

  }

  if (QUnit.config.autostart === false) {
    QUnit.start();
  }
};

if (typeof module !== "undefined" && module.exports) {

  var EasyCache = require('../EasyCache');
  var qunit = require('qunit');
  startTests(EasyCache);
} else if (typeof define === 'function' && define.amd) {
 
  QUnit.config.autostart = false;
  require(['../EasyCache'], startTests);
} else {
  // Assuming that EasyCache has been properly included
  startTests(EasyCache);
}
