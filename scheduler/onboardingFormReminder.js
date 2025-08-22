const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  convertToAMPM,
  getNextValidReminder,
  countValidReminders,
  convertCountingWordToDigit,
  getFullCaseName,
  getPrimaryAccessorByRole,
} = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
  sendOnboardingEmailReminder,
} = require("../services/supabaseController");
const { calculateBriefDays } = require("../utils/functions");
const {
  casePrimaryAndAdditionalPartiesData,
} = require("../utils/helpers/caseDetail.helper");

async function getMediator() {
  const { data, error } = await supabase.from("mediators").select("*");
  // .neq("email", "eric@resolvewannon.com");

  if (error) {
    return [];
  }
  return data ? data : [];
}

async function getMediatorCases(mediatorId, date) {
  try {
    const filters = [
      { column: "mediation_date", value: date, type: "gte" },
      // { column: "id", value: 622 },
    ];

    const cases = await casePrimaryAndAdditionalPartiesData(
      null,
      mediatorId,
      filters
    );

    return Array.isArray(cases) && cases.length > 0
      ? cases.map((caseData) => ({
          ...caseData,

          isAllPlaintiffOnboardingDone:
            caseData?.plaintiff?.onboarding?.completed === true &&
            (Array.isArray(caseData?.plaintiff?.additionalParties)
              ? caseData.plaintiff.additionalParties.every(
                  (p) => p?.onboarding?.completed === true
                )
              : true),

          isAllDefendantOnboardingDone:
            caseData?.defendant?.onboarding?.completed === true &&
            (Array.isArray(caseData?.defendant?.additionalParties)
              ? caseData.defendant.additionalParties.every(
                  (d) => d?.onboarding?.completed === true
                )
              : true),
        }))
      : [];
  } catch (err) {
    console.error("Unexpected error:", err);
    return [];
  }
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
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.uuid}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      caseNumber: caseData?.case_number,
      caseTitle: getFullCaseName(
        caseData?.case_name,
        caseData?.additional_case_names
      ),
      mediatorEmail: mediator?.email,
      briefDueDate: briefDays,
      // `${moment(caseData?.mediation_date).format(
      //   "DD MMMM, YYYY"
      // )} - ${slotsNames[caseData?.slot_type.toLowerCase()]} (${convertToAMPM(
      //   caseData?.case_schedule_time
      // )} ${caseData?.slot_type === "fullday" ? "onwards" : ""})`,
    };

    const alternateEmails = client?.alternate_emails || [];

    console.log("Case ID ->", caseData?.id, "  baseData", baseData);
    // Send email to the client
    await sendOnboardingEmailReminder(
      { ...baseData, email: client.email, case_id: caseData?.id },
      emailLog
    );

    console.log(
      "Case ID ->",
      caseData?.id,
      "Client Email ->",
      client?.email,
      "->  alternateEmails",
      alternateEmails
    );

    if (Array.isArray(alternateEmails) && alternateEmails.length > 0) {
      for (const alternateEmail of alternateEmails) {
        await sendOnboardingEmailReminder({
          ...baseData,
          email: alternateEmail,
          case_id: caseData?.id,
        });
      }
    }

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
  // const today = moment("2025-08-21").startOf("day").format("YYYY-MM-DD");

  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      try {
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
    // return;
    for (const caseData of mediatorCases) {
      try {
        if (
          caseData.isAllPlaintiffOnboardingDone &&
          caseData.isAllDefendantOnboardingDone
        ) {
          console.log(
            "Skipping caseData: All Partoes OnBoarding Completed, Case Id:",
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
    const { plaintiff: plaintiffData, defendant: defendantData } = caseData;
    const emailPromises = [];
    const reminderTypesToMark = [];

    for (const { reminderType } of todaysReminders) {
      try {
        const nextReminderDate = getNextValidReminder(
          emailReminders?.reminders || {},
          reminderType
        )?.date;

        const email_number = convertCountingWordToDigit(reminderType);
        const eventLabel = `Onboarding Reminder ${email_number}/${countValidReminders(
          emailReminders?.reminders
        )}`;
        const next_reminder = nextReminderDate
          ? moment(nextReminderDate).format("MMMM D, YYYY")
          : null;

        const baseEmailLogPayload = {
          type: "onboarding",
          case_id: caseData.id,
          mediator: mediator.mediator_id,
          event: eventLabel,
          email_number,
          next_reminder,
          // created_at: "2025-08-21 18:01:24.099244+00",
        };

        const processRole = (role, roleData, isDoneCheck) => {
          if (!caseData[isDoneCheck] && roleData) {
            console.log(`Adding email function for all ${role}s`);
            console.log(
              `${role}Data?.onboarding?.completed`,
              !!roleData?.onboarding?.completed
            );

            const primaryKey = getPrimaryAccessorByRole(role);

            // Main party
            if (Boolean(roleData?.onboarding?.completed) === false) {
              emailPromises.push(() =>
                formatAndSendEmail(mediator, caseData, roleData, {
                  ...baseEmailLogPayload,
                  [primaryKey]: roleData.client_id,
                  additional_client_id: null,
                })
              );
            }

            // Additional parties
            for (const party of roleData?.additionalParties || []) {
              if (Boolean(party?.onboarding?.completed) === false) {
                emailPromises.push(() =>
                  formatAndSendEmail(
                    mediator,
                    caseData,
                    { ...party, uuid: party?.client?.uuid },
                    {
                      ...baseEmailLogPayload,
                      [primaryKey]: party.primary_party_id,
                      additional_client_id: party.client_id,
                    }
                  )
                );
              }
            }
          }
        };

        processRole("plaintiff", plaintiffData, "isAllPlaintiffOnboardingDone");
        processRole("defendant", defendantData, "isAllDefendantOnboardingDone");

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
