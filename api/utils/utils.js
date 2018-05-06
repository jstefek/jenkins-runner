'use strict';

var OUTLINE = 'Scenario Outline', SCENARIO = 'Scenario', PIPE = '|';

function getScenarioName(line) {
    return line.substring(line.indexOf(':') + 1).trim();
}

/**
 * Extracts scenarios from lines in feature file
 * @param lines array of strings
 * @returns {Array} array of extracted scenarios (could be empty). Object with 'name' and 'index' property.
 */
function extractScenarios(lines) {
    var scenarios = [], scenarioOutlineName, inExamples, inScenarioOutline = false, paramNames;
    lines.forEach(function (line, index) {
        line = line.trim();
        if (line.indexOf(OUTLINE) === 0) {
            scenarioOutlineName = getScenarioName(line);
            inScenarioOutline = true;
            inExamples = false;
        } else if (line.indexOf(SCENARIO) === 0) {
            inScenarioOutline = false;
            scenarios.push({index: index + 1, name: getScenarioName(line)});
            scenarioOutlineName = undefined;
        } else if (inScenarioOutline && !inExamples && line.indexOf(PIPE) === 0) {
            inExamples = true;
            paramNames = line
                .substring(line.indexOf(PIPE) + 1, line.lastIndexOf(PIPE))
                .split(PIPE)
                .map(function (value) {
                    return value.trim();
                });
        } else if (inScenarioOutline && inExamples && line.indexOf(PIPE) === 0) {
            var examples = line
                .substring(line.indexOf(PIPE) + 1, line.lastIndexOf(PIPE))
                .split(PIPE);

            paramNames.forEach(function (param, index) {
                examples[index] = param + ': ' + examples[index];
                examples[index] = examples[index].trim();
            });
            examples = examples
                .join(', ')
                .replace(/\s+/g, ' ')
                .trim();
            scenarios.push({index: index + 1, name: scenarioOutlineName + ', example: ' + examples});
        }
    });
    return scenarios;
}

exports.extractScenarios = extractScenarios;