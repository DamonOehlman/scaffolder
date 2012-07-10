var debug = require('debug')('scaffolder'),
    path = require('path'),
    fs = require('fs');

module.exports = function(filename, encoding, callback) {
    var targetFile = path.resolve(this.assetPath, filename);

    debug('reading file: ' + targetFile);
    
    // deal with the 2 arguments case
    if (typeof encoding == 'function') {
        fs.readFile(targetFile, encoding);
    }
    // when an encoding has been provided then use the 3 arg format
    else {
        fs.readFile(targetFile, encoding, callback);
    }
};