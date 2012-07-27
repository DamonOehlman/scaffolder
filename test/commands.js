var assert = require('assert'),
    scaffolder = require('../'),
    path = require('path'),
    _ = require('underscore'),
    srcPath = path.resolve(__dirname, '..'),
    scaffolderOpts = require('./helpers/opts');

describe('scaffolder action loader tests', function() {
    it('should be able to load actions', function(done) {
        scaffolder(scaffolderOpts).on('ready', function() {
            assert(this.commands);
            assert(this.commands.test);
            done();
        });
    });
    
    it('should be able to run the test action', function(done) {
        scaffolder(_.extend({}, scaffolderOpts, { commands: ['test'] })).on('done', function(err, results) {
            assert.ifError(err);
            assert(results);
            assert(results[0] === 'ok');
            
            done(err);
        });
    });
});