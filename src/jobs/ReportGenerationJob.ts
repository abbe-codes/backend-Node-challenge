import { Job } from './Job';
import { Task } from '../models/Task';
import { Workflow } from '../models/Workflow';
import { Result } from '../models/Result';
import { AppDataSource } from '../data-source';
import { TaskStatus } from '../workers/taskRunner';

export class ReportGenerationJob implements Job {
  async run(task: Task): Promise<any> {
    console.log(`Running report generation for task ${task.taskId}...`);

    try {
      // Get repositories
      const workflowRepository = AppDataSource.getRepository(Workflow);
      const resultRepository = AppDataSource.getRepository(Result);

      // Fetch the current workflow with all its tasks
      const workflow = await workflowRepository.findOne({
        where: { workflowId: task.workflow.workflowId },
        relations: ['tasks'],
      });

      if (!workflow) {
        throw new Error(
          `Workflow with ID ${task.workflow.workflowId} not found`
        );
      }

      // Sort tasks by step number to ensure correct order
      const sortedTasks = workflow.tasks.sort(
        (a, b) => a.stepNumber - b.stepNumber
      );

      // Prepare the tasks array for the report
      const taskReports = [];

      // Process each task in the workflow
      for (const workflowTask of sortedTasks) {
        // Skip the current report generation task
        if (workflowTask.taskId === task.taskId) {
          continue;
        }

        // Prepare task report object
        const taskReport: any = {
          taskId: workflowTask.taskId,
          type: workflowTask.taskType,
        };

        // Handle different task statuses
        if (
          workflowTask.status === TaskStatus.Completed &&
          workflowTask.resultId
        ) {
          // Fetch the result for completed tasks
          const result = await resultRepository.findOne({
            where: { resultId: workflowTask.resultId },
          });

          if (result && result.data) {
            try {
              // Parse the result data (stored as JSON string)
              taskReport.output = JSON.parse(result.data);
            } catch (e) {
              // If parsing fails, use the raw string
              taskReport.output = result.data;
            }
          } else {
            taskReport.output = null;
            taskReport.error =
              'Result not found or data is null despite task being marked as completed';
          }
        } else if (workflowTask.status === TaskStatus.Failed) {
          // For failed tasks, include error information
          taskReport.output = null;
          taskReport.error = 'Task failed during execution';
          taskReport.status = workflowTask.status;
        } else {
          // For other statuses (queued, in_progress)
          taskReport.output = null;
          taskReport.status = workflowTask.status;
          taskReport.message = `Task is in ${workflowTask.status} state`;
        }

        taskReports.push(taskReport);
      }

      // Generate the final report
      const report = {
        workflowId: workflow.workflowId,
        tasks: taskReports,
        finalReport: 'Aggregated data and results from all workflow tasks',
        generatedAt: new Date().toISOString(),
        totalTasks: taskReports.length,
        completedTasks: taskReports.filter((t) => !t.error && t.output).length,
        failedTasks: taskReports.filter(
          (t) => t.error || t.status === TaskStatus.Failed
        ).length,
      };

      console.log(
        `Report generation completed for workflow ${workflow.workflowId}`
      );

      return report;
    } catch (error: any) {
      console.error(`Error generating report: ${error.message}`);
      throw error;
    }
  }
}
