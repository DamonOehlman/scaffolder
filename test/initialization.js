var scaffolder = require('../'),
    path = require('path'),
    expect = require('expect.js'),
    srcPath = path.resolve(__dirname, '..'),
    scaffolderOpts = {
        argv: [],
        silent: true
    };

describe('scaffolder initialization tests', function() {
    it('should be able to detect the package path for the current app', function(done) {
        scaffolder(scaffolderOpts).on('ready', function() {
            expect(this.srcPath).to.equal(srcPath);
            done();
        });
    });
});