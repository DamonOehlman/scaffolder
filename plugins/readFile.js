module.exports = function(filename, encoding, callback) {
    this.getPath(function(filepath) {
        var targetFile = path.join(filepath, 'assets', filename);
        debug('reading file: ' + targetFile);
        
        // deal with the 2 arguments case
        if (typeof encoding == 'function') {
            fs.readFile(targetFile, encoding);
        }
        // when an encoding has been provided then use the 3 arg format
        else {
            fs.readFile(targetFile, encoding, callback);
        }
    });
};