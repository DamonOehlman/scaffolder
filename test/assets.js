var assert = require('assert'),
    path = require('path'),
    scaffolder = require('../')({
        assetPath: path.resolve(__dirname, 'assets'),
        runMain: false
    });

describe('asset loading tests', function() {
    before(function(done) {
        scaffolder.on('ready', done);
    });
    
    it('should be able to load the test file contents', function(done) {
        scaffolder.readFile('test.txt', 'utf8', function(err, content) {
            assert.ifError(err);
            assert.equal(content, 'test file');
            done(err);
        });
    });
});