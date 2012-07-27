var assert = require('assert'),
    scaffolder = require('../'),
    path = require('path'),
    srcPath = path.resolve(__dirname, '..'),
    scaffolderOpts = {
        argv: [],
        silent: true
    },
    _ = require('underscore');

describe('scaffolder initialization tests', function() {
    it('should be able to detect the package path for the current app', function(done) {
        scaffolder(scaffolderOpts).on('ready', function() {
            assert.equal(this.srcPath, srcPath);
            done();
        });
    });
    
    it('should be able to map an object onto the scaffolder', function(done) {
        var s = scaffolder(_.extend({ test: true }, scaffolderOpts));
        s.on('ready', function() {
            assert.equal(this.test, true);
            done();
        });
    });
    
    it('should be able to map an function onto the scaffolder', function(done) {
        var s = scaffolder(_.extend({
            test: function() { return true; }
        }, scaffolderOpts));
        
        s.on('ready', function() {
            assert.equal(typeof this.test, 'function');
            assert.equal(this.test(), true);
            done();
        });
    });
    
    it('should be able to include an initialization function that will be called before ready', function(done) {
        var initialized = false,
            s = scaffolder(_.extend({
                init: function(callback) {
                    initialized = true;
                    callback();
                }
            }));
            
        s.on('ready', function() {
            assert(initialized);
            done();
        });
    });
    
    it('should be able to run multiple initialization functions', function(done) {
        var initA = false,
            initB = false,
            s = scaffolder(_.extend({
                init: [
                    function(callback) {
                        initA = true;
                        callback();
                    },
                    
                    function(callback) {
                        initB = true;
                        callback();
                    }
                ]
            }));
            
        s.on('ready', function() {
            assert(initA);
            assert(initB);
            done();
        });
    });
    
    it('should be able to load package data', function(done) {
        var s = scaffolder();
        
        s.on('ready', function() {
            s.loadPackage(function(err, data) {
                assert.ifError(err);
                assert(data);
                
                done(err);
            });
        });
    });
});