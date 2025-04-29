import { Repository } from 'typeorm';
import { Task } from '../models/Task';
import { getJobForTaskType } from '../jobs/JobFactory';
import { WorkflowStatus } from '../workflows/WorkflowFactory';
import { Workflow } from '../models/Workflow';
import { Result } from '../models/Result';

export enum TaskStatus {
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
}

export class TaskRunner {
  constructor(private taskRepository: Repository<Task>) {}

  /**
   * Runs the appropriate job based on the task's type, managing the task's status.
   * @param task - The task entity that determines which job to run.
   * @throws If the job fails, it rethrows the error.
   */
  async run(task: Task): Promise<void> {
    task.status = TaskStatus.InProgress;
    task.progress = 'starting job...';
    await this.taskRepository.save(task);
    const job = getJobForTaskType(task.taskType);

    try {
      console.log(`Starting job ${task.taskType} for task ${task.taskId}...`);
      const resultRepository =
        this.taskRepository.manager.getRepository(Result);
      const taskResult = await job.run(task);
      console.log(
        `Job ${task.taskType} for task ${task.taskId} completed successfully.`
      );
      const result = new Result();
      result.taskId = task.taskId!;
      result.data = JSON.stringify(taskResult || {});
      await resultRepository.save(result);
      task.resultId = result.resultId!;
      task.status = TaskStatus.Completed;
      task.progress = null;
      await this.taskRepository.save(task);
    } catch (error: any) {
      console.error(
        `Error running job ${task.taskType} for task ${task.taskId}:`,
        error
      );

      task.status = TaskStatus.Failed;
      task.progress = null;
      await this.taskRepository.save(task);
    }

    const workflowRepository =
      this.taskRepository.manager.getRepository(Workflow);
    const resultRepository = this.taskRepository.manager.getRepository(Result); // Need Result repo here too

    const currentWorkflow = await workflowRepository.findOne({
      where: { workflowId: task.workflow.workflowId },
      relations: ['tasks'],
    });

    if (currentWorkflow) {
      const allTasks = currentWorkflow.tasks;
      const allCompleted = allTasks.every(
        (t) => t.status === TaskStatus.Completed
      );
      const anyFailed = allTasks.some((t) => t.status === TaskStatus.Failed);
      let newWorkflowStatus = currentWorkflow.status;

      if (anyFailed) {
        newWorkflowStatus = WorkflowStatus.Failed;
      } else if (allCompleted) {
        newWorkflowStatus = WorkflowStatus.Completed;
      } else {
        newWorkflowStatus = WorkflowStatus.InProgress;
      }

      // If the status changed, update it
      if (newWorkflowStatus !== currentWorkflow.status) {
        currentWorkflow.status = newWorkflowStatus;
      }

      // If the workflow just completed, aggregate results
      if (newWorkflowStatus === WorkflowStatus.Completed) {
        console.log(
          `Workflow ${currentWorkflow.workflowId} completed. Aggregating final results...`
        );
        const finalResults: any = {
          workflowId: currentWorkflow.workflowId,
          status: WorkflowStatus.Completed,
          tasks: [],
        };

        // Sort tasks by step number for consistent report order
        const sortedTasks = allTasks.sort(
          (a, b) => a.stepNumber - b.stepNumber
        );

        for (const completedTask of sortedTasks) {
          const taskDetail: any = {
            taskId: completedTask.taskId,
            taskType: completedTask.taskType,
            stepNumber: completedTask.stepNumber,
            status: completedTask.status,
          };

          if (
            completedTask.status === TaskStatus.Completed &&
            completedTask.resultId
          ) {
            const taskResult = await resultRepository.findOne({
              where: { resultId: completedTask.resultId },
            });
            if (taskResult && taskResult.data) {
              try {
                taskDetail.output = JSON.parse(taskResult.data);
              } catch (e) {
                taskDetail.output = taskResult.data;
              }
            } else {
              taskDetail.output = null;
              taskDetail.error = 'Result data not found';
            }
          } else if (completedTask.status === TaskStatus.Failed) {
            taskDetail.error = 'Task failed during execution';
          }
          finalResults.tasks.push(taskDetail);
        }
        // Save the aggregated results as a JSON string
        currentWorkflow.finalResult = JSON.stringify(finalResults, null, 2);
        console.log(
          `Final results aggregated for workflow ${currentWorkflow.workflowId}.`
        );
      }

      // Save the workflow with updated status and potentially finalResult
      await workflowRepository.save(currentWorkflow);
    }
  }
}
