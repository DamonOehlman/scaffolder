var debug = require('debug')('scaffolder'),
    _ = require('underscore');

module.exports = function(commandList, callback) {
    var command, helpText = '';
    
    // if we have 0 commands specified, then produce the command list help
    if (commandList.length > 0) {
        command = this.commands[commandList[0]];
    }
    
    // if we have a command, then provide help on the command
    if (typeof command == 'object') {
        helpText = command.help || command.description;
    }
    else {
        debug('generating help for commands: ', Object.keys(this.commands));
        helpText = 'TODO: list the commands';
    }
    
    callback(null, helpText);
};