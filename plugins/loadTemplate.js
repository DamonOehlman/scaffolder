var squirrel = require('squirrel');

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
            var template;
            
            if (err) return callback(err);
            
            // first look for a compile function in the template engine
            if (typeof engine == 'function') {
                template = engine(content);
            }
            else if (typeof engine == 'object' && typeof engine.compile == 'function') {
                template = engine.compile(content);
            }
            
            // otherwise, generate the template
            callback(template ? null : new Error('No template function found for engine "' + opts.engine + '"'), template);
        });
    });
};