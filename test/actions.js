var scaffolder = require('../'),
    path = require('path'),
    expect = require('expect.js'),
    srcPath = path.resolve(__dirname, '..'),
    scaffolderOpts = {
        actionPath: path.resolve(__dirname, 'test-actions')
    };

describe('scaffolder action loader tests', function() {
    it('should be able to load actions', function(done) {
        scaffolder(module, scaffolderOpts).on('ready', function() {
            expect(this.actions).to.be.ok();
            expect(this.actions.test).to.be.ok();
            done();
        });
    });
});