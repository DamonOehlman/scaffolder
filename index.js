/* jshint node: true */
'use strict';

var async = require('async');
var debug = require('debug')('scaffolder');
var events = require('events');
var util = require('util');
var fs = require('fs');
var path = require('path');
var nopt = require('nopt');
var out = require('out');
var read = require('read');
var squirrel = require('squirrel');
var _ = require('underscore');
var findPackage = require('./helpers/find-package');
var filters = require('./helpers/filters');
var pathPlugins = path.resolve(__dirname, 'plugins');
var pluginFiles = fs.readdirSync(pathPlugins).filter(filters.jsOnly);

// define the core commands
var coreCommands = {
  known: {
    'silent': Boolean,
    'help': Boolean,
    'version': Boolean
  },
  
  shorthand: {}
};

/**
  # Scaffolder

  Scaffolder is a node package that is designed to make the process of making
  node CLI applications simpler.  The project is a work in
  progress, and pull requests are definitely welcome.

  ## Overview

  I've written quite a few cli tools using node now, and initially I used
  [commander](https://github.com/visionmedia/commander.js) a bit and then
  experimented with
  [my own cli focused library](https://github.com/DamonOehlman/climate).
  Once I came across [nopt](https://github.com/isaacs/nopt) though everything
  changed, and I've been pretty much using it exclusively since.

  While nopt provides amazing option parsing functionality, there are things
  I do find myself doing again and again when writing cli apps.


  Things such as:

  - copying particular files from one place to another
  - running blocks of code in response to the user requesting a particular
    action from the command line

  Scaffolder is designed to ease the process of making CLI apps using node
  by adopting some conventions for writing your CLI app.

  ## Writing a CLI application using Scaffolder

  The first thing you should probably do if you are writing a CLI application
  in node, is to create a simple shell script that will run your application.
  For my applications that make use of scaffolder such a script looks
  something like this:

  ```
  #!/usr/bin/env node
  require('scaffolder')();
  ```

  This code is significantly less than what you would see in most shell
  scripts that kick off a node process and this is because of the
  conventions that Scaffolder uses.

  ## Scaffolder Conventions

  Before reading this section, I would encourage you to read the README
  for the [nopt](https://github.com/isaacs/nopt) package as some understanding
  of how nopt works will be helpful.

  ### Command Handlers

  A CLI application built using scaffolder will likely be powered by a number
  of command handlers.  A command handler is simply a node module (usually
  located in the `lib/commands` folder for the project) that provides a
  number of exports that make the command work.  In the simplest case a
  command handler will look like this:

  ```js
  exports.description = 'A test action';
  exports.run = function(opts, callback) {
      callback(null, 'ok');
  };
  ```

  Typically, though a command handler will use a variety of command-line
  flags to modify it's behaviour and these can be configured by providing
  an `args` export, e.g.

  ```js
  exports.args = {
      url:    'url',
      path:   path
  };
  ```

  These arguments are defined as per standard
  [nopt](https://github.com/isaacs/nopt) options and an optional `shorthand`
  export can also be provided to provide shorthand equivalents for the
  defined options.

  Once defined in the `args` export, any arguments that are parsed
  successfully from `process.argv` will be provided as part of the `opts`
  object that is passed into the `run` function declared in the command
  handler.

  ## Overriding Scaffolder Defaults

  When scaffolder is run (using `require('scaffolder')()`) a number of
  default options are passed through, but these can be overriden by providing
  an options object.  The defaults of this options object are shown below:

  ```js
  require('scaffolder')({
    // an array of default command strings that will attempt to
    // be invoked if no options are provided
    defaultCommands: [],  

    // provide any default args that individual commands 
    // will incorporate / overwrite
    defaultArgs: {},

    // default nopt shorthand options 
    defaultShorthand: {},

    // the path the scaffolder commands will be loaded from
    commandPath: '', // defaults to the commands/ folder of the project
  });
  ```

  ## Scaffolder Helpers

  When running an action, scaffolder provides a number of helper methods
  for performing common tasks.

  ### Copying Files

  ```js
  scaffolder.copy(src, dst, callback);
  ```

  The `copy` method provides an interface to the really useful
  [ncp](https://github.com/AvianFlu/ncp) which can be used to copy all
  the files in `src` to `dst`.  The scaffolder `copy` method also ensures
  that the `dst` directory exists before starting the copy operation.

  __NOTE:__ The `src` path is relative to the npm package that has
  incorporated scaffolder (unless absolute), but `dst` path is relative
  to the cwd.

  ## Reference
**/

