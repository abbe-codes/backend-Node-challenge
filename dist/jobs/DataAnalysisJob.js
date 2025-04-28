"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAnalysisJob = void 0;
const boolean_within_1 = __importDefault(require("@turf/boolean-within"));
const world_data_json_1 = __importDefault(require("../data/world_data.json"));
class DataAnalysisJob {
    async run(task) {
        console.log(`Running data analysis for task ${task.taskId}...`);
        const inputGeometry = JSON.parse(task.geoJson);
        for (const countryFeature of world_data_json_1.default.features) {
            if (countryFeature.geometry.type === 'Polygon' || countryFeature.geometry.type === 'MultiPolygon') {
                const isWithin = (0, boolean_within_1.default)(inputGeometry, countryFeature);
                if (isWithin) {
                    console.log(`The polygon is within ${countryFeature.properties?.name}`);
                    return countryFeature.properties?.name;
                }
            }
        }
        return 'No country found';
    }
}
exports.DataAnalysisJob = DataAnalysisJob;
