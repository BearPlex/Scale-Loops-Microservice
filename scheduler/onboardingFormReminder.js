const supabase = require("../config/supabaseClient");
const cron = require("node-cron");
const moment = require("moment");
const { convertToAMPM } = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
  sendOnboardingEmailReminder,
  getLatestLog,
} = require("../services/supabaseController");
const { calculateBriefDays } = require("../utils/functions");
const reminderQueue = require("../queues/reminderQueue");

const slotsNames = {
  morning: "Morning",
  afternoon: "Afternoon",
  fullday: "Full Day",
};

async function getMediator() {
  const { data, error } = await supabase.from("mediators").select("*");
  // .eq("email", "eric@resolvewannon.com");
  if (error) {
    return [];
  }
  return data ? data : [];
}

async function getMediatorCases(mediatorId, date) {
  const { data, error } = await supabase
    .from("cases")
    .select("*,onboarding(*)")
    .gt("mediation_date", date)
    .eq("mediator_id", mediatorId);
  // .eq("id", 310);

  if (error) {
    return [];
  }

  if (!data?.length) return [];

  return data.map((obj) => {
    const isPlaintiffDone = obj?.onboarding?.some(
      ({ client_id }) => client_id === obj?.plaintiff_id
    );
    const isDefendantDone = obj?.onboarding?.some(
      ({ client_id }) => client_id === obj?.defender_id
    );
    return { ...obj, isPlaintiffDone, isDefendantDone };
  });
}

async function getClientInformation(client_id) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", client_id)
    .single();

  if (error) return null;

  return data;
}

async function formatAndSendEmail(mediator, caseData, client, emailLog = null) {
  try {
    const briefDays = calculateBriefDays(
      caseData.mediation_date,
      mediator?.reminderDays?.brief_reminder_days,
      mediator?.timezone
    );
    // console.log("mediator", { mediator, client });
    const baseData = {
      email: client.email,
      name: client.name,
      mediatorName: mediator?.first_name + " " + mediator?.last_name,
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      // `${moment(caseData?.mediation_date).format(
      //   "DD MMMM, YYYY"
      // )} - ${slotsNames[caseData?.slot_type.toLowerCase()]} (${convertToAMPM(
      //   caseData?.case_schedule_time
      // )} ${caseData?.slot_type === "fullday" ? "onwards" : ""})`,
      caseNumber: caseData?.case_number,
      caseTitle: caseData?.case_name,
      mediatorEmail: mediator?.email,
      briefDueDate: briefDays,
    };

    // Send email to the client
    await sendOnboardingEmailReminder(
      { ...baseData, email: client.email, case_id: caseData?.id },
      emailLog
    );

    if (mediator?.email_cc && Array.isArray(mediator.email_cc)) {
      for (const ccEmail of mediator.email_cc) {
        await sendOnboardingEmailReminder({
          ...baseData,
          email: ccEmail,
          case_id: caseData?.id,
        });
      }
    }

    console.log("sendOnboardingEmailReminder - Emails sent successfully.");
  } catch (error) {
    console.log(error);
  }
}

function getNextReminderDate(remindersObject) {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const formattedCurrentDate = currentDate.toLocaleDateString("en-CA");

  const remindersArray = Object.entries(remindersObject)
    .map(([key, reminder]) => ({
      key,
      date: new Date(reminder?.date),
      original: reminder,
    }))
    .filter((reminder) => reminder?.date >= currentDate);

  if (remindersArray.length === 0) {
    return "No further reminders";
  }

  remindersArray.sort((a, b) => a.date - b.date);

  const todayReminder = remindersArray.find((reminder) => {
    const reminderDate = reminder.date.toLocaleDateString("en-CA");
    return reminderDate === formattedCurrentDate;
  });

  if (todayReminder) {
    const nextReminders = remindersArray.filter(
      (reminder) => reminder.date > todayReminder.date
    );

    if (nextReminders.length === 0) {
      return "No further reminders";
    }

    const nextReminder = nextReminders[0];
    const options = { year: "numeric", month: "long", day: "numeric" };
    return nextReminder.date.toLocaleDateString("en-US", options);
  }

  const nextReminder = remindersArray[0];
  const options = { year: "numeric", month: "long", day: "numeric" };
  return nextReminder.date.toLocaleDateString("en-US", options);
}

