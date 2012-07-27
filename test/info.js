var assert = require('assert'),
    scaffolder = require('../'),
    _ = require('underscore'),
    baseOpts = require('./helpers/opts');

describe('scaffolder informational output helpers', function() {
    it('should be able to provide command line help', function(done) {
        var s = scaffolder(_.extend({ help: true }, baseOpts));
        
        s.on('ready', function() {
            done();
        });
    });
});