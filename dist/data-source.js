"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const Task_1 = require("./models/Task");
const Result_1 = require("./models/Result");
const Workflow_1 = require("./models/Workflow");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'sqlite',
    database: 'data/database.sqlite',
    dropSchema: true,
    entities: [Task_1.Task, Result_1.Result, Workflow_1.Workflow],
    synchronize: true,
    logging: false,
});