async function sendOnboardingReminders() {
  const today = moment().utc().startOf("day").format("YYYY-MM-DD");
  //   const today = moment("2025-04-28").startOf("day").format("YYYY-MM-DD");
  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      const mediatorCases = await getMediatorCases(mediator?.user_id, today);
      for (const caseData of mediatorCases) {
        if (caseData.isPlaintiffDone && caseData.isDefendantDone) {
          console.log(
            "Skipping caseData: OnBoarding Completed, Case Id:",
            caseData?.id,
            ` Date: ${today}`
          );
          continue;
        }

        const emailReminders = await fetchEmailRemainders(
          caseData.id,
          mediator?.user_id,
          today
        );
        console.log(
          "11todaysReminders",
          emailReminders,
          emailReminders?.reminders,
          today
        );
        const todaysReminders = Object.entries(emailReminders?.reminders || {})
          .filter(
            ([_, reminder]) =>
              reminder &&
              moment(reminder?.date).isSame(today, "day") &&
              !reminder?.is_sent
          )
          .map(([reminderType, reminder]) => ({ reminderType, reminder }));

        console.log(
          "22todaysReminders",
          todaysReminders,
          todaysReminders.length
        );
        if (!todaysReminders.length) {
          console.log(
            `No unsent OnBoarding Reminders for case ${caseData.id}. Date: ${today}`
          );
          continue;
        }

        const [plaintiffData, defendantData] = await Promise.all([
          !caseData.isPlaintiffDone
            ? getClientInformation(caseData.plaintiff_id)
            : null,
          !caseData.isDefendantDone
            ? getClientInformation(caseData.defender_id)
            : null,
        ]);

        // console.log(
        //   "plaintiffData, defendantData",
        //   plaintiffData,
        //   defendantData
        // );

        const emailPromises = [];
        const markReminderPromises = [];
        const reminderTypesToMark = [];

        for (const { reminderType } of todaysReminders) {
          try {
            if (plaintiffData && !caseData.isPlaintiffDone) {
              const data = await getLatestLog({
                case_id: caseData.id,
                plantiff_id: caseData.plaintiff_id,
                type: "onboarding",
              });
              console.log("data", data);
              emailPromises.push(() =>
                formatAndSendEmail(
                  mediator,
                  caseData,
                  plaintiffData,
                  data.email_number === 3
                    ? null
                    : {
                        plaintiff_id: caseData.plaintiff_id,
                        case_id: caseData.id,
                        type: "onboarding",
                        mediator: mediator.mediator_id,
                        event: `Onboarding Reminder ${data.email_number + 1}/3`,
                        email_number: data.email_number + 1,
                        next_reminder: getNextReminderDate(
                          emailReminders?.reminders
                        ),
                      }
                )
              );
            }
            if (defendantData && !caseData.isDefendantDone) {
              const data = await getLatestLog({
                case_id: caseData.id,
                defender_id: caseData.defender_id,
                type: "onboarding",
              });
              console.log("data->defendantData", data);

              emailPromises.push(() =>
                formatAndSendEmail(
                  mediator,
                  caseData,
                  defendantData,
                  data?.email_number === 3
                    ? null
                    : {
                        defender_id: caseData.defender_id,
                        case_id: caseData.id,
                        type: "onboarding",
                        mediator: mediator.mediator_id,
                        event: !!data?.email_number
                          ? `Onboarding Reminder ${data?.email_number + 1}/3`
                          : "",
                        email_number: data?.email_number + 1,
                        next_reminder: getNextReminderDate(
                          emailReminders?.reminders
                        ),
                      }
                )
              );
            }
            markReminderPromises.push(() =>
              markReminderAsSent(emailReminders.id, reminderType, "onBoarding")
            );
            reminderTypesToMark.push(reminderType);
          } catch (error) {
            console.error(
              `Error processing OnBoarding Reminder ${reminderType} for case ${caseData.id}. Date: ${today}`,
              error
            );
          }
        }

        // Execute all email functions
        try {
          await Promise.all(emailPromises.map((fn) => fn()));
        } catch (err) {
          console.log(
            `Error in  emailPromises for case ${caseData.id}. Date: ${today}`,
            "Error -> ",
            err
          );
        }

        // Execute all markReminder functions
        try {
          await Promise.all(
            reminderTypesToMark.map((reminderType) =>
              markReminderAsSent(emailReminders.id, reminderType, "onBoarding")
            )
          );
        } catch (err) {
          console.log(
            `Error in  markReminderAsSent for case ${caseData.id}. Date: ${today}`,
            "Error -> ",
            err
          );
        }

        console.log(
          `OnBoarding Reminders for case ${caseData.id} have been processed. Date: ${today}`
        );
      }
    }
  } catch (error) {
    console.error(`Error sending onboarding reminders. Date: ${today}`, error);
  }
}

module.exports = {
  sendOnboardingReminders,
};
