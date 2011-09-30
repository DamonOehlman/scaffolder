var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    events = require('events'),
    program = require('commander');
    
function Scaffolder(targetPath, opts) {
    // ensure we have some options
    opts = opts || {};
    
    // set option details
    opts.usage = opts.usage || '[options] action (default action = run)';
    opts.extraOpts = opts.extraOpts || {};

    // look for a package.json in the specified target path
    fs.readFile(path.join(targetPath, 'package.json'), 'utf8', function(err, contents) {
        if (! err) {
            var packageData = JSON.parse(contents);

            program.version(packageData.version);
        } // if
        
        program.usage(opts.usage);
        program.option('-p, --path [path]', 'Target output path (default to current directory)');
        
        // add the additional options
        for (var key in opts.extraOpts) {
            program.option(key, opts.extraOpts[key]);
        } // for

        // parse the command line
        program.parse(process.argv);

        // emit the ready event
        this.emit('ready', program);
    });
} // Scaffolder

util.inherits(Scaffolder, events.EventEmitter);

module.exports = Scaffolder;