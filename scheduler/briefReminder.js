const supabase = require("../config/supabaseClient");
const cron = require("node-cron");
const moment = require("moment");
const {
  sendBriefEmailReminder,
  sendOnboardingEmailReminder,
} = require("../services/supabaseController");
const { convertToAMPM } = require("../utils/functions");
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
  const { data, error } = await supabase
    .from("cases")
    .select("*,onboarding(*)")
    .gt("mediation_date", date)
    .eq("mediator_id", mediatorId);
  // .eq("id", 1148);

  if (error) {
    return [];
  }

  if (!data?.length) return [];

  return data.map((obj) => {
    // Check for plaintiff's onboarding and brief status
    const hasPlaintiffOnboarding = obj?.onboarding?.some(
      ({ client_id }) => client_id === obj?.plaintiff_id
    );
    const hasPlaintiffBrief = obj?.onboarding?.some(
      ({ client_id, brief_info, is_brief_submit_manually }) =>
        client_id === obj?.plaintiff_id &&
        (brief_info?.length > 0 || is_brief_submit_manually === true)
    );

    // Check for defendant's onboarding and brief status
    const hasDefendantOnboarding = obj?.onboarding?.some(
      ({ client_id }) => client_id === obj?.defender_id
    );
    const hasDefendantBrief = obj?.onboarding?.some(
      ({ client_id, brief_info, is_brief_submit_manually }) =>
        client_id === obj?.defender_id &&
        (brief_info?.length > 0 || is_brief_submit_manually === true)
    );

    return {
      ...obj,
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
    // console.log("client", client);
    const baseData = {
      email: client.email,
      name: client.name,
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      caseNumber: caseData?.case_number,
      caseTitle: caseData?.case_name,
      mediatorEmail: mediator?.email,
      briefDueDate: briefDays,
    };

    await sendOnboardingEmailReminder({
      ...baseData,
      email: client.email,
      case_id: caseData?.id,
    });

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
    // console.log("client", client);
    const baseData = {
      name: client.name,
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      caseNumber: caseData?.case_number,
      caseTitle: caseData?.case_name,
      mediatorEmail: mediator?.email,
      mediatorUserId: mediator?.user_id,
    };

    await sendBriefEmailReminder(
      { ...baseData, email: client.email },
      emailLog
    );

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
  // const today = moment("2025-06-18").startOf("day").format("YYYY-MM-DD");
  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      const mediatorCases = await getMediatorCases(mediator?.user_id, today);
      // console.log(mediatorCases?.[0]);
      // return;
      for (const caseData of mediatorCases) {
        // console.log("caseData", caseData);
        if (caseData.plaintiffStatus.brief && caseData.defendantStatus.brief) {
          console.log(
            "Skipping caseData: Brief Completed, Case Id:",
            caseData?.id,
            ` Date: ${today}`
          );
          continue;
        }
        // console.log("caseData", caseData);
        const emailReminders = await fetchEmailRemainders(
          caseData.id,
          mediator?.user_id,
          today,
          "brief"
        );

        // console.log("emailReminders", emailReminders);
        // return;

        const cleanedReminders = Object.fromEntries(
          Object.entries(emailReminders?.reminders || {}).filter(
            ([_, reminder]) => reminder !== null
          )
        );
        const todaysReminders = Object.entries(cleanedReminders || {})
          .filter(
            ([_, reminder]) =>
              moment(reminder?.date).isSame(today, "day") && !reminder.is_sent
          )
          .map(([reminderType, reminder]) => ({ reminderType, reminder }));

        // console.log("todaysReminders", {
        //   todaysReminders,
        //   mediator_id: mediator?.mediator_id,
        // });
        // return;
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

        // console.log(
        //   "plaintiffData, defendantData",
        //   plaintiffData,
        //   defendantData
        // );
        //  return;
        const emailPromises = [];
        const markReminderPromises = [];

        for (const { reminderType } of todaysReminders) {
          try {
            // console.log("caseData.plaintiffStatus", caseData.plaintiffStatus);

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
                      event: "Brief Reminder Sent",
                    })
              );
            }
            // console.log("caseData.defendantStatus", caseData.defendantStatus);

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
                      event: "Brief Reminder Sent",
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
