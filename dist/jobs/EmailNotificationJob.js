"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotificationJob = void 0;
class EmailNotificationJob {
    async run(task) {
        console.log(`Sending email notification for task ${task.taskId}...`);
        // Perform notification work
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Email sent!');
    }
}
exports.EmailNotificationJob = EmailNotificationJob;
