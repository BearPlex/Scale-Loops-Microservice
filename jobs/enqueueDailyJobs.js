const cron = require("node-cron");
const {
  sendOnboardingReminders,
} = require("../scheduler/onboardingFormReminder");
const {
  defendentReminders,
  plaintiffReminders,
  additionalPartyPaymentReminders,
} = require("../scheduler/paymentReminder");
const { sendBriefReminders } = require("../scheduler/briefReminder");
const {
  sendKeyDocumentsReminders,
} = require("../scheduler/keyDocumentsReminder");

const {
  hourlyInvoicesReminder,
} = require("../scheduler/hourlyInvoicesReminder");
const { weeklyMediationRecap } = require("../scheduler/weeklyMediationsRecap");
const { sendZoomReminders } = require("../scheduler/zoomReminder");

async function runAllPaymentReminders() {
  await defendentReminders();
  await plaintiffReminders();
  await additionalPartyPaymentReminders();
}

const jobs = [
  // To Parties Only
  // { name: "onboarding-reminder", fn: sendOnboardingReminders }, // Done Multi party
  // { name: "brief-reminder", fn: sendBriefReminders }, // Done Multi party
  // { name: "payment-reminder", fn: runAllPaymentReminders }, // Done Multi party
  //
  //
  // { name: "zoom-reminder", fn: sendZoomReminders },  // Done Multi party
  //
  //
  // { name: "hourly-invoices-reminder", fn: hourlyInvoicesReminder }, // Done Multi party
  //
  //
  //
  // All Mediator only
  // { name: "weekly-mediations-recap", fn: weeklyMediationRecap },
  // ODR Mediators Only
  // { name: "key-documents-reminder", fn: sendKeyDocumentsReminders },
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
console.log(
  "Enqueueing daily...",
  process.env.NODE_ENV,
  process.env.NODE_ENV === "production"
);
if (process.env.NODE_ENV === "production") {
  cron.schedule("0 18 * * *", enqueueRemindersSequentially, {
    scheduled: true,
    timezone: "UTC",
  });
  // enqueueRemindersSequentially();
}
