const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendOnboardingReminders } = require("../scheduler/onboardingFormReminder");

const connection = new IORedis({
  host: 'rediss://cronmicroservice-imqdd1.serverless.usw2.cache.amazonaws.com',
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "reminderQueue",
  async (job) => {
    console.log(`Processing job ${job.id} with name: ${job.name}`);
    try {
      if (job.name === "onboarding-reminder") {
        console.log("Running onboarding reminders via queue...");
        await sendOnboardingReminders();
      }
    } catch (error) {
      console.error(`Job ${job.id} failed inside processor:`, error);
      throw error; // Required for BullMQ to retry the job
    }
  },
  {
    connection,
    lockDuration: 60000 // Optional: if your jobs take longer
  }
);

// Event listeners
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully.`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed with error: ${err.message}`);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});
