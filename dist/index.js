"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const analysisRoutes_1 = __importDefault(require("./routes/analysisRoutes"));
const defaultRoute_1 = __importDefault(require("./routes/defaultRoute"));
const taskWorker_1 = require("./workers/taskWorker");
const data_source_1 = require("./data-source"); // Import the DataSource instance
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/analysis", analysisRoutes_1.default);
app.use("/", defaultRoute_1.default);
data_source_1.AppDataSource.initialize()
    .then(() => {
    // Start the worker after successful DB connection
    (0, taskWorker_1.taskWorker)();
    app.listen(3000, () => {
        console.log("Server is running at http://localhost:3000");
    });
})
    .catch((error) => console.log(error));
