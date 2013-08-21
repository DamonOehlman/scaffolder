/* jshint node: true */
'use strict';

var debug = require('debug')('scaffolder');
var path = require('path');
var fs = require('fs');
var _exists = fs.exists || path.exists;

module.exports = function(src, dest, callback) {
  var scaffolder = this;

  // create a dummy callback if we don't have one
  callback = callback || function() {};
  
  // use the scaffolder to squirrel in the required modules
  this.squirrel(['ncp', 'mkdirp'], function(err, ncp, mkdirp) {
    if (err) {
      return callback(err);
    }
    
    // get the source path for the package
    scaffolder.getPath(function(basePath) {
      src = path.resolve(basePath, src);

      debug('attempting to copy files from ' + src + ' ==> ' + dest);
      
      // if the path exists, copy the files
      _exists(src, function(exists) {
        if (exists) {
          mkdirp(dest, function(err) {
            if (err) {
              callback(err);
            }
            else {
              ncp.ncp(src, dest, callback);
            }
          });
        }
        else {
          callback(new Error('no source files'));
        }
      });
    });
  });
};