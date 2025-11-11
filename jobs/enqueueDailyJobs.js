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
const {
  crmNotificationToMediator,
} = require("../scheduler/crmNotificationToMediator");
const { weeklyMediationRecap } = require("../scheduler/weeklyMediationsRecap");
const { sendZoomRemindersToMediators } = require("../scheduler/zoomReminder");
const {
  caseOutcomeReportReminder,
} = require("../scheduler/caseOutcomeReportReminder");

async function runAllPaymentReminders() {
  await defendentReminders();
  await plaintiffReminders();
  await additionalPartyPaymentReminders();
}

const jobs = [
  // To Parties Only
  { name: "onboarding-reminder", fn: sendOnboardingReminders },
  { name: "brief-reminder", fn: sendBriefReminders },
  { name: "payment-reminder", fn: runAllPaymentReminders },

  // //
  { name: "hourly-invoices-reminder", fn: hourlyInvoicesReminder },
  // //

  // //
  // // All Mediator only
  { name: "weekly-mediations-recap", fn: weeklyMediationRecap },
  { name: "crm-notification-to-mediator", fn: crmNotificationToMediator },
  { name: "case-outcome-report-reminder", fn: caseOutcomeReportReminder },
  { name: "zoom-reminder", fn: sendZoomRemindersToMediators },
  //
  //
  // // ODR Mediators Only
  { name: "key-documents-reminder", fn: sendKeyDocumentsReminders },
];

async function runJobsSequentially(jobList) {
  const failedJobs = [];

  for (const job of jobList) {
    try {
      console.log(`📦 Running job: ${job.name}`);
      await job.fn();
      console.log(`✅ Completed job: ${job.name}`);
    } catch (error) {
      console.error(`❌ Failed job: ${job.name}`, error.message);
      failedJobs.push(job);
    }
  }

  return failedJobs;
}

async function enqueueRemindersSequentially() {
  const failedJobs = await runJobsSequentially(jobs);

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
