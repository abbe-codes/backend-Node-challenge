"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const WorkflowFactory_1 = require("../workflows/WorkflowFactory"); // Create a folder for factories if you prefer
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const workflowFactory = new WorkflowFactory_1.WorkflowFactory(data_source_1.AppDataSource);
router.post('/', async (req, res) => {
    const { clientId, geoJson } = req.body;
    const workflowFile = path_1.default.join(__dirname, '../workflows/example_workflow.yml');
    try {
        const workflow = await workflowFactory.createWorkflowFromYAML(workflowFile, clientId, JSON.stringify(geoJson));
        res.status(202).json({
            workflowId: workflow.workflowId,
            message: 'Workflow created and tasks queued from YAML definition.'
        });
    }
    catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ message: 'Failed to create workflow' });
    }
});
exports.default = router;
