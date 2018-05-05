'use strict';
var loadJsonFile = require('load-json-file');

try {
    var configuration = loadJsonFile.sync('config.json');
} catch (e) {
    throw 'File "config.json" does not exist. You can make your own config file from the "config.template.json".'
}

var handler;
if (!!configuration.bitbucketUrl) {
    handler = require('./bitbucketHandler');
} else {
    handler = require('./localGitHandler');
}

handler.init(configuration);
exports.createRequest = handler.createRequest;
exports.getBranches = handler.getBranches;
exports.getEnvs = handler.getEnvs;
exports.getFeatures = handler.getFeatures;
exports.getScenarios = handler.getScenarios;
// exports.getProfiles = handler.getProfiles;