"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobForTaskType = getJobForTaskType;
const DataAnalysisJob_1 = require("./DataAnalysisJob");
const EmailNotificationJob_1 = require("./EmailNotificationJob");
const jobMap = {
    'analysis': () => new DataAnalysisJob_1.DataAnalysisJob(),
    'notification': () => new EmailNotificationJob_1.EmailNotificationJob(),
};
function getJobForTaskType(taskType) {
    const jobFactory = jobMap[taskType];
    if (!jobFactory) {
        throw new Error(`No job found for task type: ${taskType}`);
    }
    return jobFactory();
}
