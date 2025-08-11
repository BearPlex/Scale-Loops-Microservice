const supabase = require("../config/supabaseClient");
const cron = require("node-cron");
const moment = require("moment");
const {
  sendBriefEmailReminder,
  sendOnboardingEmailReminder,
} = require("../services/supabaseController");
const {
  convertToAMPM,
  countValidReminders,
  convertCountingWordToDigit,
  getNextValidReminder,
  getFullCaseName,
  getPrimaryAccessorByRole,
} = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
} = require("../services/supabaseController");
const { calculateBriefDays } = require("../utils/functions");
const {
  casePrimaryAndAdditionalPartiesData,
} = require("../utils/helpers/caseDetail.helper");

const slotsNames = {
  morning: "Morning",
  afternoon: "Afternoon",
  fullday: "Full Day",
};

async function getMediator() {
  const { data, error } = await supabase
    .from("mediators")
    .select("*")
    .eq("is_odr_mediator", false);
  // .eq("email", "hiqbal@bearplex.com");

  if (error) {
    return [];
  }
  return data ? data : [];
}

async function getMediatorCases(mediatorId, date) {
  try {
    const filters = [{ column: "mediation_date", value: date }];

    const cases = await casePrimaryAndAdditionalPartiesData(
      null,
      mediatorId,
      filters
    );

    if (!cases?.length) return [];

    const isBriefDone = (party) =>
      party?.onboarding?.brief_info?.length > 0 ||
      party?.onboarding?.is_brief_submit_manually === true;

    const isOnboardingDone = (party) => party?.onboarding?.completed === true;

    return Array.isArray(cases) && cases.length > 0
      ? cases.map((caseData) => ({
          ...caseData,
          isAllPlaintiffBriefDone:
            isBriefDone(caseData?.plaintiff) &&
            (Array.isArray(caseData?.plaintiff?.additionalParties)
              ? caseData.plaintiff.additionalParties.every(isBriefDone)
              : true),
          isAllDefendantBriefDone:
            isBriefDone(caseData?.defendant) &&
            (Array.isArray(caseData?.defendant?.additionalParties)
              ? caseData.defendant.additionalParties.every(isBriefDone)
              : true),
          isAllPlaintiffOnboardingDone:
            isOnboardingDone(caseData?.plaintiff) &&
            (Array.isArray(caseData?.plaintiff?.additionalParties)
              ? caseData.plaintiff.additionalParties.every(isOnboardingDone)
              : true),
          isAllDefendantOnboardingDone:
            isOnboardingDone(caseData?.defendant) &&
            (Array.isArray(caseData?.defendant?.additionalParties)
              ? caseData.defendant.additionalParties.every(isOnboardingDone)
              : true),
        }))
      : [];
  } catch (err) {
    console.error("Unexpected error in getMediatorCases:", err);
    return [];
  }
}

async function onBoardingEmail(mediator, caseData, client) {
  try {
    const briefDays = calculateBriefDays(
      caseData.mediation_date,
      mediator?.reminderDays?.brief_reminder_days,
      mediator?.timezone
    );

    const baseData = {
      email: client.email,
      name: client.name,
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
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
    };

    await sendOnboardingEmailReminder({
      ...baseData,
      email: client.email,
      case_id: caseData?.id,
    });

    const alternateEmails = client.alternate_emails || [];

    console.log(
      "Case ID ->",
      caseData?.id,
      "Client Email ->",
      client?.email,
      "->  alternateEmails",
      alternateEmails
    );

    if (Array.isArray(alternateEmails) && alternateEmails?.length > 0) {
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
      "sendOnboardingEmailReminder - Onboarding emails sent successfully."
    );
  } catch (error) {
    console.error("Error sending onboarding email:", error);
  }
}

