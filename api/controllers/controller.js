'use strict';

var exec = require('child_process').exec,
    request = require('request'),
    loadJsonFile = require('load-json-file');

try {
    var configuration = loadJsonFile.sync('config.json');
} catch (e) {
    throw 'File "config.json" does not exist. You can make your own config file from the "config.template.json".'
}

var path = configuration.pathToGitRepo;
var oldTime = undefined;
var interval = 10000; // millis

function updateIfNeeded() {
    function updateBranches(resolve, reject) {
        console.log('updateBranches');
        exec('git pull --all; for remote in `git branch -r`; do git branch --track ${remote#origin/} $remote; done;', {cwd: path}, function (err, stdout, stderr) {
            if (err) {
                console.log(err);
                reject();
            } else {
                console.log('updateBranches done');
                resolve();
            }
        });
    }

    return new Promise(function (resolve, reject) {
        var newTime = new Date().getTime();
        if (!!oldTime && (newTime - oldTime < interval)) {
            console.log('skipping');
            resolve();
        } else {
            oldTime = newTime;
            // delete local branches
            console.log('delete local branches');
            exec("git checkout .; git checkout master; git branch | grep -v \"master\" | xargs git branch -D", {cwd: path}, function (err, stdout, stderr) {
                if (err) {
                    console.log('ERROR', err);
                    reject();
                } else {
                    updateBranches(resolve, reject);
                }
            });

        }
    });
}

function sendFileNamesFromGitBranch(path, dir, branch, filter, response, map) {
    branch = branch || 'master';
    var cmd = 'git ls-tree -r --name-only [BRANCH] | grep [DIR]'.replace('[BRANCH]', branch).replace('[DIR]', dir);
    exec(cmd, {cwd: path}, function (err, stdout, stderr) {
        if (err) {
            response.status(400).send(err);
            console.log(err);
        } else {
            response.send(
                stdout.split('\n')
                    .filter(filter)
                    .map(function (value) {
                        return value.replace(new RegExp('.*' + dir, 'g'), '').replace(/\//g, '')
                    })
                    .map(function (value) {
                        return !!map ? map(value) : value;
                    })
                    .sort()
            );
        }
    });
}

function sendBranches(path, res) {
    return function () {
        return new Promise(function (resolve, reject) {
            // console.log(new Date());
            exec('git ls-remote --heads origin', {cwd: path}, function (err, stdout, stderr) {
                if (err) {
                    res.status(400).send(err);
                    console.log(err);
                    reject();
                } else {
                    // console.log(new Date());
                    res.send(stdout.split('\n').map(function (value) {
                        return value.substring(value.indexOf('heads/') + 6)
                    }).sort());
                    resolve();
                }
            });
        });
    }
}

function sendProfileNames(path, filename, branch, response) {
    branch = branch || 'master';
    var cmd = 'git show [BRANCH]:[FILENAME]'
        .replace('[BRANCH]', branch)
        .replace('[FILENAME]', filename);
    exec(cmd, {cwd: path}, function (err, stdout, stderr) {
        if (err) {
            response.status(400).send(err);
            console.log(err);
        } else {
            response.send(stdout
                .split('\n')
                .map(function (value) {
                    value = value.trim();
                    if (value.indexOf('#') === 0) {
                        return '';
                    }
                    return value.substring(0, value.indexOf(':'));
                }).filter(function (value) {
                    return !!value;
                }).sort()
            );
        }
    });
}

function sendScenariosNames(path, featureName, branch, response) {
    branch = branch || 'master';
    var cmd = 'git show [BRANCH]:[FILENAME]'
        .replace('[BRANCH]', branch)
        .replace('[FILENAME]', featureName);
    exec(cmd, {cwd: path}, function (err, stdout, stderr) {
        if (err) {
            response.status(400).send(err);
            console.log(err)
        } else {
            response.send(stdout
                .split('\n')
                .map(function (value, index) {
                    value = value.trim();
                    if (value.indexOf('Scenario') === 0) {
                        return {index: index + 1, name: value.substring(value.indexOf(':') + 1).trim()};
                    }
                    return '';
                }).filter(function (value) {
                    return !!value;
                })
            );
        }
    });
}

exports.createRequest = function (req, res) {
    // add token to the form data
    req.body.data.token = configuration.jenkinsJobToken;
    // send post request with the data to the Jenkins job
    request.post({url: configuration.jenkinsJobUrl, form: req.body.data}, function (error, response, body) {
        res.status(response.statusCode)
        if (!!error) {
            res.send(error);
        } else {
            res.send(response.headers['location']);
        }
    });
};

exports.getBranches = function (req, res) {
    updateIfNeeded()
        .then(sendBranches(path, res));
};

exports.getEnvs = function (req, res) {
    sendFileNamesFromGitBranch(path, 'config/environments', req.query.branch, function (value) {
        return value.indexOf('.yml') > 0;
    }, res, function (value) {
        return value.replace('.yml', '');
    });
};

exports.getFeatures = function (req, res) {
    sendFileNamesFromGitBranch(path, 'features', req.query.branch,
        function (value) {
            return value.indexOf('.feature') > 0;
        }, res);
};

exports.getScenarios = function (req, res) {
    sendScenariosNames(path, 'features/' + req.query.feature, req.query.branch, res);
};

exports.getProfiles = function (req, res) {
    sendProfileNames(path, 'cucumber.yml', req.query.branch, res);
};