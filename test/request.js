var assert = require('assert'),
    scaffolder = require('../lib/scaffolder').create(__dirname),
    input = {
        url: {
            description: 'A url',
            defaultMessage: 'A url is required for this field',
            format: 'url',
            required: true
        },
        
        colour: {
            description: 'Favourite colour',
            type: 'string',
            default: 'blue'
        }
    };
    
describe('scaffolder data request and validation', function() {
    it('should prompt for the required information', function(done) {
        this.timeout(0);
        
        scaffolder.request(input, function(data) {
            done();
        });
    });
});