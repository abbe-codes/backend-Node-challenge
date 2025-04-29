import 'reflect-metadata';
import express from 'express';
import analysisRoutes from './routes/analysisRoutes';
import defaultRoute from './routes/defaultRoute';
import workflowRoutes from './routes/workflowRoutes'; // Import the new workflow router
import { taskWorker } from './workers/taskWorker';
import { AppDataSource } from './data-source'; // Import the DataSource instance

const app = express();
app.use(express.json());

// Register routes
app.use('/analysis', analysisRoutes);
app.use('/workflow', workflowRoutes); // Use the workflow router for /workflow paths
app.use('/', defaultRoute);

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');

    // Start the worker after successful DB connection
    taskWorker();

    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000');
    });
  })
  .catch((error) =>
    console.log('Error during Data Source initialization:', error)
  );
