var assert = require('assert'),
    path = require('path'),
    scaffolder = require('../lib/scaffolder'),
    scaf;
    
describe('scaffolder manual option overrides', function() {
    it('should have a path value equal to the current working directory', function(done) {
        scaf = scaffolder.create(__dirname);
        scaf.once('ready', function() {
            assert.equal(scaf.targetPath, process.cwd());
            done();
        });
    });
    
    it('should have a path value of test', function(done) {
        scaf = scaffolder.create(__dirname, { path: '/tmp' });
        scaf.once('ready', function() {
            assert.equal(scaf.targetPath, path.resolve('/tmp'));
            done();
        });
    });
});