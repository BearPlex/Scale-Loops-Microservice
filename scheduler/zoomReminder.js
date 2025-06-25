const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  convertToAMPM,
  generateICSFileForManual,
} = require("../utils/functions");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const {
  sendZoomEmailReminder,
  sendZoomEmailReminderForMediators,
  getParticipants,
} = require("../services/supabaseController");
dayjs.extend(utc);

async function getMediatorCases() {
  try {
    const twoDaysAfter = dayjs.utc().add(1, "day").format("YYYY-MM-DD");

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
    // .eq("id", 1153);

    if (fetchError) throw fetchError;
    // console.log("TotalCases: ", data?.length);
    return data;
  } catch (err) {
    console.error("Error fetching All Cases:", err);
    return [];
  }
}

async function formatAndSendEmailForMediator(
  mediator,
  caseData,
  icsCalendarData
) {
  try {
    const baseData = {
      mediatorName: `${mediator?.first_name} ${mediator?.last_name}`,
      dateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      zoomURL: caseData?.zoom_link,
      caseTitle: caseData?.case_name,
      caseNumber: caseData?.case_number,
      is_odr_mediator: mediator?.is_odr_mediator,
      calenderBlob: btoa(icsCalendarData),
    };

    console.log("baseData:sendZoomEmailReminderForMediators(Mediator)", {
      email: mediator.email,
    });

    await sendZoomEmailReminderForMediators({
      ...baseData,
      email: mediator.email,
    });

    console.log("sendZoomEmailReminder - Emails sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
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
      is_odr_mediator: mediator?.is_odr_mediator,
      calenderBlob: btoa(icsCalendarData),
      case_id: caseData?.id,
      mediatorEmail: mediator?.email,
    };

    console.log("baseData:sendZoomEmailReminder(Parties)", {
      email: client.email,
    });

    await sendZoomEmailReminder({ ...baseData, email: client.email }, emailLog);

    if (mediator?.email_cc && Array.isArray(mediator.email_cc)) {
      for (const ccEmail of mediator.email_cc) {
        await sendZoomEmailReminder({ ...baseData, email: ccEmail });
      }
    }

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
          let participants = await getParticipants(
            caseData.id,
            caseData?.plaintiff?.client_id
          );
          participants = participants?.filter(
            ({ email }) => email !== caseData?.plaintiff.email
          );
          for (const participant of participants) {
            emailPromises.push(() =>
              formatAndSendEmail(
                caseData.mediator,
                caseData,
                participant,
                icsData,
                null
              )
            );
          }
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
          let participants = await getParticipants(
            caseData.id,
            caseData?.defender?.client_id
          );
          participants = participants?.filter(
            ({ email }) => email !== caseData?.defender.email
          );
          for (const participant of participants) {
            emailPromises.push(() =>
              formatAndSendEmail(
                caseData.mediator,
                caseData,
                participant,
                icsData,
                null
              )
            );
          }

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

        emailPromises.push(() =>
          formatAndSendEmailForMediator(caseData.mediator, caseData, icsData)
        );

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