async function formatAndSendEmail(mediator, caseData, client, emailLog = null) {
  try {
    const baseData = {
      name: client.name,
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
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
      mediatorUserId: mediator?.user_id,
    };

    await sendBriefEmailReminder(
      { ...baseData, email: client.email },
      emailLog
    );

    const alternateEmails = client?.alternate_emails || [];

    console.log(
      "Case ID ->",
      caseData?.id,
      "Client Email ->",
      client?.email,
      "->  alternateEmails",
      alternateEmails
    );

    if (Array.isArray(alternateEmails) && alternateEmails?.length > 0) {
      for (const alternateEmail of alternateEmails) {
        await sendBriefEmailReminder({ ...baseData, email: alternateEmail });
      }
    }

    if (mediator?.email_cc && Array.isArray(mediator.email_cc)) {
      for (const ccEmail of mediator.email_cc) {
        await sendBriefEmailReminder({ ...baseData, email: ccEmail });
      }
    }

    console.log("sendBriefEmailReminder - Emails sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function sendBriefReminders() {
  const today = moment().startOf("day").format("YYYY-MM-DD");
  // const today = moment("2025-08-19").startOf("day").format("YYYY-MM-DD");

  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      const mediatorCases = await getMediatorCases(mediator?.user_id, today);

      for (const caseData of mediatorCases) {
        if (
          caseData.isAllPlaintiffBriefDone &&
          caseData.isAllDefendantBriefDone
        ) {
          console.log(
            "Skipping caseData: Brief Completed, Case Id:",
            caseData?.id,
            ` Date: ${today}`
          );
          continue;
        }

        const emailReminders = await fetchEmailRemainders(
          caseData.id,
          mediator?.user_id,
          today,
          "brief"
        );

        const totalReminders = countValidReminders(emailReminders?.reminders);
        const todaysReminders = Object.entries(emailReminders?.reminders || {})
          .filter(
            ([_, reminder]) =>
              reminder &&
              moment(reminder?.date).isSame(today, "day") &&
              !reminder?.is_sent
          )
          .map(([reminderType, reminder]) => ({ reminderType, reminder }));

        if (!todaysReminders.length) {
          console.log(
            `No unsent Brief Reminders for case ${caseData.id} , Date: ${today}`
          );
          continue;
        }

        const { plaintiff: plaintiffData, defendant: defendantData } = caseData;

        const emailPromises = [];
        const markReminderPromises = [];

        for (const { reminderType } of todaysReminders) {
          try {
            const nextReminderDate = getNextValidReminder(
              emailReminders?.reminders || {},
              reminderType || null
            )?.date;

            const email_number = convertCountingWordToDigit(reminderType);
            const eventLabel = `Brief Reminder ${email_number}/${totalReminders}`;
            const next_reminder = nextReminderDate
              ? moment(nextReminderDate).format("MMMM D, YYYY")
              : null;

            const baseBriefEmailLogPayload = {
              type: "brief",
              case_id: caseData.id,
              mediator: mediator.mediator_id,
              event: eventLabel,
              email_number,
              next_reminder,
            };

            const handleRole = ({ role, roleData }) => {
              if (!roleData) return;

              const primaryKey = getPrimaryAccessorByRole(role);

              const isOnboardingComplete =
                roleData?.onboarding?.completed === true;
              const isBriefDone =
                roleData?.onboarding?.brief_info?.length > 0 ||
                roleData?.onboarding?.is_brief_submit_manually === true;

              if (!isOnboardingComplete && !isBriefDone) {
                emailPromises.push(() =>
                  onBoardingEmail(mediator, caseData, roleData)
                );
              }

              if (isOnboardingComplete && !isBriefDone) {
                emailPromises.push(() =>
                  formatAndSendEmail(mediator, caseData, roleData, {
                    ...baseBriefEmailLogPayload,
                    [primaryKey]: roleData.client_id,
                    additional_client_id: null,
                  })
                );
              }

              for (const party of roleData?.additionalParties || []) {
                const isPartyOnboardingComplete =
                  party?.onboarding?.completed === true;

                const isPartyBriefDone =
                  party?.onboarding?.brief_info?.length > 0 ||
                  party?.onboarding?.is_brief_submit_manually === true;

                if (!isPartyOnboardingComplete && !isPartyBriefDone) {
                  emailPromises.push(() =>
                    onBoardingEmail(mediator, caseData, {
                      ...party,
                      uuid: party?.client?.uuid,
                    })
                  );
                  continue;
                }

                if (isPartyOnboardingComplete && !isPartyBriefDone) {
                  emailPromises.push(() =>
                    formatAndSendEmail(
                      mediator,
                      caseData,
                      { ...party, uuid: party?.client?.uuid },
                      {
                        ...baseBriefEmailLogPayload,
                        [primaryKey]: party.primary_party_id,
                        additional_client_id: party.client_id,
                      }
                    )
                  );
                }
              }
            };

            handleRole({
              role: "plaintiff",
              roleData: plaintiffData,
            });

            handleRole({
              role: "defendant",
              roleData: defendantData,
            });

            markReminderPromises.push(() =>
              markReminderAsSent(emailReminders.id, reminderType, "brief")
            );
          } catch (error) {
            console.error(
              `Error processing Brief Reminder ${reminderType} for case ${caseData.id}:`,
              error
            );
          }
        }

        // Execute all email functions
        await Promise.all(emailPromises.map((fn) => fn()));
        // Execute all markReminder functions
        await Promise.all(markReminderPromises.map((fn) => fn()));

        console.log(
          `Brief Reminders for case ${caseData.id} have been processed. Date: ${today}`
        );
      }
    }
  } catch (error) {
    console.error(`Error sending Brief Reminders. Date: ${today}`, error);
  }
}

// sendBriefReminders();

module.exports = {
  sendBriefReminders,
};
