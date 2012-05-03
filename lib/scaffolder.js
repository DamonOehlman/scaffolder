var async = require('async'),
    debug = require('debug')('scaffolder'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    nopt = require('nopt'),
    ncp = require('ncp').ncp,
    _ = require('underscore'),
    findPackage = require('./helpers/find-package'),
    filters = require('./helpers/filters'),
    rePathDelim = /[\/\\]/,
    
    // define the core commands
    coreCommands = {
        known: {
            'silent': Boolean
        },
        
        shorthand: {}
    };
    
function Scaffolder(opts) {
    var scaffolder = this;
    
    // ensure we have options
    opts = opts || {};
    
    // initialise the default action path
    this.actionPath = opts.actionPath || path.join('lib', 'actions');
    
    // initialise the empty actions array
    this.actions = {};
    
    this.targetModule = opts.module;
    this.ready = false;
    
    // if we have a target module, then find the package
    if (this.targetModule) {
        debug('crawling tree to find package.json, starting at: ' + this.targetModule.filename);
        findPackage(this.targetModule.filename, function(err, srcPath) {
            if (! err) {
                scaffolder.srcPath = srcPath;
                
                // load the package info
                async.parallel([
                    scaffolder.loadPackage.bind(scaffolder),
                    scaffolder.loadActions.bind(scaffolder)
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

Scaffolder.prototype.loadActions = function(callback) {
    // determine the action path
    var actionPath = path.resolve(this.srcPath, this.actionPath),
        scaffolder = this;
    
    // read the files in the action path
    debug('attempting to load action definitions from: ' + actionPath);
    fs.readdir(actionPath, function(err, files) {
        var action, reqErr, actionModule;
        
        (files || []).filter(filters.jsOnly).forEach(function(file) {
            // initialise the action module path
            actionModule = path.join(actionPath, file);
            debug('attempting to load action module: ' + actionModule);
            
            // reset the action
            action = null;
            
            // load the action module
            try {
                action = require(actionModule);
            }
            catch (e) {
                debug('failed loading action module: ' + actionModule);
                reqErr = reqErr || new Error('Unable to load action module: ' + actionModule);
            }

            // if we loaded the action succesfully, then add a few extra details and load 
            if (action) {
                action.name = action.name || path.basename(file, '.js');
                scaffolder.actions[action.name] = action;
            }
        });
        
        callback(reqErr);
    });
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
        }
        else if (typeof opts == 'function') {
            callback = opts;
            opts = {};
        }

        // get the commands list
        opts.commands = opts.commands || (opts.argv || {}).remain || [];

        // if commands is not an array, then make it one
        if (! Array.isArray(opts.commands)) {
            opts.commands = [opts.commands];
        }
        
        // if we are not running in silent mode, handle errors by outputing them to the command line
        
        // if we have been provided a specific handler
        // then run that
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
        // otherwise, run each of the specified commands
        else {
            async.forEachSeries(opts.commands, scaffolder.run.bind(scaffolder), function(err) {
                scaffolder.emit(err ? 'error' : 'done', err);
            });
        }
    };
};

Scaffolder.prototype.run = function(name, opts, callback) {
    var action = this.actions[name];
    
    // remap args if required
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    // if we don't have an action, trigger the callback
    if (! action) {
        callback(new Error('Unable to find action: ' + name));
        return;
    }

    // parse the command line with reference to the specified command
    opts = _.extend(opts || {}, nopt(action.args, action.shorthand || {}, process.argv, 2));

    // run the action handler
    action.run.call(this, opts, callback);
};


exports = module.exports = function(targetModule, opts, initFn) {
    var scaffolder;
    
    if (typeof opts == 'function') {
        initFn = opts;
        opts = {};
    }
    
    // ensure we have options
    opts = _.extend(opts || {}, nopt(coreCommands.known, coreCommands.shorthand, process.argv, 2));
    
    // initialise the module of the options
    opts.module = targetModule;
    
    // create the scaffolder
    scaffolder = new Scaffolder(opts);
    
    // run the main function 
    // if an init function has been passed, that will run
    // otherwise actions will be run if they are specified on the cli
    scaffolder.main(initFn);
    
    return scaffolder;
};