"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskWorker = taskWorker;
const data_source_1 = require("../data-source");
const Task_1 = require("../models/Task");
const taskRunner_1 = require("./taskRunner");
async function taskWorker() {
    const taskRepository = data_source_1.AppDataSource.getRepository(Task_1.Task);
    const taskRunner = new taskRunner_1.TaskRunner(taskRepository);
    while (true) {
        const task = await taskRepository.findOne({
            where: { status: taskRunner_1.TaskStatus.Queued },
            relations: ['workflow'] // Ensure workflow is loaded
        });
        if (task) {
            try {
                await taskRunner.run(task);
            }
            catch (error) {
                console.error('Task execution failed. Task status has already been updated by TaskRunner.');
                console.error(error);
            }
        }
        // Wait before checking for the next task again
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
