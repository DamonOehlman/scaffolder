var assert = require('assert'),
    scaffolder = require('../'),
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
    
    it('should be able to include an initialization function that will be called before ready', function(done) {
        var initialized = false,
            s = scaffolder(_.extend({
                init: function(callback) {
                    initialized = true;
                    callback();
                }
            }));
            
        s.on('ready', function() {
            expect(initialized).to.be.ok();
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
            expect(initA).to.be.ok();
            expect(initB).to.be.ok();
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