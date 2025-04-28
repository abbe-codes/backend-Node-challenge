import { Job } from './Job';
import { Task } from '../models/Task';
import area from '@turf/area';

export class PolygonAreaJob implements Job {
  async run(task: Task): Promise<any> {
    console.log(`Running polygon area calculation for task ${task.taskId}...`);

    try {
      // Parse the GeoJSON from the task
      const geoJson = JSON.parse(task.geoJson);

      // Validate that the GeoJSON is a polygon
      if (
        !geoJson ||
        !geoJson.type ||
        (geoJson.type !== 'Polygon' && geoJson.type !== 'MultiPolygon')
      ) {
        throw new Error('Invalid GeoJSON: Must be a Polygon or MultiPolygon');
      }

      // Calculate the area using @turf/area
      const polygonArea = area(geoJson);

      console.log(`Calculated area: ${polygonArea} square meters`);

      // Return the result
      return {
        area: polygonArea,
        unit: 'square meters',
      };
    } catch (error: any) {
      console.error(`Error calculating polygon area: ${error.message}`);
      throw error;
    }
  }
}
