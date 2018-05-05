'use strict';

module.exports = function (app) {
    var controller = require('../controllers/controller');

    app.route('/branches')
        .get(controller.getBranches);
    app.route('/envs')
        .get(controller.getEnvs);
    app.route('/features')
        .get(controller.getFeatures);
    // app.route('/profiles')
    //     .get(controller.getProfiles);
    app.route('/scenarios')
        .get(controller.getScenarios);
    app.route('/createRequest')
        .post(controller.createRequest);
};