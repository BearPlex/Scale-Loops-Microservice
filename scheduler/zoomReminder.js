const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  convertToAMPM,
  generateICSFileForManual,
} = require("../utils/functions");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { sendZoomEmailReminder } = require("../services/supabaseController");
dayjs.extend(utc);

async function getMediatorCases() {
  try {
    // const today = dayjs.utc().format("YYYY-MM-DD");
    const twoDaysAfter = dayjs.utc().add(2, "day").format("YYYY-MM-DD");

    const { data, error: fetchError } = await supabase
      .from("cases")
      .select(
        `*,
        mediator:mediator_id(*),
        defender:defender_id(*),
        plaintiff:plaintiff_id(*)`
      )
      // .gte("mediation_date", today)
      // .lte("mediation_date", twoDaysAfter)
      .eq("mediation_date", twoDaysAfter)
      .neq("zoom_id", null);

    // console.log("today,twoDaysAfter", {
    //   // today,
    //   twoDaysAfter,
    //   caseIds: data?.map(({ id }) => id),
    // });

    if (fetchError) throw fetchError;
    // console.log("TotalCases: ", data?.length);
    return data;
  } catch (err) {
    console.error("Error fetching All Cases:", err);
    return [];
  }
}

async function formatAndSendEmail(
  mediator,
  caseData,
  client,
  icsCalendarData,
  emailLog = null
) {
  try {
    const baseData = {
      name: client.name,
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      zoomURL: caseData?.zoom_link,
      caseTitle: caseData?.case_name,
      caseNumber: caseData?.case_number,
      mediatorEmail: mediator?.email,
      is_odr_mediator: mediator?.is_odr_mediator,
      calenderBlob: btoa(icsCalendarData),
      case_id: caseData?.id,
    };

    // console.log("baseData", { ...baseData, email: client.email });

    // await sendZoomEmailReminder({ ...baseData, email: client.email }, emailLog);

    // if (mediator?.email_cc && Array.isArray(mediator.email_cc)) {
    //   for (const ccEmail of mediator.email_cc) {
    //     await sendZoomEmailReminder({ ...baseData, email: ccEmail });
    //   }
    // }

    console.log("sendZoomEmailReminder - Emails sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function sendZoomReminders() {
  try {
    const mediatorCases = await getMediatorCases();
    const emailPromises = [];
    for (const caseData of mediatorCases) {
      try {
        const icsData = generateICSFileForManual(caseData, caseData.mediator);
        if (caseData?.plaintiff?.client_id) {
          emailPromises.push(() =>
            formatAndSendEmail(
              caseData.mediator,
              caseData,
              caseData?.plaintiff,
              icsData,
              {
                plaintiff_id: caseData?.plaintiff?.client_id,
                case_id: caseData.id,
                type: "zoom",
                mediator: caseData.mediator.mediator_id,
                event: `Zoom Reminder Sent.`,
              }
            )
          );
        }
        if (caseData?.defender?.client_id) {
          emailPromises.push(() =>
            formatAndSendEmail(
              caseData.mediator,
              caseData,
              caseData?.defender,
              icsData,
              {
                defender_id: caseData.defender?.client_id,
                case_id: caseData.id,
                type: "zoom",
                mediator: caseData.mediator.mediator_id,
                event: `Zoom Reminder Sent.`,
              }
            )
          );
        }
        console.log(
          `Zoom Reminders for case ${caseData.id} have been processed.`
        );
      } catch (error) {
        console.error(
          `Error processing Zoom Reminder for case ${caseData.id}:`,
          error
        );
      }
    }
    // Execute all email functions
    await Promise.all(emailPromises.map((fn) => fn()));
  } catch (error) {
    console.error(`Error sending Zoom Reminders.`, error);
  }
}

module.exports = {
  sendZoomReminders,
};
