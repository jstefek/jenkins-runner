'use strict';

var bitbucketUrl, bitbucketProject, bitbucketRepo, jenkinsJobToken, jenkinsJobUrl, basicAuthToken,
    request = require('request'),
    utils = require('../utils/utils');

function getRestURL() {
    return bitbucketUrl + 'projects/' + bitbucketProject + '/repos/' + bitbucketRepo + '/'
}

function sendFileNamesFromGitBranch(dir, branch, filter, res, map) {
    console.log('sendFileNamesFromGitBranch');
    branch = branch || 'master';
    console.log('sendProfileNames');
    request.get({
        url: getRestURL() + 'last-modified/' + dir + '?at=' + branch,
        headers: {
            "Authorization": "Basic " + basicAuthToken,
            'Accept': 'application/json, text/javascript'
        },
    }, function (error, response, body) {
        res.status(response.statusCode);
        if (!!error) {
            res.send(error);
        } else {
            console.log('sendFileNamesFromGitBranch done');
            var jfiles = JSON.parse(response.body).files;
            var files = [];
            for (var a in jfiles) {
                files.push(a);
            }
            files = files.sort();
            if (!!filter) {
                files = files.filter(filter);
            }
            if (!!map) {
                files = files.map(map);
            }
            res.send(files);
        }
    });
}

function sendBranches(res) {
    console.log('sendBranches');
    request.get({
        url: getRestURL() + 'branches',
        headers: {
            "Authorization": "Basic " + basicAuthToken,
            'Accept': 'application/json, text/javascript'
        }
    }, function (error, response, body) {
        res.status(response.statusCode);
        if (!!error) {
            res.send(error);
        } else {
            console.log('sendBranches done');
            var body = JSON.parse(response.body);
            res.send(body.values.map(function (val) {
                return val.displayId;
            }));
        }
    });
}

// function sendProfileNames(filename, branch, res) {
//     console.log('sendProfileNames');
//     request.get({
//         url: getRestURL() + 'browse/' + filename + '?at=refs/heads/' + branch,
//         headers: {
//             "Authorization": "Basic " + basicAuthToken,
//             'Accept': 'application/json, text/javascript'
//         },
//     }, function (error, response, body) {
//         res.status(response.statusCode)
//         if (!!error) {
//             res.send(error);
//         } else {
//             console.log('sendProfileNames done');
//             res.send(JSON.parse(response.body)
//                 .lines
//                 .map(function (val) {
//                     return val.text;
//                 })
//                 .map(function (value) {
//                     value = value.trim();
//                     if (value.indexOf('#') === 0) {
//                         return '';
//                     }
//                     return value.substring(0, value.indexOf(':'));
//                 }).filter(function (value) {
//                     return !!value;
//                 }).sort());
//         }
//     });
// }

function sendScenariosNames(pathToFeature, branch, res) {
    console.log('sendScenariosNames');
    branch = branch || 'master';
    request.get({
            url: getRestURL() + 'browse/' + pathToFeature + '?at=' + branch,
            headers: {
                "Authorization": "Basic " + basicAuthToken,
                'Accept': 'application/json, text/javascript'
            }
        }, function (error, response, body) {
            res.status(response.statusCode);
            if (!!error) {
                res.send(error);
            } else {
                console.log('sendScenariosNames done');
                res.send(
                    utils.extractScenarios(
                        JSON.parse(response.body)
                            .lines
                            .map(function (val) {
                                return val.text
                            })
                    ));
            }
        }
    );
}

exports.init = function (config) {
    var base64 = require('base-64');
    var bitbucketAccount = config.bitbucketAccount;
    var bitbucketPass = config.bitbucketPass;
    bitbucketProject = config.bitbucketProject;
    bitbucketRepo = config.bitbucketRepo;
    bitbucketUrl = config.bitbucketUrl;
    jenkinsJobToken = config.jenkinsJobToken;
    jenkinsJobUrl = config.jenkinsJobUrl;
    if (!bitbucketUrl) {
        throw 'bitbucketUrl has to be defined in config.json'
    }
    if (!bitbucketProject) {
        throw 'bitbucketProject has to be defined in config.json'
    }
    if (!bitbucketRepo) {
        throw 'bitbucketRepo has to be defined in config.json'
    }
    if (!bitbucketAccount) {
        throw 'bitbucketAccount has to be defined in config.json'
    }
    if (!bitbucketPass) {
        throw 'bitbucketPass has to be defined in config.json'
    }
    if (!jenkinsJobToken) {
        throw 'jenkinsJobToken has to be defined in config.json'
    }
    if (!jenkinsJobUrl) {
        throw 'jenkinsJobUrl has to be defined in config.json'
    }
    basicAuthToken = base64.encode(bitbucketAccount + ':' + bitbucketPass);
};

exports.createRequest = function (req, res) {
    // add token to the form data
    req.body.data.token = jenkinsJobToken;
    // send post request with the data to the Jenkins job
    request.post({url: jenkinsJobUrl, form: req.body.data}, function (error, response, body) {
        res.status(response.statusCode);
        if (!!error) {
            res.send(error);
        } else {
            res.send(response.headers['location']);
        }
    });
};

exports.getBranches = function (req, res) {
    sendBranches(res);
};
exports.getEnvs = function (req, res) {
    sendFileNamesFromGitBranch('config/environments', req.query.branch, function (value) {
        return value.indexOf('.yml') > 0;
    }, res, function (value) {
        return value.replace('.yml', '');
    });
};

exports.getFeatures = function (req, res) {
    sendFileNamesFromGitBranch('features', req.query.branch,
        function (value) {
            return value.indexOf('.feature') > 0;
        }, res);
};

exports.getScenarios = function (req, res) {
    sendScenariosNames('features/' + req.query.feature, req.query.branch, res);
};

// exports.getProfiles = function (req, res) {
//     sendProfileNames('cucumber.yml', req.query.branch, res);
// };