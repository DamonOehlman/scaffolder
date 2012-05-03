var scaffolder = require('../'),
    path = require('path'),
    expect = require('expect.js'),
    srcPath = path.resolve(__dirname, '..');

describe('scaffolder initialization tests', function() {
    it('should be able to detect the package path for the current app', function(done) {
        scaffolder().on('ready', function() {
            expect(this.srcPath).to.equal(srcPath);
            done();
        });
    });
});