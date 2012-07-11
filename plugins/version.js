module.exports = function(commands, callback) {
    callback(null, '!{grey}' + this.packageData.version);
};