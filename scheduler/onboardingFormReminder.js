const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  convertToAMPM,
  getNextValidReminder,
  countValidReminders,
  convertCountingWordToDigit,
} = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
  sendOnboardingEmailReminder,
} = require("../services/supabaseController");
const { calculateBriefDays } = require("../utils/functions");

// const slotsNames = {
//   morning: "Morning",
//   afternoon: "Afternoon",
//   fullday: "Full Day",
// };

async function getMediator() {
  const { data, error } = await supabase.from("mediators").select("*");
  // .eq("email", "hiqbal@bearplex.com");

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
  // .in("id", [1046]);

  if (error) {
    return [];
  }

  if (!data?.length) return [];

  return data.map((obj) => {
    const isPlaintiffDone = obj?.onboarding?.some(
      ({ client_id, completed }) =>
        client_id === obj?.plaintiff_id && completed === true
    );
    const isDefendantDone = obj?.onboarding?.some(
      ({ client_id, completed }) =>
        client_id === obj?.defender_id && completed === true
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

    const baseData = {
      email: client.email,
      name: client.name,
      mediatorName: mediator?.first_name + " " + mediator?.last_name,
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      caseNumber: caseData?.case_number,
      caseTitle: caseData?.case_name,
      mediatorEmail: mediator?.email,
      briefDueDate: briefDays,
      // `${moment(caseData?.mediation_date).format(
      //   "DD MMMM, YYYY"
      // )} - ${slotsNames[caseData?.slot_type.toLowerCase()]} (${convertToAMPM(
      //   caseData?.case_schedule_time
      // )} ${caseData?.slot_type === "fullday" ? "onwards" : ""})`,
    };

    console.log("Case ID ->", caseData?.id, "  baseData", baseData);
    // Send email to the client
    await sendOnboardingEmailReminder(
      { ...baseData, email: client.email, case_id: caseData?.id },
      emailLog
    );

    // console.log("mediator?.email_cc", mediator?.email_cc);

    if (mediator?.email_cc && Array.isArray(mediator.email_cc)) {
      for (const ccEmail of mediator.email_cc) {
        await sendOnboardingEmailReminder({
          ...baseData,
          email: ccEmail,
          case_id: caseData?.id,
        });
      }
    }

    console.log(
      "Case ID ->",
      caseData?.id,
      " -> sendOnboardingEmailReminder - Emails sent successfully."
    );
  } catch (error) {
    console.log(
      "case_data",
      caseData,
      "  ->  error whlie sending Onboarding Email Reminder",
      error
    );
  }
}

async function sendOnboardingReminders() {
  const today = moment().utc().startOf("day").format("YYYY-MM-DD");
  // const today = moment("2025-05-12").startOf("day").format("YYYY-MM-DD");
  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      try {
        // console.log("mediator", mediator);
        await processMediatorCases(mediator, today);
      } catch (error) {
        console.error(
          `Error processing cases for mediator ${mediator.user_id}. Date: ${today}`,
          error
        );
      }
    }
  } catch (error) {
    console.error(`Error fetching mediators. Date: ${today}`, error);
  }
}

async function processMediatorCases(mediator, today) {
  try {
    const mediatorCases = await getMediatorCases(mediator?.user_id, today);
    // console.log("mediatorCases", mediatorCases);
    for (const caseData of mediatorCases) {
      try {
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
          "case id:",
          caseData?.id,
          "  -> emailReminders",
          emailReminders,
          "  -> today",
          today
        );

        const todaysReminders = getTodaysReminders(
          emailReminders?.reminders,
          today
        );
        console.log(
          "case id:",
          caseData?.id,
          "  -> todaysReminders",
          todaysReminders
        );
        if (!todaysReminders.length) {
          console.log(
            `No unsent OnBoarding Reminders for case ${caseData.id}. Date: ${today}`
          );
          continue;
        }

        await sendAndMarkReminders(
          mediator,
          caseData,
          emailReminders,
          todaysReminders
        );
      } catch (error) {
        console.error(
          `Error processing case ${caseData.id}. Date: ${today}`,
          error
        );
      }
    }
  } catch (error) {
    console.error(
      `Error fetching cases for mediator ${mediator.user_id}. Date: ${today}`,
      error
    );
  }
}

