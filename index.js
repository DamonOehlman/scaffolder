var async = require('async'),
    debug = require('debug')('scaffolder'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    path = require('path'),
    nopt = require('nopt'),
    out = require('out'),
    read = require('read'),
    squirrel = require('squirrel'),
    _ = require('underscore'),
    findPackage = require('./helpers/find-package'),
    filters = require('./helpers/filters'),
    pluginFiles = fs.readdirSync(path.resolve(__dirname, 'plugins')).filter(filters.jsOnly),
    rePathDelim = /[\/\\]/,
    _exists = fs.exists || path.exists,
    
    // define the core commands
    coreCommands = {
        known: {
            'silent': Boolean,
            'help': Boolean,
            'version': Boolean
        },
        
        shorthand: {}
    };
    
function Scaffolder(opts) {
    var scaffolder = this;
    
    // ensure we have options
    opts = opts || {};
    
    // initialise the empty commands array
    this.commands = {};
    
    this.targetModule = opts.module;
    this.ready = false;
    
    // initialise the squirrel allowInstall option to 'prompt'
    opts.allowInstall = typeof opts.allowInstall != 'undefined' ? opts.allowInstall : 'prompt';
    
    // save the opts for passing through to other objects
    this.opts = opts;
    
    // if we are not running in silent mode, then handle errors by pushing them to output
    if (! opts.silent) {
        this.on('error', function(err) {
            out('!{red}{0}', err);
        });
    }
    
    // create the out helper function
    this.out = opts.silent ? function() {} : out;
    
    // map the opts to the scaffolder which can allow objects to access
    _.difference(Object.keys(opts), ['init']).forEach(function(key) {
        // only map if it doesn't already exist in the object or the prototype
        if (typeof scaffolder[key] == 'undefined') {
            scaffolder[key] = opts[key];
        }
    });
    
    // if we have a target module, then find the package
    if (this.targetModule) {
        debug('crawling tree to find package.json, starting at: ' + this.targetModule.filename);
        findPackage(this.targetModule.filename, function(err, srcPath) {
            var initializers = [
                scaffolder.loadPackage.bind(scaffolder),
                scaffolder.loadActions.bind(scaffolder)
            ].concat(opts.init || []);
            
            // if we encountered an error, then emit an error event and abort processing
            if (err) return scaffolder.emit('error', err);
            
            // initialise the default asset path
            scaffolder.assetPath = opts.assetPath || path.resolve(srcPath, 'assets');
            
            // initialise the default command path
            scaffolder.commandPath = opts.commandPath || path.resolve(srcPath, 'lib', 'commands');
            
            // initialise the scaffolder srcPath
            scaffolder.srcPath = srcPath;
            
            // load the package info
            async.parallel(initializers, function(err) {
                if (! err) {
                    scaffolder.ready = true;
                    scaffolder.emit('ready');
                }
                else {
                    scaffolder.emit('error', err);
                }
            });
        });
    }
}

util.inherits(Scaffolder, events.EventEmitter);

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
                debug('failed loading action module: ' + commandModule, e);
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
    var scaffolder = this,
        runCommand = true;
    
    // if we have no arguments, then check the command line args
    if (typeof opts == 'function') {
        handler = opts;
        opts = {};
    }
    
    // get the commands list
    opts.commands = opts.commands || (opts.argv || {}).remain || [];
    
    // use the default commands if we have not parsed out valid commands
    if (Array.isArray(opts.commands) && opts.commands.length === 0) {
        debug('no commands specified, attempting to use default commands: ', opts.defaultCommands);
        
        // return only default commands that actually exist
        // i.e. don't attempt to run the "run" command if no handler is defined
        opts.commands = (opts.defaultCommands || []).filter(function(command) {
            return scaffolder.commands[command];
        });
    }

    // if commands is not an array, then make it one
    if (! Array.isArray(opts.commands)) {
        opts.commands = [opts.commands];
    }
    
    // if we have been provided a specific handler then run that
    if (handler) {
        handler.call(scaffolder, opts, function(err) {
            scaffolder.emit(err ? 'error' : 'done', err);
        });
    }
    // otherwise, run each of the specified commands
    else {
        // check if one of the help, version, etc flags has been provided
        ['help', 'version'].forEach(function(flag) {
            if (opts[flag]) {
                scaffolder[flag].call(scaffolder, opts.commands, function(err, output) {
                    if (! err) {
                        scaffolder.out(output);
                    }

                    scaffolder.emit(err ? 'error' : 'done', err);
                });
                
                // set the run command flag to false
                runCommand = false;
            }
        });

        if (runCommand) {
            debug('running commands: ', opts.commands);
            async.mapSeries(opts.commands, scaffolder.run.bind(scaffolder), function(err, results) {
                scaffolder.emit(err ? 'error' : 'done', err, results);
            });
        }
    }
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
    opts = _.extend({}, opts, nopt(
      _.extend({}, opts.defaultArgs, command.args),
      _.extend({}, opts.defaultShorthand, command.shorthand), 
      opts.argv, 
      opts.startArg
    ));

    // run the action handler
    command.run.call(this, opts, callback);
};

Scaffolder.prototype.squirrel = function(requirements, opts, callback) {
    // remap args if required
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    // call squirrel, extending the opts with the defaults
    squirrel(requirements, _.extend({}, this.opts, opts), callback);
};

// patch in plugins for the prototype
pluginFiles.forEach(function(pluginFile) {
    Scaffolder.prototype[path.basename(pluginFile, '.js')] = require('./plugins/' + pluginFile);
});

exports = module.exports = function(opts, initFn) {
    var scaffolder,
        defaultArgs,
        defaultShorthand;
    
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

    // add the core commands to the default args
    opts.defaultArgs = _.extend(opts.defaultArgs || {}, coreCommands.known);
    opts.defaultShorthand = _.extend(opts.defaultShorthand || {}, coreCommands.shorthand);
    
    // extend the opts by parsing with nopt
    if (typeof opts.parseOpts == 'undefined' || opts.parseOpts) {
        opts = _.extend({}, opts, nopt(opts.defaultArgs, opts.defaultShorthand, opts.argv, opts.startArg));
    }
    
    // initialise the module of the options
    opts.module = opts.module || module.parent;
    
    // initialise the default commands to include 'run'
    opts.defaultCommands = opts.defaultCommands || ['run'];
    
    // create the scaffolder
    scaffolder = new Scaffolder(opts);

    // once the scaffolder is ready, run the main entry point
    scaffolder.once('ready', function() {
        debug('scaffolder ready, running main entry point');
        
        // run the main function 
        // if an init function has been passed, that will run
        // otherwise commands will be run if they are specified on the cli
        if (typeof opts.runMain == 'undefined' || opts.runMain) {
            scaffolder.main(opts, initFn);
        }
    });
    
    return scaffolder;
};