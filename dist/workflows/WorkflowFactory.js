"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowFactory = exports.WorkflowStatus = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const Workflow_1 = require("../models/Workflow");
const Task_1 = require("../models/Task");
const taskRunner_1 = require("../workers/taskRunner");
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["Initial"] = "initial";
    WorkflowStatus["InProgress"] = "in_progress";
    WorkflowStatus["Completed"] = "completed";
    WorkflowStatus["Failed"] = "failed";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
class WorkflowFactory {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
     * @param filePath - Path to the YAML file.
     * @param clientId - Client identifier for the workflow.
     * @param geoJson - The geoJson data string for tasks (customize as needed).
     * @returns A promise that resolves to the created Workflow.
     */
    async createWorkflowFromYAML(filePath, clientId, geoJson) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const workflowDef = yaml.load(fileContent);
        const workflowRepository = this.dataSource.getRepository(Workflow_1.Workflow);
        const taskRepository = this.dataSource.getRepository(Task_1.Task);
        const workflow = new Workflow_1.Workflow();
        workflow.clientId = clientId;
        workflow.status = WorkflowStatus.Initial;
        const savedWorkflow = await workflowRepository.save(workflow);
        const tasks = workflowDef.steps.map(step => {
            const task = new Task_1.Task();
            task.clientId = clientId;
            task.geoJson = geoJson;
            task.status = taskRunner_1.TaskStatus.Queued;
            task.taskType = step.taskType;
            task.stepNumber = step.stepNumber;
            task.workflow = savedWorkflow;
            return task;
        });
        await taskRepository.save(tasks);
        return savedWorkflow;
    }
}
exports.WorkflowFactory = WorkflowFactory;