function getTodaysReminders(reminders, today) {
  return Object.entries(reminders || {})
    .filter(
      ([_, reminder]) =>
        reminder &&
        moment(reminder?.date).isSame(today, "day") &&
        !reminder?.is_sent
    )
    .map(([reminderType, reminder]) => ({ reminderType, reminder }));
}

async function sendAndMarkReminders(
  mediator,
  caseData,
  emailReminders,
  todaysReminders
) {
  try {
    const [plaintiffData, defendantData] = await Promise.all([
      !caseData.isPlaintiffDone
        ? getClientInformation(caseData.plaintiff_id)
        : null,
      !caseData.isDefendantDone
        ? getClientInformation(caseData.defender_id)
        : null,
    ]);

    const emailPromises = [];
    const reminderTypesToMark = [];

    for (const { reminderType } of todaysReminders) {
      try {
        const nextReminderDate = getNextValidReminder(
          emailReminders?.reminders || {},
          reminderType
        )?.date;

        console.log(
          "case id:",
          caseData?.id,
          "  -> nextReminderDate",
          nextReminderDate
        );

        console.log(
          "case id:",
          caseData?.id,
          "caseData.isPlaintiffDone",
          caseData.isPlaintiffDone
        );

        if (plaintiffData && !caseData.isPlaintiffDone) {
          // Log what is being added
          console.log("Adding email function for plaintiff");
          emailPromises.push(() =>
            formatAndSendEmail(mediator, caseData, plaintiffData, {
              plaintiff_id: caseData.plaintiff_id,
              case_id: caseData.id,
              type: "onboarding",
              mediator: mediator.mediator_id,
              event: `Onboarding Reminder ${convertCountingWordToDigit(
                reminderType
              )}/${countValidReminders(emailReminders?.reminders)}`,
              email_number: convertCountingWordToDigit(reminderType),
              next_reminder: nextReminderDate
                ? moment(nextReminderDate).format("MMMM D, YYYY")
                : null,
            })
          );
        }

        console.log(
          "case id:",
          caseData?.id,
          "caseData.isDefendantDone",
          caseData.isDefendantDone
        );

        if (defendantData && !caseData.isDefendantDone) {
          // Log what is being added
          console.log("Adding email function for defendant");
          emailPromises.push(() =>
            formatAndSendEmail(mediator, caseData, defendantData, {
              defender_id: caseData.defender_id,
              case_id: caseData.id,
              type: "onboarding",
              mediator: mediator.mediator_id,
              event: `Onboarding Reminder ${convertCountingWordToDigit(
                reminderType
              )}/${countValidReminders(emailReminders?.reminders)}`,
              email_number: convertCountingWordToDigit(reminderType),
              next_reminder: nextReminderDate
                ? moment(nextReminderDate).format("MMMM D, YYYY")
                : null,
            })
          );
        }

        reminderTypesToMark.push(reminderType);
      } catch (error) {
        console.error(
          `Error processing OnBoarding Reminder ${reminderType} for case ${caseData.id}.`,
          error
        );
      }
    }

    await executePromises(
      emailPromises,
      `emailPromises for case ${caseData.id}`
    );
    await markRemindersAsSent(emailReminders.id, reminderTypesToMark);
  } catch (error) {
    console.error(
      `Error sending and marking reminders for case ${caseData.id}.`,
      error
    );
  }
}

async function executePromises(promises, errorMessage) {
  try {
    await Promise.all(
      promises.map((fn) => {
        if (typeof fn === "function") {
          return fn();
        } else {
          console.error(`Expected a function but got:`, fn);
          throw new TypeError("One or more promises are not functions");
        }
      })
    );
  } catch (err) {
    console.error(`Error executing ${errorMessage}.`, err);
  }
}

async function markRemindersAsSent(emailReminderId, reminderTypesToMark) {
  const markPromises = reminderTypesToMark.map((reminderType) => {
    // Log what is being added
    console.log(
      "emailReminderId -> ",
      emailReminderId,
      "Adding markReminder function"
    );
    return () =>
      markReminderAsSent(emailReminderId, reminderType, "onBoarding");
  });
  await executePromises(markPromises, `markReminderAsSent`);
}

module.exports = {
  sendOnboardingReminders,
};
