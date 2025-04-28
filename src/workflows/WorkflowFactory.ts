import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DataSource } from 'typeorm';
import { Workflow } from '../models/Workflow';
import { Task } from '../models/Task';
import { TaskStatus } from '../workers/taskRunner';

export enum WorkflowStatus {
  Initial = 'initial',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
}

interface WorkflowStep {
  taskType: string;
  stepNumber: number;
  dependsOn?: number; // New field to specify dependency on another step
}

interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
}

export class WorkflowFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
   * @param filePath - Path to the YAML file.
   * @param clientId - Client identifier for the workflow.
   * @param geoJson - The geoJson data string for tasks (customize as needed).
   * @returns A promise that resolves to the created Workflow.
   */
  async createWorkflowFromYAML(
    filePath: string,
    clientId: string,
    geoJson: string
  ): Promise<Workflow> {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const workflowDef = yaml.load(fileContent) as WorkflowDefinition;
    const workflowRepository = this.dataSource.getRepository(Workflow);
    const taskRepository = this.dataSource.getRepository(Task);
    const workflow = new Workflow();

    workflow.clientId = clientId;
    workflow.status = WorkflowStatus.Initial;

    const savedWorkflow = await workflowRepository.save(workflow);

    // First, create all tasks without dependencies
    const tasks: Task[] = workflowDef.steps.map((step) => {
      const task = new Task();
      task.clientId = clientId;
      task.geoJson = geoJson;
      task.status = TaskStatus.Queued;
      task.taskType = step.taskType;
      task.stepNumber = step.stepNumber;
      task.workflow = savedWorkflow;
      return task;
    });

    // Save all tasks to get their IDs
    const savedTasks = await taskRepository.save(tasks);

    // Create a map of stepNumber to taskId for easy lookup
    const stepToTaskMap = new Map<number, string>();
    savedTasks.forEach((task) => {
      stepToTaskMap.set(task.stepNumber, task.taskId);
    });

    // Now update tasks with dependencies
    for (let i = 0; i < workflowDef.steps.length; i++) {
      const step = workflowDef.steps[i];
      const task = savedTasks[i];

      if (step.dependsOn !== undefined) {
        const dependsOnTaskId = stepToTaskMap.get(step.dependsOn);

        if (!dependsOnTaskId) {
          console.warn(
            `Warning: Task ${task.taskId} depends on step ${step.dependsOn}, but no task with that step number was found.`
          );
          continue;
        }

        task.dependsOnTaskId = dependsOnTaskId;
      }
    }

    // Save tasks again with updated dependencies
    await taskRepository.save(savedTasks);

    return savedWorkflow;
  }
}
