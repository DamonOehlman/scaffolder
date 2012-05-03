var async = require('async'),
    debug = require('debug')('scaffolder'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    nopt = require('nopt'),
    ncp = require('ncp').ncp,
    out = require('out'),
    read = require('read'),
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
    this.commandPath = opts.commandPath || path.join('lib', 'commands');
    
    // initialise the empty commands array
    this.commands = {};
    
    this.targetModule = opts.module;
    this.ready = false;
    
    // if we are not running in silent mode, then handle errors by pushing them to output
    if (! opts.silent) {
        this.on('error', function(err) {
            out('!{red}{0}', err);
        });
    }
    
    // create the out helper function
    this.out = opts.silent ? function() {} : out;
    
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
    var commandPath = path.resolve(this.srcPath, this.commandPath),
        scaffolder = this;
    
    // read the files in the action path
    debug('attempting to load action definitions from: ' + commandPath);
    fs.readdir(commandPath, function(err, files) {
        var command, reqErr, commandModule;
        
        (files || []).filter(filters.jsOnly).forEach(function(file) {
            // initialise the action module path
            commandModule = path.join(commandPath, file);
            debug('attempting to load action module: ' + commandModule);
            
            // reset the action
            command = null;
            
            // load the action module
            try {
                command = require(commandModule);
            }
            catch (e) {
                debug('failed loading action module: ' + commandModule);
                reqErr = reqErr || new Error('Unable to load action module: ' + commandModule);
            }

            // if we loaded the action succesfully, then add a few extra details and load 
            if (command) {
                command.name = command.name || path.basename(file, '.js');
                scaffolder.commands[command.name] = command;
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

Scaffolder.prototype.main = function(opts, handler) {
    var scaffolder = this;
    
    // if we have no arguments, then check the command line args
    if (typeof opts == 'function') {
        handler = opts;
        opts = {};
    }

    // get the commands list
    opts.commands = opts.commands || (opts.argv || {}).remain || [];

    // if commands is not an array, then make it one
    if (! Array.isArray(opts.commands)) {
        opts.commands = [opts.commands];
    }
    
    this.once('ready', function() {
        // if we have been provided a specific handler then run that
        if (handler) {
            handler.call(scaffolder, opts, function(err) {
                scaffolder.emit(err ? 'error' : 'done', err);
            });
        }
        // otherwise, run each of the specified commands
        else {
            debug('running commands: ', opts.commands);
            async.mapSeries(opts.commands, scaffolder.run.bind(scaffolder), function(err, results) {
                scaffolder.emit(err ? 'error' : 'done', err, results);
            });
        }
    });
};

Scaffolder.prototype.read = function(prompts, callback) {
    // if an array, run the the specified prompts and return the list of results
    if (Array.isArray(prompts)) {
        async.mapSeries(prompts, read, callback);
    }
    // otherwise, simply pass through to read
    else {
        read(prompts, callback);
    }
};


Scaffolder.prototype.readFile = function(filename, encoding, callback) {
    this.getPath(function(filepath) {
        fs.readFile(path.join(filepath, 'assets', filename), encoding, callback);
    });
};

Scaffolder.prototype.run = function(name, opts, callback) {
    var command = this.commands[name];
    
    // remap args if required
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    // if we don't have an action, trigger the callback
    if (! command) {
        callback(new Error('Unable to find handler for command: ' + name));
        return;
    }
    
    // if the action does not have a run function, then return an error
    if (typeof command.run != 'function') {
        callback(new Error('Action "' + name + '" does not have a run function'));
        return;
    }

    // parse the command line with reference to the specified command
    opts = _.extend({}, opts, nopt(command.args || {}, command.shorthand || {}, opts.argv, opts.startArg));

    // run the action handler
    command.run.call(this, opts, callback);
};


exports = module.exports = function(opts, initFn) {
    var scaffolder;
    
    if (typeof opts == 'function') {
        initFn = opts;
        opts = {};
    }
    
    // ensure we have options
    opts = opts || {};
    
    // initialise the start arg to 0 if custom args have been provided, or 2 if we are using process.argv
    opts.startArg = opts.argv ? 0 : 2;

    // initialise the cmdline to process argv
    opts.argv = opts.argv || process.argv;
    debug('processing args: ', opts.argv.slice(opts.startArg));
    
    // extend the opts by parsing with nopt
    opts = _.extend({}, opts, nopt(coreCommands.known, coreCommands.shorthand, opts.argv, opts.startArg));
    
    // initialise the module of the options
    opts.module = opts.module || module.parent;
    
    // create the scaffolder
    scaffolder = new Scaffolder(opts);
    
    // run the main function 
    // if an init function has been passed, that will run
    // otherwise commands will be run if they are specified on the cli
    scaffolder.main(opts, initFn);
    
    return scaffolder;
};