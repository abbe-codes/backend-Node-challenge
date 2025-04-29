import express, { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Workflow } from '../models/Workflow';
import { TaskStatus } from '../workers/taskRunner';

const router = express.Router();

// GET /workflow/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  const workflowId = req.params.id;

  try {
    const workflowRepository = AppDataSource.getRepository(Workflow);

    // Find the workflow by ID, including its tasks
    const workflow = await workflowRepository.findOne({
      where: { workflowId: workflowId },
      relations: ['tasks'], // Load related tasks to count them
    });

    // If workflow not found, return 404
    if (!workflow) {
      return res
        .status(404)
        .json({ message: `Workflow with ID ${workflowId} not found.` });
    }

    // Calculate task counts
    const totalTasks = workflow.tasks ? workflow.tasks.length : 0;
    const completedTasks = workflow.tasks
      ? workflow.tasks.filter((task) => task.status === TaskStatus.Completed)
          .length
      : 0;

    // Prepare the response object
    const responsePayload = {
      workflowId: workflow.workflowId,
      status: workflow.status,
      completedTasks: completedTasks,
      totalTasks: totalTasks,
    };

    // Send the response
    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error(`Error fetching status for workflow ${workflowId}:`, error);
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;
