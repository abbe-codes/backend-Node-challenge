import request from 'supertest';
import express from 'express';
import workflowRoutes from './workflowRoutes'; // Adjust path as necessary
import { AppDataSource } from '../data-source';
import { Workflow } from '../models/Workflow';
import { Task } from '../models/Task';
import { WorkflowStatus } from '../workflows/WorkflowFactory';
import { TaskStatus } from '../workers/taskRunner';
import logger from '../utils/logger';

// Mock the AppDataSource and repositories
jest.mock('../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Create an Express app instance for testing
const app = express();
app.use(express.json());
app.use('/workflow', workflowRoutes); // Mount the router under /workflow

describe('Workflow Routes', () => {
  let mockWorkflowRepository: any;

  beforeEach(() => {
    // Reset mocks before each test
    (logger.info as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();

    mockWorkflowRepository = {
      findOne: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Workflow) {
        return mockWorkflowRepository;
      }
      // Add mocks for other entities if needed by routes
      return { findOne: jest.fn(), save: jest.fn() };
    });
  });

  // --- Tests for GET /workflow/:id/status --- (Task 5)
  describe('GET /workflow/:id/status', () => {
    const workflowId = 'status-test-id';

    it('should return 200 with status and task counts for an existing workflow', async () => {
      const mockTasks: Partial<Task>[] = [
        { status: TaskStatus.Completed },
        { status: TaskStatus.Completed },
        { status: TaskStatus.InProgress },
      ];
      const mockWorkflow: Partial<Workflow> = {
        workflowId: workflowId,
        status: WorkflowStatus.InProgress,
        tasks: mockTasks as Task[],
      };
      mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

      const response = await request(app).get(`/workflow/${workflowId}/status`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        workflowId: workflowId,
        status: WorkflowStatus.InProgress,
        completedTasks: 2,
        totalTasks: 3,
      });
      expect(mockWorkflowRepository.findOne).toHaveBeenCalledWith({
        where: { workflowId: workflowId },
        relations: ['tasks'],
      });
    });

    it('should return 404 if the workflow is not found', async () => {
      mockWorkflowRepository.findOne.mockResolvedValue(null);

      const response = await request(app).get(`/workflow/${workflowId}/status`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `Workflow with ID ${workflowId} not found.`,
      });
    });

    it('should return 500 if there is a database error', async () => {
      const dbError = new Error('Database connection failed');
      mockWorkflowRepository.findOne.mockRejectedValue(dbError);

      const response = await request(app).get(`/workflow/${workflowId}/status`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal Server Error',
        error: dbError.message,
      });
    });
  });

  // --- Tests for GET /workflow/:id/results --- (Task 6)
  describe('GET /workflow/:id/results', () => {
    const workflowId = 'results-test-id';

    it('should return 200 with parsed finalResult for a completed workflow', async () => {
      const finalResultData = { summary: 'All done!', details: [1, 2, 3] };
      const mockWorkflow: Partial<Workflow> = {
        workflowId: workflowId,
        status: WorkflowStatus.Completed,
        finalResult: JSON.stringify(finalResultData),
      };
      mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

      const response = await request(app).get(
        `/workflow/${workflowId}/results`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        workflowId: workflowId,
        status: WorkflowStatus.Completed,
        finalResult: finalResultData, // Expect parsed JSON
      });
      expect(mockWorkflowRepository.findOne).toHaveBeenCalledWith({
        where: { workflowId: workflowId },
      });
    });

    it('should return 200 with raw finalResult if it is not valid JSON', async () => {
      const rawFinalResult = 'This is not JSON';
      const mockWorkflow: Partial<Workflow> = {
        workflowId: workflowId,
        status: WorkflowStatus.Completed,
        finalResult: rawFinalResult,
      };
      mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

      const response = await request(app).get(
        `/workflow/${workflowId}/results`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        workflowId: workflowId,
        status: WorkflowStatus.Completed,
        finalResult: rawFinalResult, // Expect raw string
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse finalResult JSON'),
        expect.any(Object)
      );
    });

    it('should return 400 if the workflow is not completed', async () => {
      const mockWorkflow: Partial<Workflow> = {
        workflowId: workflowId,
        status: WorkflowStatus.InProgress,
        finalResult: null,
      };
      mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

      const response = await request(app).get(
        `/workflow/${workflowId}/results`
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: `Workflow ${workflowId} is not yet completed. Current status: ${WorkflowStatus.InProgress}.`,
        workflowId: workflowId,
        status: WorkflowStatus.InProgress,
      });
    });

    it('should return 404 if the workflow is not found', async () => {
      mockWorkflowRepository.findOne.mockResolvedValue(null);

      const response = await request(app).get(
        `/workflow/${workflowId}/results`
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `Workflow with ID ${workflowId} not found.`,
      });
    });

    it('should return 500 if there is a database error', async () => {
      const dbError = new Error('Database query failed');
      mockWorkflowRepository.findOne.mockRejectedValue(dbError);

      const response = await request(app).get(
        `/workflow/${workflowId}/results`
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal Server Error',
        error: dbError.message,
      });
    });
  });
});
