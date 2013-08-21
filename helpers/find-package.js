/* jshint node: true */
'use strict';

var path = require('path');
var fs = require('fs');
var _exists = fs.exists || path.exists;

var findPackage = module.exports = function(targetPath, callback) {
  _exists(path.join(targetPath, 'package.json'), function(exists) {
    var parentPath;

    if (! exists) {
      parentPath = path.dirname(targetPath);
      if (parentPath !== '/') {
        findPackage(parentPath, callback);
      }
      else if (callback) {
        callback(new Error('Could not find package.json'));
      }
    }
    else if (callback) {
      callback(null, targetPath);
    }
  });
};
