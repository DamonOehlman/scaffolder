var squirrel = require('squirrel');

module.exports = function(src, dest, callback) {
    var scaffolder = this;

    // create a dummy callback if we don't have one
    callback = callback || function() {};
    
    squirrel(['ncp', 'mkdirp'], { allowInstall: 'prompt' }, function(err, ncp, mkdirp) {
        if (err) return callback(err);
        
        // get the source path for the package
        scaffolder.getPath(function(basePath) {
            src = path.resolve(basePath, src);

            debug('attempting to copy files from ' + src + ' ==> ' + dest);

            // if the path exists, copy the files
            _exists(src, function(exists) {
                if (exists) {
                    mkdirp(dest, function(err) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            ncp(src, dest, callback);
                        }
                    });
                }
                else {
                    callback(new Error('no source files'));
                }
            });
        });
    });
};