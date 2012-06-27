var path = require('path'),
    fs = require('fs'),
    _exists = fs.exists || path.exists;

var findPackage = module.exports = function(targetPath, callback) {
    _exists(path.join(targetPath, 'package.json'), function(exists) {
        if (! exists) {
            var parentPath = path.dirname(targetPath);
            if (parentPath !== '/') {
                findPackage(parentPath, callback);
            }
            else if (callback) {
                callback(new Error('Could not find package.json'));
            }
        }
        else if (callback) {
            callback(null, targetPath);
        }
    });
};
