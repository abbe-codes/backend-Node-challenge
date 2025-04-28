"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRunner = exports.TaskStatus = void 0;
const JobFactory_1 = require("../jobs/JobFactory");
const WorkflowFactory_1 = require("../workflows/WorkflowFactory");
const Workflow_1 = require("../models/Workflow");
const Result_1 = require("../models/Result");
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["Queued"] = "queued";
    TaskStatus["InProgress"] = "in_progress";
    TaskStatus["Completed"] = "completed";
    TaskStatus["Failed"] = "failed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
class TaskRunner {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }
    /**
     * Runs the appropriate job based on the task's type, managing the task's status.
     * @param task - The task entity that determines which job to run.
     * @throws If the job fails, it rethrows the error.
     */
    async run(task) {
        task.status = TaskStatus.InProgress;
        task.progress = 'starting job...';
        await this.taskRepository.save(task);
        const job = (0, JobFactory_1.getJobForTaskType)(task.taskType);
        try {
            console.log(`Starting job ${task.taskType} for task ${task.taskId}...`);
            const resultRepository = this.taskRepository.manager.getRepository(Result_1.Result);
            const taskResult = await job.run(task);
            console.log(`Job ${task.taskType} for task ${task.taskId} completed successfully.`);
            const result = new Result_1.Result();
            result.taskId = task.taskId;
            result.data = JSON.stringify(taskResult || {});
            await resultRepository.save(result);
            task.resultId = result.resultId;
            task.status = TaskStatus.Completed;
            task.progress = null;
            await this.taskRepository.save(task);
        }
        catch (error) {
            console.error(`Error running job ${task.taskType} for task ${task.taskId}:`, error);
            task.status = TaskStatus.Failed;
            task.progress = null;
            await this.taskRepository.save(task);
            throw error;
        }
        const workflowRepository = this.taskRepository.manager.getRepository(Workflow_1.Workflow);
        const currentWorkflow = await workflowRepository.findOne({ where: { workflowId: task.workflow.workflowId }, relations: ['tasks'] });
        if (currentWorkflow) {
            const allCompleted = currentWorkflow.tasks.every(t => t.status === TaskStatus.Completed);
            const anyFailed = currentWorkflow.tasks.some(t => t.status === TaskStatus.Failed);
            if (anyFailed) {
                currentWorkflow.status = WorkflowFactory_1.WorkflowStatus.Failed;
            }
            else if (allCompleted) {
                currentWorkflow.status = WorkflowFactory_1.WorkflowStatus.Completed;
            }
            else {
                currentWorkflow.status = WorkflowFactory_1.WorkflowStatus.InProgress;
            }
            await workflowRepository.save(currentWorkflow);
        }
    }
}
exports.TaskRunner = TaskRunner;
