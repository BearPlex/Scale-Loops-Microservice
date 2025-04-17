const { Worker } = require("bullmq");
const connection = require("../config/redisConnection");

const {
  sendOnboardingReminders,
} = require("../scheduler/onboardingFormReminder");
const {
  sendReminders,
} = require("../scheduler/paymentReminder");
const { sendBriefReminders } = require("../scheduler/briefReminder");
const { sendKeyDocumentsReminders } = require("../scheduler/keyDocumentsReminder");


const reminderWorker = new Worker(
  "reminderQueue",
  async (job) => {
    console.log(`📦 Processing job ${job.name}...`);
    if (job.name === "onboarding-reminder") {
      await sendOnboardingReminders();
    } else if (job.name === "payment-reminder") {
      await sendReminders();
    }
     else if (job.name === "brief-reminder") {
      await sendBriefReminders();
    } 
    else if (job.name === "key-documents-reminder") {
      await sendKeyDocumentsReminders();
    }
  },
  {
    connection,
    concurrency: 1, // 💡 ONE job at a time
  }
);

// Log success/failure
reminderWorker.on("completed", (job) => {
  console.log(`✅ ${job.name} completed`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`❌ ${job.name} failed:`, err.message);
});
