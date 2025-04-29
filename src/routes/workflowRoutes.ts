import express, { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Workflow } from '../models/Workflow';
import { TaskStatus } from '../workers/taskRunner';
import { WorkflowStatus } from '../workflows/WorkflowFactory'; // Import WorkflowStatus enum
import logger from '../utils/logger';

const router = express.Router();

// GET /workflow/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  const workflowId = req.params.id;
  logger.info('Request received for workflow status', { workflowId });

  try {
    const workflowRepository = AppDataSource.getRepository(Workflow);

    // Find the workflow by ID, including its tasks
    const workflow = await workflowRepository.findOne({
      where: { workflowId: workflowId },
      relations: ['tasks'], // Load related tasks to count them
    });

    // If workflow not found, return 404
    if (!workflow) {
      logger.warn('Workflow not found for status request', { workflowId });
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

    logger.info('Successfully retrieved workflow status', {
      workflowId,
      status: workflow.status,
    });
    // Send the response
    res.status(200).json(responsePayload);
  } catch (error: any) {
    logger.error(`Error fetching status for workflow`, {
      workflowId,
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});

// GET /workflow/:id/results (Task 6 Implementation)
router.get('/:id/results', async (req: Request, res: Response) => {
  const workflowId = req.params.id;
  logger.info('Request received for workflow results', { workflowId });

  try {
    const workflowRepository = AppDataSource.getRepository(Workflow);

    // Find the workflow by ID
    const workflow = await workflowRepository.findOne({
      where: { workflowId: workflowId },
    });

    // If workflow not found, return 404
    if (!workflow) {
      logger.warn('Workflow not found for results request', { workflowId });
      return res
        .status(404)
        .json({ message: `Workflow with ID ${workflowId} not found.` });
    }

    // If workflow is not completed, return 400
    if (workflow.status !== WorkflowStatus.Completed) {
      logger.warn('Workflow not completed, results not available', {
        workflowId,
        status: workflow.status,
      });
      return res.status(400).json({
        message: `Workflow ${workflowId} is not yet completed. Current status: ${workflow.status}.`,
        workflowId: workflow.workflowId,
        status: workflow.status,
      });
    }

    // If workflow is completed, return the finalResult
    let finalResultParsed = null;
    if (workflow.finalResult) {
      try {
        finalResultParsed = JSON.parse(workflow.finalResult);
      } catch (parseError: any) {
        logger.error(
          'Failed to parse finalResult JSON for completed workflow',
          { workflowId, error: parseError.message }
        );
        // Return raw string if parsing fails, or handle as an error
        finalResultParsed = workflow.finalResult; // Returning raw string as fallback
      }
    }

    const responsePayload = {
      workflowId: workflow.workflowId,
      status: workflow.status,
      finalResult: finalResultParsed, // Return parsed JSON or raw string
    };

    logger.info('Successfully retrieved workflow results', { workflowId });
    res.status(200).json(responsePayload);
  } catch (error: any) {
    logger.error(`Error fetching results for workflow`, {
      workflowId,
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;
