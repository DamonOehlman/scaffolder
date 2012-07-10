module.exports = function(templateFile, opts, callback) {
    var scaffolder = this;
    
    // remap args if required
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    }
    
    // ensure options are defined
    opts = opts || {};
    
    // initialise the default template engine to handlebars
    opts.engine = opts.engine || 'handlebars';

    // use squirrel to load the requested template engine
    squirrel(opts.engine, { allowInstall: 'prompt' }, function(err, engine) {
        if (err) return callback(err);
        
        // read the file
        scaffolder.readFile(templateFile, 'utf8', function(err, content) {
            if (err) return callback(err);
            
            // otherwise, generate the template
            callback(null, engine(content));
        });
    });
};