/**
  ### Scaffolder(opts)
**/
function Scaffolder(opts) {
  var scaffolder = this;
  
  // ensure we have options
  opts = opts || {};
  
  // initialise the empty commands array
  this.commands = {};
  
  this.targetModule = opts.module;
  this.ready = false;
  
  // initialise the squirrel allowInstall option to 'prompt'
  opts.allowInstall = opts.allowInstall || 'prompt';
  
  // save the opts for passing through to other objects
  this.opts = opts;
  
  // if we are not running in silent mode, then handle errors by
  // pushing them to output
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
    debug('looking for package.json, starting: ' + this.targetModule.filename);
    findPackage(this.targetModule.filename, function(err, srcPath) {
      var initializers = [
        scaffolder.loadPackage,
        scaffolder.loadActions
      ].concat(opts.init || []);

      // bind each of the initializers to the scaffolder instance
      initializers = initializers.map(function(initializer) {
        return initializer.bind(scaffolder, opts);
      });
      
      // if we encountered an error, then emit an error event and
      // abort processing
      if (err) {
        return scaffolder.emit('error', err);
      }
      
      // initialise the default asset path
      scaffolder.assetPath = opts.assetPath ||
        path.resolve(srcPath, 'assets');
      
      // initialise the default command path
      scaffolder.commandPath = opts.commandPath ||
        path.resolve(srcPath, 'lib', 'commands');
      
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

/**
  #### getPath(callback)

  Get the path the scaffolder considers the source path
**/
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

/**
  #### loadActions(opts, callback)

**/
Scaffolder.prototype.loadActions = function(opts, callback) {
  // determine the action path
  var commandPath = path.resolve(this.srcPath, this.commandPath);
  var scaffolder = this;
  
  // read the files in the action path
  debug('attempting to load action definitions from: ' + commandPath);
  fs.readdir(commandPath, function(err, files) {
    var command;
    var reqErr;
    var commandModule;
    
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
        reqErr = reqErr || new Error('Unable to load: ' + commandModule);
      }

      // if we loaded the action succesfully, then add a few extra details
      if (command) {
        command.name = command.name || path.basename(file, '.js');
        scaffolder.commands[command.name] = command;
      }
    });
    
    callback(reqErr);
  });
};

/**
  #### loadPackage(opts, callback)

**/
Scaffolder.prototype.loadPackage = function(opts, callback) {
  var scaffolder = this;
  var packagePath = path.join(this.srcPath, 'package.json');
  var packageData;

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // load the package.json file from the specified directory
  fs.readFile(packagePath, 'utf8', function(err, data) {
    // if we read the file successfully, then parse it
    if (! err) {
      try {
        scaffolder.packageData = JSON.parse(data);
      }
      catch(e) {
        err = new Error('Unable to parse package.json');
      }
    }
    
    callback(err, scaffolder.packageData);
  });
};

/**
  #### main(opts, handler)
**/
Scaffolder.prototype.main = function(opts, handler) {
  var scaffolder = this;
  var runCommand = true;
  
  // if we have no arguments, then check the command line args
  if (typeof opts == 'function') {
    handler = opts;
    opts = {};
  }
  
  // create a copy of the opts so changes don't get pushed back
  // to the original object
  opts = _.clone(opts);
  
  // get the commands list
  opts.commands = opts.commands || (opts.argv || {}).remain || [];
  
  // if commands is not an array, then make it one
  if (! Array.isArray(opts.commands)) {
    opts.commands = [opts.commands];
  }
  
  // filter out missing commands
  opts.commands = (opts.commands || []).filter(function(command) {
    return scaffolder.commands[command];
  });
  
  // use the default commands if we have not parsed out valid commands
  if (opts.commands && opts.commands.length === 0 && (! opts.help)) {
    debug('no commands specified, using defaults: ', opts.defaultCommands);
    
    // return only default commands that actually exist
    // i.e. don't attempt to run the "run" command if no handler is defined
    opts.commands = (opts.defaultCommands || []).filter(function(command) {
      return scaffolder.commands[command];
    });
  }
  
  debug('handler = ' + handler + ', help = ' + opts.help +
    ', version = ' + opts.version + ', commands to run: ', opts.commands);

  // if we have no commands and no handler, then set the help flag
  opts.help = opts.help || (opts.commands.length === 0 && (! handler));
  
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
      async.mapSeries(
        opts.commands,
        scaffolder.run.bind(scaffolder),
        function(err, results) {
          scaffolder.emit(err ? 'error' : 'done', err, results);
        }
      );
    }
  }
};

/**
  #### read(prompts, callback)

  Request either a single prompt from the user, or a series of prompts and
  then return the results from the prompt.
**/
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

/**
  #### run(name, opts?, callback)

  Run the requested command with the supplied opts (if provided).  Upon
  completion of the command the callback will be triggered.

**/
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
  
  // remove handled commands from the list
  opts.argv.remain = _.difference(opts.argv.remain, Object.keys(this.commands));
  
  // run the action handler
  command.run.call(this, opts, callback);
};

/**
  #### squirrel(requirements, opts, callback)

  __deprecated__
**/
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
  Scaffolder.prototype[path.basename(pluginFile, '.js')] =
    require('./plugins/' + pluginFile);
});

exports = module.exports = function(opts, initFn) {
  var scaffolder;
  
  if (typeof opts == 'function') {
    initFn = opts;
    opts = {};
  }
  
  // ensure we have options
  opts = opts || {};
  
  // initialise the start arg to 0 if custom args have been provided, 
  // or 2 if we are using process.argv
  opts.startArg = opts.argv ? 0 : 2;

  // initialise the cmdline to process argv
  opts.argv = opts.argv || process.argv;
  debug('processing args: ', opts.argv.slice(opts.startArg));

  // add the core commands to the default args
  opts.defaultArgs = _.extend(opts.defaultArgs || {},
    coreCommands.known);

  opts.defaultShorthand = _.extend(opts.defaultShorthand || {},
    coreCommands.shorthand);
  
  // extend the opts by parsing with nopt
  if (typeof opts.parseOpts == 'undefined' || opts.parseOpts) {
    opts = _.extend({}, opts, nopt(
      opts.defaultArgs,
      opts.defaultShorthand,
      opts.argv, opts.startArg));
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