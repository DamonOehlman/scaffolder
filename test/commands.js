var scaffolder = require('../'),
    path = require('path'),
    expect = require('expect.js'),
    _ = require('underscore'),
    srcPath = path.resolve(__dirname, '..'),
    scaffolderOpts = {
        argv: [],
        silent: true,
        commandPath: path.resolve(__dirname, 'test-commands')
    };

describe('scaffolder action loader tests', function() {
    it('should be able to load actions', function(done) {
        scaffolder(scaffolderOpts).on('ready', function() {
            expect(this.commands).to.be.ok();
            expect(this.commands.test).to.be.ok();
            done();
        });
    });
    
    it('should be able to run the test action', function(done) {
        scaffolder(_.extend({}, scaffolderOpts, { commands: ['test'] })).on('done', function(err, results) {
            expect(results).to.contain('ok');
            done(err);
        });
    });
});