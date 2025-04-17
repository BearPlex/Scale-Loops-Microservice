const reminderQueue = require("../queues/reminderQueue");
const cron = require("node-cron");

function enqueueReminders() {
  const jobs = [
    "onboarding-reminder",
    "payment-reminder",
    "brief-reminder",
    "key-documents-reminder",
  ];

  // Enqueue jobs sequentially
  jobs.forEach((jobName, index) => {
    reminderQueue.add(
      jobName,
      {},
      {
        delay: index * 30000, // 30 sec delay between each job (to maintain strict order)
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 60000,
        },
      }
    );
  });
}

if (process.env.NODE_ENV !== "production") {
  cron.schedule(
    "*/10 * * * *", // every 10 minutes
    enqueueReminders,
    {
      scheduled: true,
      timezone: "UTC",
    }
  );
}