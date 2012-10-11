var debug = require('debug')('scaffolder'),
    _ = require('underscore'),
    path = require('path'),
    fs = require('fs'),
    pathTemplates = path.resolve(__dirname, '..', 'assets', 'templates');
    
// include underscore string functions
_.mixin(require('underscore.string').exports());

module.exports = function(commandList, callback) {
    var command, 
        helpText = '',
        scaffolder = this;
    
    // if we have 0 commands specified, then produce the command list help
    if (commandList.length > 0) {
        command = this.commands[commandList[0]];
    }
    
    // if we have a command, then provide help on the command
    if (typeof command == 'object') {
        callback(null, command.help || command.description);
    }
    else {
        debug('generating help for commands: ', Object.keys(this.commands));
        fs.readFile(path.join(pathTemplates, 'help.txt'), 'utf8', function(err, data) {
            if (err) return callback(err);

            callback(null, _.template(data, {
                packageData: scaffolder.packageData,
                lineBreak: '=========================================================================',
                commands: scaffolder.commands
            }));
        });
    }
};