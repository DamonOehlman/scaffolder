var debug = require('debug')('scaffolder'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Command = require('commander').Command,
    revalidator = require('revalidator'),
    out = require('out'),
    ncp = require('ncp').ncp,
    _ = require('underscore');
    
var Scaffolder = exports.Scaffolder = function() {
    // call the inherited constructor
    Command.call(this);
}; // Scaffolder

// inherit from command
Scaffolder.prototype.__proto__ = Command.prototype;

Scaffolder.prototype.copyAssets = function(assetPath, callback, targetPath) {
    // initialise the target path to the default target path
    targetPath = targetPath || this.targetPath;
    
    // copy the client files to the root build path
    ncp(this.getAssetPath(assetPath), targetPath, callback);
}; //copyAssets

Scaffolder.prototype.getAssetPath = function(asset) {
    return path.join(this.assetPath, asset || '');
}; // getAssetPath

Scaffolder.prototype.init = function(appPath, opts) {
    var scaffolder = this,
        basePath = path.resolve(appPath),
        packageFile = path.join(basePath, 'package.json');
        
    debug('initializing scaffolder on path: ' + basePath);
    
    // ensure we have some options
    opts = opts || {};
    opts.extraOpts = opts.extraOpts || {};
    
    // initialise the application path
    this.appPath = appPath;
    this.assetPath = path.join(basePath, 'assets');
    
    // look for a package.json in the specified target path
    debug('attempting to read package information file: ' + packageFile);
    fs.readFile(packageFile, 'utf8', function(err, contents) {
        if (! err) {
            var packageData = JSON.parse(contents);

            debug('package file found, setting program version to: ' + packageData.version);
            scaffolder.version(packageData.version);
        } // if
        
        if (opts.usage) {
            scaffolder.usage(opts.usage);
        }
        
        // TODO: review whether this belongs here...
        scaffolder.option('-p, --path [path]', 'Target output path (default to current directory)');
        
        // add the additional options
        for (var key in opts.extraOpts) {
            scaffolder.option(key, opts.extraOpts[key]);
        } // for

        // load the config
        scaffolder.loadConfig(function(config) {
            // update configuration variables
            _.extend(scaffolder, opts.defaults, config);
            
            // parse the command line
            scaffolder.parse(process.argv);

            // set the target path
            scaffolder.targetPath = path.resolve(scaffolder.path);
            debug('target path set to: ' + scaffolder.targetPath);
            
            // load the actions
            scaffolder.loadActions(basePath, function() {
                debug('scaffolder ready');
                scaffolder.emit('ready', scaffolder[scaffolder.args]);
            });
        });
    });
}; // init

Scaffolder.prototype.loadActions = function(basePath, callback) {
    var scaffolder = this,
        actionPath = path.join(basePath, 'lib/actions');
    
    debug('looking for actions in: ' + actionPath);
    fs.readdir(actionPath, function(err, files) {
        if (! err) {
            // iterate through the files found
            files.forEach(function(file) {
                var actionName = path.basename(file, '.js');
                
                // check that the action is not already taken
                if (scaffolder.hasOwnProperty(actionName)) {
                    throw new Error('Unable to assign action to already used member: "' + actionName + '"');
                }

                // add the action to the generator
                scaffolder[actionName] = require(path.join(actionPath, actionName));
                debug('loaded action: ' + actionName);
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

Scaffolder.prototype.request = function(prompts, callback) {
    var data = {},
        requestFns = [],
        scaffolder = this,
        validationResult;
        
    function requestValues() {
        // reset the request functions
        requestFns = [];
        
        // iterate through the prompts and initialise the object
        _.each(prompts, function(value, key) {
            requestFns.push(function(itemCallback) {
                var existingVal = data[key] || value['default'],
                    message = value.description + (existingVal ? ' [' + existingVal + ']' : '') + ': ';

                debug('requesting user input for field: ' + key + ', existing value: ' + existingVal);
                scaffolder.prompt(message, function(value) {
                    // fallback to the default value if not provided
                    value = value || existingVal;
                    debug('received value of "' + value + '" for field: ' + key);
                    
                    if (value) {
                        data[key] = value;
                    }
                    
                    itemCallback();
                });
            });
        });
        
        out('\n!{grey}Please provide the following information:');
        
        async.series(requestFns, function() {
            debug('all input received, validating data: ', data);
            
            // validate the data
            validationResult = revalidator.validate(data, { properties: prompts });
            debug('received validation result for input, valid = ' + validationResult.valid, validationResult);
            
            // if not valid, then output the errors, and then request the data again
            if (! validationResult.valid) {
                var message = '\n!{grey}Errors were detected with your responses: \n';
                
                validationResult.errors.forEach(function(errorData) {
                    message += (prompts[errorData.property].description || errorData.property) + 
                          ' => !{red}' + (errorData.message || 'is invalid\n');
                });
                
                out(message);
                requestValues();
            }
            else {
                // terminate the stdin
                process.stdin.destroy();

                // if we have a callback, then trigger it
                if (callback) {
                    callback(data);
                }
            }
        });
    }
    
    requestValues();
};

/* function exports */

exports = module.exports = new Scaffolder;

exports.create = function(appPath, opts) {
    // create a scaffolder
    var scaffolder = new Scaffolder();
    
    // initialise the scaffolder
    scaffolder.init(appPath, opts);
    return scaffolder;
};