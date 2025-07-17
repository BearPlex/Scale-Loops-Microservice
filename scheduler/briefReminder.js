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
} = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
} = require("../services/supabaseController");
const { calculateBriefDays } = require("../utils/functions");

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
    const { data: cases, error: casesError } = await supabase
      .from("cases")
      .select("*, onboarding(*)")
      .gt("mediation_date", date)
      .eq("mediator_id", mediatorId);
    // .eq("id", 1188);

    if (casesError) {
      console.error("Error fetching cases:", casesError);
      return [];
    }

    if (!cases?.length) return [];

    const caseIds = cases.map((c) => c.id);
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .in("case_id", caseIds);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
    }

    return cases.map((obj) => {
      const caseParticipants =
        participants?.filter((p) => p.case_id === obj.id) || [];

      const hasPlaintiffOnboarding = obj?.onboarding?.some(
        ({ client_id, completed }) =>
          client_id === obj?.plaintiff_id && completed === true
      );
      const hasPlaintiffBrief = obj?.onboarding?.some(
        ({ client_id, brief_info, is_brief_submit_manually }) =>
          client_id === obj?.plaintiff_id &&
          (brief_info?.length > 0 || is_brief_submit_manually === true)
      );

      const hasDefendantOnboarding = obj?.onboarding?.some(
        ({ client_id, completed }) =>
          client_id === obj?.defender_id && completed === true
      );
      const hasDefendantBrief = obj?.onboarding?.some(
        ({ client_id, brief_info, is_brief_submit_manually }) =>
          client_id === obj?.defender_id &&
          (brief_info?.length > 0 || is_brief_submit_manually === true)
      );

      return {
        ...obj,
        participants: caseParticipants,
        plaintiffStatus: {
          onBoarding: hasPlaintiffOnboarding,
          brief: hasPlaintiffBrief,
        },
        defendantStatus: {
          onBoarding: hasDefendantOnboarding,
          brief: hasDefendantBrief,
        },
      };
    });
  } catch (err) {
    console.error("Unexpected error in getMediatorCases:", err);
    return [];
  }
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
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
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

    const alternateEmails =
      caseData?.participants?.find(
        (x) => x.client_id === client?.client_id && x.email === client?.email
      )?.alternate_emails || [];

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
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
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

    const alternateEmails =
      caseData?.participants?.find(
        (x) => x.client_id === client?.client_id && x.email === client?.email
      )?.alternate_emails || [];

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
  // const today = moment("2025-07-02").startOf("day").format("YYYY-MM-DD");

  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      const mediatorCases = await getMediatorCases(mediator?.user_id, today);
      for (const caseData of mediatorCases) {
        if (caseData.plaintiffStatus.brief && caseData.defendantStatus.brief) {
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

        const [plaintiffData, defendantData] = await Promise.all([
          !caseData.plaintiffStatus.onBoarding ||
          !caseData.plaintiffStatus.brief
            ? getClientInformation(caseData.plaintiff_id)
            : null,
          !caseData.defendantStatus.onBoarding ||
          !caseData.defendantStatus.brief
            ? getClientInformation(caseData.defender_id)
            : null,
        ]);

        const emailPromises = [];
        const markReminderPromises = [];

        for (const { reminderType } of todaysReminders) {
          try {
            const nextReminderDate = getNextValidReminder(
              emailReminders?.reminders || {},
              reminderType || null
            )?.date;

            if (
              plaintiffData &&
              (!caseData.plaintiffStatus.onBoarding ||
                !caseData.plaintiffStatus.brief)
            ) {
              emailPromises.push(() =>
                !caseData.plaintiffStatus.onBoarding
                  ? onBoardingEmail(mediator, caseData, plaintiffData)
                  : formatAndSendEmail(mediator, caseData, plaintiffData, {
                      plaintiff_id: caseData.plaintiff_id,
                      case_id: caseData.id,
                      type: "brief",
                      mediator: mediator.mediator_id,
                      event: `Brief Reminder ${convertCountingWordToDigit(
                        reminderType
                      )}/${totalReminders}`,
                      next_reminder:
                        nextReminderDate !== null &&
                        nextReminderDate !== undefined
                          ? moment(nextReminderDate).format("MMMM D,YYYY")
                          : null,
                    })
              );
            }

            if (
              defendantData &&
              (!caseData.defendantStatus.onBoarding ||
                !caseData.defendantStatus.brief)
            ) {
              emailPromises.push(() =>
                !caseData.defendantStatus.onBoarding
                  ? onBoardingEmail(mediator, caseData, defendantData)
                  : formatAndSendEmail(mediator, caseData, defendantData, {
                      defender_id: caseData.defender_id,
                      case_id: caseData.id,
                      type: "brief",
                      mediator: mediator.mediator_id,
                      event: `Brief Reminder ${convertCountingWordToDigit(
                        reminderType
                      )}/${totalReminders}`,
                      next_reminder:
                        nextReminderDate !== null &&
                        nextReminderDate !== undefined
                          ? moment(nextReminderDate).format("MMMM D,YYYY")
                          : null,
                    })
              );
            }

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

module.exports = {
  sendBriefReminders,
};
