import { AppDataSource } from '../data-source';
import { Task } from '../models/Task';
import { TaskRunner, TaskStatus } from './taskRunner';

export async function taskWorker() {
  console.log('Starting task worker...');

  const taskRepository = AppDataSource.getRepository(Task);
  const taskRunner = new TaskRunner(taskRepository);

  // Poll for tasks every 5 seconds
  setInterval(async () => {
    try {
      // Find all queued tasks
      const queuedTasks = await taskRepository.find({
        where: { status: TaskStatus.Queued },
        relations: ['workflow'],
      });

      if (queuedTasks.length === 0) {
        return;
      }

      console.log(`Found ${queuedTasks.length} queued tasks.`);

      // Process each queued task
      for (const task of queuedTasks) {
        // Check if this task has a dependency
        if (task.dependsOnTaskId) {
          // Find the dependency task
          const dependencyTask = await taskRepository.findOne({
            where: { taskId: task.dependsOnTaskId },
          });

          // Skip this task if the dependency task doesn't exist or isn't completed
          if (!dependencyTask) {
            console.log(
              `Task ${task.taskId} depends on non-existent task ${task.dependsOnTaskId}. Skipping.`
            );
            continue;
          }

          if (dependencyTask.status !== TaskStatus.Completed) {
            console.log(
              `Task ${task.taskId} depends on task ${task.dependsOnTaskId} which is not completed yet (status: ${dependencyTask.status}). Skipping.`
            );
            continue;
          }

          console.log(
            `Dependency satisfied for task ${task.taskId}. Proceeding with execution.`
          );
        }

        try {
          await taskRunner.run(task);
          console.log(`Task ${task.taskId} completed successfully.`);
        } catch (error) {
          console.error(`Error running task ${task.taskId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in task worker:', error);
    }
  }, 5000);
}
