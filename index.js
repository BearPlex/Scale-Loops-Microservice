require('dotenv').config();
const express = require('express');
const reminderRoutes = require('./routes/reminder');
// require('./jobs/reminderWorker');
// require('./scheduler/onboardingFormReminder');

require("./jobs/enqueueDailyJobs"); // sets up cron jobs
require("./workers/reminderWorker"); // starts worker

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// ✅ Bull Board setup
const { createBullBoard } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter'); // corrected import path

const app = express();
app.use(express.json());
app.use('/reminders', reminderRoutes);

// Redis and Queue setup
const connection = new IORedis();
const queue = new Queue('reminderQueue', { connection });

// Bull Board dashboard setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(queue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));