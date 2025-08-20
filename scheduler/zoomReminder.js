const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  convertToAMPM,
  generateICSFileForManual,
  getFullCaseName,
  getPrimaryAccessorByRole,
  delay,
} = require("../utils/functions");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const {
  sendZoomEmailReminder,
  sendZoomEmailReminderForMediators,
} = require("../services/supabaseController");
const {
  casePrimaryAndAdditionalPartiesData,
} = require("../utils/helpers/caseDetail.helper");
dayjs.extend(utc);

async function getMediator() {
  const { data, error } = await supabase.from("mediators").select("*");
  // .eq("email", "hiqbal@bearplex.com");

  if (error) {
    return [];
  }
  return data ? data : [];
}

async function getMediatorCases(mediatorId) {
  try {
    const oneDayAfter = dayjs.utc().add(1, "day").format("YYYY-MM-DD");
    // const oneDayAfter = dayjs
    //   .utc("2025-08-26")
    //   .add(1, "day")
    //   .format("YYYY-MM-DD");

    const filters = [
      { column: "mediation_date", value: oneDayAfter },
      { column: "zoom_id", value: null, type: "neq" },
    ];

    const cases = await casePrimaryAndAdditionalPartiesData(
      null,
      mediatorId,
      filters
    );

    if (!cases?.length) return [];
    return cases;
  } catch (err) {
    console.error("Unexpected error in getMediatorCases:", err);
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
      caseTitle: getFullCaseName(
        caseData?.case_name,
        caseData?.additional_case_names
      ),
      caseNumber: caseData?.case_number,
      is_odr_mediator: mediator?.is_odr_mediator,
      calenderBlob: icsCalendarData,
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
      caseTitle: getFullCaseName(
        caseData?.case_name,
        caseData?.additional_case_names
      ),
      caseNumber: caseData?.case_number,
      is_odr_mediator: mediator?.is_odr_mediator,
      calenderBlob: icsCalendarData,
      case_id: caseData?.id,
      mediatorEmail: mediator?.email,
    };

    const alternateEmails =
      caseData?.participants?.find(
        (x) => x.client_id === client?.client_id && x.email === client?.email
      )?.alternate_emails || [];

    console.log(
      "baseData:sendZoomEmailReminder(Parties)::",
      "\nclient_email -> ",
      client.email,
      "\nCase ID ->",
      caseData?.id,
      "\nClient Email ->",
      client?.email,
      "AlternateEmails ->",
      alternateEmails
    );

    await sendZoomEmailReminder({ ...baseData, email: client.email }, emailLog);

    if (Array.isArray(alternateEmails) && alternateEmails?.length > 0) {
      for (const alternateEmail of alternateEmails) {
        await sendZoomEmailReminder({ ...baseData, email: alternateEmail });
      }
    }

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
    const mediators = await getMediator();
    const emailPromises = [];

    for (const mediator of mediators) {
      const mediatorCases = await getMediatorCases(mediator?.user_id);
      for (const caseData of mediatorCases) {
        try {
          const { plaintiff, defendant, mediator_id: caseMediator } = caseData;
          const icsData = generateICSFileForManual(caseData, caseMediator);

          const processPartyEmails = (party, partyRoleKey) => {
            if (!party?.client_id) return;

            const participants =
              party?.participants?.filter(
                ({ email }) => email !== party.email
              ) || [];

            for (const participant of participants) {
              emailPromises.push(() =>
                formatAndSendEmail(
                  caseMediator,
                  caseData,
                  participant,
                  icsData,
                  null
                )
              );
            }

            emailPromises.push(() =>
              formatAndSendEmail(caseMediator, caseData, party, icsData, {
                [`${partyRoleKey}_id`]: party.client_id,
                case_id: caseData.id,
                type: "zoom",
                mediator: caseMediator?.mediator_id,
                event: "Zoom Reminder Sent.",
              })
            );

            for (const additionalParty of party?.additionalParties || []) {
              console.log("party?.additionalParties", party?.additionalParties);
              const additionalParticipants =
                additionalParty?.participants?.filter(
                  ({ email }) => email !== party.email
                ) || [];

              for (const participant of additionalParticipants) {
                emailPromises.push(() =>
                  formatAndSendEmail(
                    caseMediator,
                    caseData,
                    participant,
                    icsData,
                    null
                  )
                );
              }

              emailPromises.push(() =>
                formatAndSendEmail(
                  caseMediator,
                  caseData,
                  additionalParty,
                  icsData,
                  {
                    [`${getPrimaryAccessorByRole(additionalParty.role)}`]:
                      additionalParty.primary_party_id ??
                      additionalParty.client_id,
                    additional_client_id:
                      additionalParty.primary_party_id !== null
                        ? additionalParty.client_id
                        : null,
                    case_id: caseData.id,
                    type: "zoom",
                    mediator: caseMediator?.mediator_id,
                    event: "Zoom Reminder Sent.",
                  }
                )
              );
            }
          };

          processPartyEmails(plaintiff, "plaintiff");
          processPartyEmails(defendant, "defender");

          emailPromises.push(() =>
            formatAndSendEmailForMediator(caseMediator, caseData, icsData)
          );

          console.log(`Zoom Reminders for All Case Proccessed.`);
        } catch (error) {
          console.error(
            `Error processing Zoom Reminder for case ${caseData.id}:`,
            error
          );
        }
      }
    }

    // Execute all email functions
    // await Promise.all(emailPromises.map(async (fn) => await fn()));
    for (const fn of emailPromises) {
      try {
        await fn();
        await delay(500);
      } catch (err) {
        console.error("Error sending one email:", err);
      }
    }

    console.log("All Zoom Reminders sent successfully.");
  } catch (error) {
    console.error("Error sending Zoom Reminders:", error);
  }
}

module.exports = {
  sendZoomReminders,
};
