var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    events = require('events'),
    program = require('commander'),
    ncp = require('ncp').ncp,
    _ = require('underscore');
    
var Scaffolder = exports.Scaffolder = function(opts) {
    // save a reference to the scaffolder
    var scaffolder = this;

    // ensure we have some options
    opts = opts || {};
    
    // set option details
    this.usage = opts.usage || '[options] action (default action = run)';
    this.extraOpts = opts.extraOpts || {};
    this.defaults = opts.defaults || {};
    
    // initialise members
    this.targetPath = opts.path || path.resolve('.');
    this.out = opts.out || require('out');
}; // Scaffolder

util.inherits(Scaffolder, events.EventEmitter);

Scaffolder.prototype.copyAssets = function(assetPath, callback, targetPath) {
    // initialise the target path to the default target path
    targetPath = targetPath || this.targetPath;
    
    // copy the client files to the root build path
    ncp(this.getAssetPath(assetPath), targetPath, callback);
}; //copyAssets

Scaffolder.prototype.getAssetPath = function(asset) {
    return path.join(this.assetPath, asset || '');
}; // getAssetPath

Scaffolder.prototype.init = function(appPath, callback) {
    var scaffolder = this;
    
    // initialise the application path
    this.appPath = appPath;
    this.assetPath = path.resolve(appPath, 'assets');
    
    // look for a package.json in the specified target path
    fs.readFile(path.join(appPath, 'package.json'), 'utf8', function(err, contents) {
        if (! err) {
            var packageData = JSON.parse(contents);

            program.version(packageData.version);
        } // if
        
        program.usage(scaffolder.usage);
        program.option('-p, --path [path]', 'Target output path (default to current directory)');
        
        // add the additional options
        for (var key in scaffolder.extraOpts) {
            program.option(key, scaffolder.extraOpts[key]);
        } // for

        // parse the command line
        program.parse(process.argv);
        
        // load the config
        scaffolder.loadConfig(function(config) {
            // update configuration variables
            _.extend(scaffolder, scaffolder.defaults, config, program);
            
            scaffolder.loadActions(appPath, function() {
                if (callback) {
                    callback(scaffolder[program.args]);
                } // if
            });
        });
    });
}; // init

Scaffolder.prototype.loadActions = function(appPath, callback) {
    var scaffolder = this;
    
    fs.readdir(path.resolve(appPath, 'lib/actions'), function(err, files) {
        if (! err) {
            // iterate through the files found
            files.forEach(function(file) {
                var actionName = path.basename(file, '.js');

                // add the action to the generator
                scaffolder[actionName] = require(path.resolve(appPath, 'lib/actions/' + actionName));
            });
        } // if
        
        // fire the callback
        if (callback) {
            callback();
        } // if
    });
};

Scaffolder.prototype.loadConfig = function(callback) {
    var configFile = path.resolve(this.targetPath, 'config.json'),
        scaffolder = this;
    
    fs.readFile(configFile, 'utf8', function(err, data) {
        var config = {};
        
        if (! err) {
            try {
                config = JSON.parse(data);
            }
            catch (e) {
                console.warn('invalid config file: ' + configFile);
            } // try..catch
        } // if
        
        callback(config);
    });
};

/* function exports */

exports.create = function(appPath, callback, opts) {
    // create a scaffolder
    var scaffolder = new Scaffolder(opts);
    
    console.log(appPath);
    
    // initialise the scaffolder
    scaffolder.init(appPath, function(action) {
        if (callback) {
            callback(scaffolder, action);
        } // if
    });
};