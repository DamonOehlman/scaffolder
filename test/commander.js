var assert = require('assert'),
    scaffolder = require('../lib/scaffolder').create(__dirname);
    
describe('scaffolder supports commander functions', function() {
    it('should support the usage method', function() {
        assert.ok(scaffolder.usage);
        assert.strictEqual(scaffolder.usage('example usage'), scaffolder);
    });
});