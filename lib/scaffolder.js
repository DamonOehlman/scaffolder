var async = require('async'),
    debug = require('debug')('scaffolder'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    nopt = require('nopt'),
    ncp = require('ncp').ncp,
    findPackage = require('./helpers/find-package');
    
function Scaffolder(opts) {
    var scaffolder = this;
    
    // ensure we have options
    opts = opts || {};
    
    this.targetModule = opts.module;
    this.ready = false;

    // if we have a target module, then find the package
    if (this.targetModule) {
        findPackage(this.targetModule.filename, function(err, srcPath) {
            if (! err) {
                scaffolder.srcPath = srcPath;
                
                // load the package info
                async.parallel([
                    scaffolder.loadPackage.bind(scaffolder)
                ], function(err) {
                    if (! err) {
                        scaffolder.ready = true;
                        scaffolder.emit('ready');
                    }
                    else {
                        scaffolder.emit('error', err);
                    }
                });
            }
            else {
                scaffolder.emit('error', err);
            }
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

Scaffolder.prototype.loadPackage = function(callback) {
    var scaffolder = this;
    
    // load the package.json file from the specified directory
    fs.readFile(path.join(this.srcPath, 'package.json'), 'utf8', function(err, data) {
        // if we read the file successfully, then parse it
        if (! err) {
            try {
                scaffolder.packageData = JSON.parse(data);
            }
            catch(e) {
                err = new Error('Unable to parse package.json');
            }
        }
        
        callback(err);
    });
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


exports = module.exports = function(targetModule, opts, initFn) {
    var scaffolder;
    
    if (typeof opts == 'function') {
        initFn = opts;
        opts = {};
    }
    
    // ensure we have options
    opts = opts || {};
    
    // initialise the module of the options
    opts.module = targetModule;
    
    // create the scaffolder
    scaffolder = new Scaffolder(opts);
    
    // if we have an init function return a bound instance of that function
    if (initFn) {
        return scaffolder.main(initFn);
    }
    else {
        return scaffolder;
    }
};