const supabase = require("../config/supabaseClient");
const cron = require("node-cron");
const moment = require("moment");
const {
  sendKeyDocumentEmailReminder,
} = require("../services/supabaseController");
const { convertToAMPM } = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
} = require("../services/supabaseController");

async function getOdrMediator() {
  const { data, error } = await supabase
    .from("mediators")
    .select("*")
    .eq("is_odr_mediator", true);
  // .eq("email", "hiqbal@bearplex.com");
  if (error) {
    return [];
  }
  return data ? data : [];
}

async function getMediatorCases(mediatorId, date) {
  const { data, error } = await supabase
    .from("cases")
    .select(`*,onboarding(*),odr_case_meta_data(*)`)
    .gt("mediation_date", date)
    .eq("mediator_id", mediatorId);
  // .eq("id", 900);

  if (error) {
    return [];
  }

  if (!data?.length) return [];

  return data.map((obj) => {
    // Check for plaintiff's onboarding and key document status
    const hasPlaintiffOnboarding = obj?.onboarding?.some(
      ({ client_id }) => client_id === obj?.plaintiff_id
    );
    const hasPlaintiffUploadDoc = obj?.odr_case_meta_data?.some(
      ({
        client_id,
        additional_docs,
        mediator_statement_docs,
        court_adr_order_docs,
      }) =>
        client_id === obj?.plaintiff_id &&
        (additional_docs?.length > 0 ||
          mediator_statement_docs?.length > 0 ||
          court_adr_order_docs?.length > 0)
    );

    // Check for defendant's onboarding and key document status
    const hasDefendantOnboarding = obj?.onboarding?.some(
      ({ client_id }) => client_id === obj?.defender_id
    );
    const hasDefendantUploadDoc = obj?.odr_case_meta_data?.some(
      ({
        client_id,
        additional_docs,
        mediator_statement_docs,
        court_adr_order_docs,
      }) =>
        client_id === obj?.defender_id &&
        (additional_docs?.length > 0 ||
          mediator_statement_docs?.length > 0 ||
          court_adr_order_docs?.length > 0)
    );

    return {
      ...obj,
      plaintiffStatus: {
        onBoarding: hasPlaintiffOnboarding,
        keyDocument: !!obj?.caption_page || hasPlaintiffUploadDoc,
      },
      defendantStatus: {
        onBoarding: hasDefendantOnboarding,
        keyDocument: hasDefendantUploadDoc,
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

async function formatAndSendEmail(mediator, caseData, client, emailLog = null) {
  try {
    const baseData = {
      name: client.name,
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
      onboardingURL: `${process.env.FRONT_END_BASE_URL}/onboarding-form/${caseData?.id}/${client?.client_id}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      caseTitle: caseData?.case_name,
      mediatorEmail: mediator?.email,
    };

    await sendKeyDocumentEmailReminder(
      { ...baseData, email: client.email },
      emailLog
    );

    if (mediator?.email_cc && Array.isArray(mediator.email_cc)) {
      for (const ccEmail of mediator.email_cc) {
        await sendKeyDocumentEmailReminder({ ...baseData, email: ccEmail });
      }
    }

    console.log("sendKeyDocumentEmailReminder - Emails sent successfully.");
  } catch (error) {
    console.error("Error sending sendKeyDocumentEmailReminder Email:", error);
  }
}

async function sendKeyDocumentsReminders() {
  const today = moment().startOf("day").format("YYYY-MM-DD");
  // const today = moment("2025-05-22").startOf("day").format("YYYY-MM-DD");
  try {
    const mediators = await getOdrMediator();

    for (const mediator of mediators) {
      const mediatorCases = await getMediatorCases(mediator?.user_id, today);
      for (const caseData of mediatorCases) {
        if (
          caseData.plaintiffStatus.keyDocument &&
          caseData.defendantStatus.keyDocument
        ) {
          console.log(
            "Skipping caseData: Key Document Completed, Case Id:",
            caseData?.id,
            ` Date: ${today}`
          );
          continue;
        }
        const emailReminders = await fetchEmailRemainders(
          caseData.id,
          mediator?.user_id,
          today,
          "key-documents"
        );

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

        if (!todaysReminders.length) {
          console.log(
            `No unsent Key Document Reminders for case ${caseData.id} , Date: ${today}`
          );
          continue;
        }

        const [plaintiffData, defendantData] = await Promise.all([
          !caseData.plaintiffStatus.onBoarding ||
          !caseData.plaintiffStatus.keyDocument
            ? getClientInformation(caseData.plaintiff_id)
            : null,
          !caseData.defendantStatus.onBoarding ||
          !caseData.defendantStatus.keyDocument
            ? getClientInformation(caseData.defender_id)
            : null,
        ]);

        const emailPromises = [];
        const markReminderPromises = [];

        for (const { reminderType } of todaysReminders) {
          try {
            if (
              plaintiffData &&
              (!caseData.plaintiffStatus.onBoarding ||
                !caseData.plaintiffStatus.keyDocument)
            ) {
              emailPromises.push(() =>
                formatAndSendEmail(mediator, caseData, plaintiffData, {
                  plaintiff_id: caseData.plaintiff_id,
                  case_id: caseData.id,
                  type: "key-documents",
                  mediator: mediator.mediator_id,
                  event: "Key Document Reminder Sent",
                })
              );
            }
            if (
              defendantData &&
              (!caseData.defendantStatus.onBoarding ||
                !caseData.defendantStatus.keyDocument)
            ) {
              emailPromises.push(() =>
                formatAndSendEmail(mediator, caseData, defendantData, {
                  defender_id: caseData.defender_id,
                  case_id: caseData.id,
                  type: "key-documents",
                  mediator: mediator.mediator_id,
                  event: "Key Document Reminder Sent",
                })
              );
            }

            markReminderPromises.push(() =>
              markReminderAsSent(
                emailReminders.id,
                reminderType,
                "key-documents"
              )
            );
          } catch (error) {
            console.error(
              `Error processing Key Document Reminder ${reminderType} for case ${caseData.id}:`,
              error
            );
          }
        }

        // Execute all email functions
        await Promise.all(emailPromises.map((fn) => fn()));
        // Execute all markReminder functions
        await Promise.all(markReminderPromises.map((fn) => fn()));

        console.log(
          `Key Document Reminders for case ${caseData.id} have been processed. Date: ${today}`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error sending Key Document Reminders. Date: ${today}`,
      error
    );
  }
}

module.exports = { sendKeyDocumentsReminders };