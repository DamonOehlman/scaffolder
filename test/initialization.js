var scaffolder = require('../'),
    path = require('path'),
    expect = require('expect.js'),
    srcPath = path.resolve(__dirname, '..'),
    scaffolderOpts = {
        argv: [],
        silent: true
    },
    _ = require('underscore');

describe('scaffolder initialization tests', function() {
    it('should be able to detect the package path for the current app', function(done) {
        scaffolder(scaffolderOpts).on('ready', function() {
            expect(this.srcPath).to.equal(srcPath);
            done();
        });
    });
    
    it('should be able to map an object onto the scaffolder', function(done) {
        var s = scaffolder(_.extend({ test: true }, scaffolderOpts));
        s.on('ready', function() {
            expect(this.test).to.equal(true);
            done();
        });
    });
    
    it('should be able to map an function onto the scaffolder', function(done) {
        var s = scaffolder(_.extend({
            test: function() { return true; }
        }, scaffolderOpts));
        
        s.on('ready', function() {
            expect(typeof this.test).to.equal('function');
            expect(this.test()).to.equal(true);
            done();
        });
    });
});