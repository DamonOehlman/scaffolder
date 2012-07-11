var scaffolder = require('../');

describe('scaffolder informational output helpers', function() {
    it('should be able to provide command line help', function(done) {
        scaffolder({ version: true, parseOpts: false }).on('ready', function() {
            done();
        });
    });
});