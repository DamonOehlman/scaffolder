var debug = require('debug')('scaffolder'),
    events = require('events'),
    util = require('util'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    nopt = require('nopt'),
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

function Scaffolder(opts) {
    var scaffolder = this;
    
    // ensure we have options
    opts = opts || {};
    
    this.targetModule = opts.module;
    this.ready = false;

    // if we have a target module, then find the package
    if (this.targetModule) {
        _findPackage(this.targetModule.filename, function(srcPath) {
            scaffolder.srcPath = srcPath;

            scaffolder.ready = true;
            scaffolder.emit('ready');
        });
    }
}

util.inherits(Scaffolder, events.EventEmitter);

Scaffolder.prototype.copy = function(src, dest, callback) {
    var scaffolder = this;
    
    // create a dummy callback if we don't have one
    callback = callback || function() {};
    
    // get the source path for the package
    this.getPath(function(basePath) {
        src = path.resolve(basePath, src);
        
        debug('attempting to copy files from ' + src + ' ==> ' + dest);

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

Scaffolder.prototype.main = function(handler) {
    var scaffolder = this;
    
    return function(opts, callback) {
        // if we have no arguments, then check the command line args
        if (arguments.length === 0) {
            opts = nopt(cmdline.known, cmdline.shorthand, process.argv, 2);
        }
        else if (typeof opts == 'function') {
            callback = opts;
            opts = {};
        }

        // get the commands list
        opts.commands = (opts.argv || {}).remain || [];
        
        if (handler) {
            var boundHandler = handler.bind(scaffolder, opts, callback);
            
            // if the scaffolder is not yet ready, wait until ready
            if (! scaffolder.ready) {
                scaffolder.once('ready', boundHandler);
            }
            else {
                boundHandler();
            }
        }
    };
};


exports = module.exports = function(targetModule, initFn) {
    // create the scaffolder
    var scaffolder = new Scaffolder({
        module: targetModule
    });
    
    // if we have an init function return a bound instance of that function
    if (initFn) {
        return scaffolder.main(initFn);
    }
    else {
        return scaffolder;
    }
};