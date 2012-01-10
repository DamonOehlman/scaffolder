var debug = require('debug')('scaffolder'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    events = require('events'),
    util = require('util'),
	mkdirp = require('mkdirp'),
    Command = require('commander').Command,
    revalidator = require('revalidator'),
    out = require('out'),
    ncp = require('ncp').ncp,
    _ = require('underscore');
    
// ## Helper Functions

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
};

function _handleError(error) {
    out('!{red}' + error.message);
    
    // exit the process
    process.exit();
};

var Scaffolder = exports.Scaffolder = function() {
    // create an instance of out attached to the scaffolder
    this.out = out;
    
    // call the inherited constructor
    Command.call(this);
}; // Scaffolder

util.inherits(Scaffolder, Command);

Scaffolder.prototype.copyAssets = function(assetPath, callback, targetPath) {
	var srcPath = this.getAssetPath(assetPath);
	
    // initialise the target path to the default target path
    targetPath = targetPath || this.targetPath;

	// ncp doesn't make the root directory, so create it
	mkdirp(targetPath, function(err) {
	    // copy the client files to the root build path
		debug('copying assets: ' + srcPath + ' => ' + targetPath);
	    ncp(srcPath, targetPath, callback);
	});
    
}; //copyAssets

Scaffolder.prototype.getAssetPath = function(asset) {
    return path.join(this.assetPath, asset || '');
}; // getAssetPath

Scaffolder.prototype.error = function(error) {
    if (error instanceof Error) {
        throw error;
    }
    else {
        var err = new Error(error);
        err.scaffolding = true;

        throw err;
    }
};

Scaffolder.prototype.init = function(appPath, opts) {
    var scaffolder = this,
        basePath = path.resolve(appPath);
        
    debug('initializing scaffolder on path: ' + basePath);
    
    // ensure we have some options
    opts = opts || {};
    opts.extraOpts = opts.extraOpts || {};
    
    // add the path to the extra opts
    opts.extraOpts['-p, --path [path]'] = 'Target output path (default to current directory)';
    
    // initialise the application path
    this.appPath = basePath;
    this.assetPath = path.join(basePath, 'assets');
    
    this.loadPackageData(function(err, packageData) {
        if (! err) {
            debug('package file found, setting program version to: ' + packageData.version);
            scaffolder.version(packageData.version);
        } // if
        
        if (opts.usage) {
            scaffolder.usage(opts.usage);
        }
        
        // add the additional options
        for (var key in opts.extraOpts) {
            scaffolder.option(key, opts.extraOpts[key], opts[key]);
        } // for

        // load the config
        scaffolder.loadConfig(function(config) {
            // update configuration variables
            _.extend(scaffolder, opts.defaults, config);
            
            // parse the command line
            scaffolder.parse(process.argv);
            
            // iterate through the options
            scaffolder.options.forEach(function(option) {
                var optName = option.name();
                
                // update the scaffolder value to use the option default
                // if the parsed value is undefined
                if (typeof scaffolder[optName] == 'undefined') {
                    debug('option "' + optName + '" has no value, using default value: ' + opts[optName]);
                    scaffolder[optName] = opts[optName];
                }
            });
            
            // set the target path
            scaffolder.targetPath = path.resolve(scaffolder.path);
            debug('target path set to: ' + scaffolder.targetPath);
            
            // load the actions
            scaffolder.loadActions(basePath, function() {
                var targetAction = scaffolder.args[0];
                
                debug('scaffolder ready, requesting action: ' + targetAction);
                scaffolder.emit('ready', scaffolder[targetAction], scaffolder.args.slice(1));
            });
        });
    });
}; // init

Scaffolder.prototype.loadActions = function(basePath, callback) {
    var scaffolder = this,
        actionPath = path.join(basePath, 'lib/actions');
        
    function loadActionHandler(file, itemCallback) {
        var actionFile = path.join(actionPath, file);
        
        fs.stat(actionFile, function(err, stats) {
            if ((! err) && stats.isFile()) {
                var actionName = path.basename(file, '.js');

                // check that the action is not already taken
                if (scaffolder.hasOwnProperty(actionName)) {
                    throw new Error('Unable to assign action to already used member: "' + actionName + '"');
                }

                // add the action to the generator
                scaffolder[actionName] = require(actionFile);
                debug('loaded action: ' + actionName);
            }
            else {
                debug('skipping: ' + actionFile);
            }
            
            itemCallback();
        });
    }
    
    debug('looking for actions in: ' + actionPath);
    fs.readdir(actionPath, function(err, files) {
        if (! err) {
            async.forEach(files, loadActionHandler, callback || function() {});
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

Scaffolder.prototype.loadPackageData = function(callback) {
    var packageFile = path.join(this.targetPath, 'package.json');
    
    // look for a package.json in the specified target path
    debug('attempting to read package information file: ' + packageFile);
    fs.readFile(packageFile, 'utf8', function(err, contents) {
        if (! err) {
            try {
                contents = JSON.parse(contents);
            }
            catch (e) {
                err = e;
            }
        }
        
        callback(err, contents);
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

Scaffolder.prototype.run = function(defaultAction, callback) {
    var scaffolder = this;
    
    this.once('ready', function(action, extraArgs) {
        // use the default action if not specified
        action = action || scaffolder[defaultAction];
        
        // if the action is not specified, then raise a scaffolder error
        if (! action) {
            scaffolder.error('Unable to run the specified action, no handler');
        }
        
        action.call(scaffolder, scaffolder, extraArgs, callback);
    });
    
    process.removeListener('uncaughtException', _handleError);
    process.on('uncaughtException', _handleError);
};

/* function exports */

exports = module.exports = new Scaffolder;

exports.create = function(appPath, opts) {
    // create a scaffolder
    var scaffolder = new Scaffolder();
    
    // if appPath is in fact a module definition, then look for a package json and then fire the callback
    if (appPath.filename) {
        _findPackage(appPath.filename, function(packagePath) {
            scaffolder.init(packagePath, opts);
        });
    }
    else {
        scaffolder.init(appPath, opts);
    }

    return scaffolder;
};