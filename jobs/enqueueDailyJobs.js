const cron = require("node-cron");
const { sendOnboardingReminders } = require("../scheduler/onboardingFormReminder");
const { defendentReminders,plaintiffReminders } = require("../scheduler/paymentReminder");
const { sendBriefReminders } = require("../scheduler/briefReminder");
const { sendKeyDocumentsReminders } = require("../scheduler/keyDocumentsReminder");


async function runAllPaymentReminders() {
  await defendentReminders();
  await plaintiffReminders();
}


const jobs = [
  { name: "onboarding-reminder", fn: sendOnboardingReminders },
  { name: "payment-reminder", fn: runAllPaymentReminders },
  { name: "brief-reminder", fn: sendBriefReminders },
  { name: "key-documents-reminder", fn: sendKeyDocumentsReminders },
];

async function runJobsSequentially(jobList) {
  const failedJobs = [];

  for (const job of jobList) {
    try {
      console.log(`📦 Running job: ${job.name}`);
      await job.fn(); // Wait for the current job to finish
      console.log(`✅ Completed job: ${job.name}`);
    } catch (error) {
      console.error(`❌ Failed job: ${job.name}`, error.message);
      failedJobs.push(job); // Keep track of failed jobs
    }
  }

  return failedJobs;
}

async function enqueueRemindersSequentially() {
  const failedJobs = await runJobsSequentially(jobs);

  // Retry failed jobs, if any
  if (failedJobs.length > 0) {
    console.log("🔁 Retrying failed jobs...");
    await runJobsSequentially(failedJobs);
  } else {
    console.log("🎉 All jobs completed successfully!");
  }
}
console.log("Enqueueing daily jobdddddddddddddddddddddddddddddddddddddds...", process.env.NODE_ENV, process.env.NODE_ENV === "production");
if (process.env.NODE_ENV === "production") {
  cron.schedule(
    "* * * * *", // every 10 minutes
    enqueueRemindersSequentially,
    {
      scheduled: true,
      timezone: "UTC",
    }
  );
}
