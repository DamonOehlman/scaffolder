var events = require('events'),
    util = require('util'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    ncp = require('ncp').ncp;
    
// ## helper functions

function _findPackage(targetPath, callback) {
    path.exists(path.join(targetPath, 'package.json'), function(exists) {
        if (! exists) {
            var parentPath = path.dirname(targetPath);
            if (parentPath !== '/') {
                _findPackage(parentPath, callback);
            }
            else if (callback) {
                callback();
            }
        }
        else if (callback) {
            callback(targetPath);
        }
    });
}

// ## Scaffoler
    
function Scaffolder(targetModule) {
    var scaffolder = this;
    
    this.ready = false;
    
    _findPackage(targetModule.filename, function(srcPath) {
        scaffolder.srcPath = srcPath;
        
        scaffolder.ready = true;
        scaffolder.emit('ready');
    });
}

util.inherits(Scaffolder, events.EventEmitter);

Scaffolder.prototype.copy = function(src, dest, callback) {
    var scaffolder = this;
    
    // create a dummy callback if we don't have one
    callback = callback || function() {};
    
    // get the source path for the package
    this.getPath(function(basePath) {
        src = path.resolve(basePath, src);
        
        // if the path exists, copy the files
        path.exists(src, function(exists) {
            if (exists) {
                mkdirp(dest, function(err) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        ncp(src, dest, callback);
                    }
                });
            }
            else {
                callback(new Error('no source files'));
            }
        });
    });
};

Scaffolder.prototype.getPath = function(callback) {
    var scaffolder = this;
    
    if (! this.ready) {
        this.once('ready', function() {
            scaffolder.getPath(callback);
        });
    }
    else if (callback) {
        callback(scaffolder.srcPath);
    }
};


exports = module.exports = function(targetModule) {
    return new Scaffolder(targetModule);
};