const supabase = require("../config/supabaseClient");
const cron = require("node-cron");
const moment = require("moment");
const { sendPaymentsReminders } = require("../services/supabaseController");
const {
  formatAmount,
  convertToAMPM,
  generateInvoiceUrlFrontend,
  getFullCaseName,
  getPrimaryAccessorByRole,
  delay,
} = require("../utils/functions");
const {
  fetchEmailRemainders,
  markReminderAsSent,
} = require("../services/supabaseController");
const {
  countValidReminders,
  convertCountingWordToDigit,
  getNextValidReminder,
} = require("../utils/functions");
const {
  casePrimaryAndAdditionalPartiesData,
} = require("../utils/helpers/caseDetail.helper");

async function getMediator() {
  const { data, error } = await supabase.from("mediators").select("*");
  // .eq("email", "eric@resolvewannon.com");

  if (error) {
    return [];
  }
  return data ? data : [];
}

async function getMediatorCases(mediatorId, today) {
  try {
    const filters = [{ column: "mediation_date", value: today, type: "gte" }];

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

const sendPaymentEmail = async (caseData, partyData, reminderArr = null) => {
  try {
    // console.log("sendPaymentEmail -> paymentInfo", partyData.payment);
    // console.log("caseData?.mediator_id", caseData?.mediator_id);
    // console.log("reminderArr", reminderArr);
    // return;

    const mediationDate = moment(caseData?.mediation_date).startOf("day");

    const xDaysAfterOnBoarding = moment(partyData?.onboarding?.created_at)
      .add(caseData?.mediator_id?.payment_reminder_days, "day")
      .utc();

    const remainingDueDays =
      mediationDate.diff(xDaysAfterOnBoarding, "days") + 1;

    const baseEmailData = {
      name: partyData?.name,
      mediatorName: `${caseData?.mediator_id?.first_name} ${caseData?.mediator_id?.last_name}`,
      mediationDateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      totalDue: formatAmount(
        partyData?.payment?.grand_total && partyData?.payment?.grand_total > 0
          ? partyData?.payment?.grand_total
          : partyData?.payment?.amount
      ),
      dueDate:
        remainingDueDays <= 0
          ? moment(partyData?.onboarding?.created_at)
              .startOf("day")
              .format("MMMM DD, YYYY")
          : moment(xDaysAfterOnBoarding).startOf("day").format("MMMM DD, YYYY"),
      caseNumber: caseData?.case_number,
      caseTitle: getFullCaseName(
        caseData?.case_name,
        caseData?.additional_case_names
      ),
      // paymentURL: paymentInfo?.payment_url,

      paymentURL:
        partyData?.payment?.invoice_id === null
          ? partyData?.payment?.payment_url
          : generateInvoiceUrlFrontend(
              partyData?.payment?.invoice_id,
              caseData?.mediator_id?.user_id
            ),
      mediatorEmail: caseData?.mediator_id?.email,
    };

    await sendPaymentsReminders(
      { ...baseEmailData, email: partyData?.email, case_id: caseData?.id },
      reminderArr
    );

    const alternateEmails = partyData?.alternate_emails || [];

    console.log(
      "Case ID ->",
      caseData?.id,
      "Client Email ->",
      partyData?.email,
      "->  alternateEmails",
      alternateEmails
    );

    if (Array.isArray(alternateEmails) && alternateEmails.length > 0) {
      for (const alternateEmail of alternateEmails) {
        await sendPaymentsReminders({
          ...baseEmailData,
          email: alternateEmail,
          case_id: caseData?.id,
        });
      }
    }

    if (
      caseData?.mediator_id?.email_cc &&
      Array.isArray(caseData?.mediator_id?.email_cc)
    ) {
      for (const ccEmail of caseData?.mediator_id?.email_cc) {
        await sendPaymentsReminders({
          ...baseEmailData,
          email: ccEmail,
          case_id: caseData?.id,
        });
      }
    }

    console.log("Payment reminder emails sent successfully.");
  } catch (error) {
    console.log("Error While sending Payment Reminders", error?.message);
  }
};

const getAllRecordOfParty = (
  caseData,
  partyType,
  is_additional_party = false,
  additional_party_id = null
) => {
  const primaryData = caseData[partyType];
  const additionalData = is_additional_party
    ? primaryData?.additionalParties
    : [];

  if (
    additionalData.length > 0 &&
    is_additional_party === true &&
    additional_party_id
  ) {
    return additionalData?.find((x) => x.id === additional_party_id) || null;
  }

  delete primaryData?.additionalParties;
  return primaryData;
};

async function sendReminders(forClient) {
  const today = moment().utc().startOf("day").format("YYYY-MM-DD");
  // const today = "2025-08-21";

  console.log("`payment-${forClient}`", `payment-${forClient}`);

  try {
    const mediators = await getMediator();
    for (const mediator of mediators) {
      const cases = await getMediatorCases(mediator?.user_id, today);
      // console.log(
      //   "Mediator Cases -> mnediator Name",
      //   mediator?.first_name,
      //   "-> case_id: ",
      //   cases?.map((x) => x.id)
      // );
      for (const caseData of cases) {
        const emailReminders = await fetchEmailRemainders(
          caseData.id,
          caseData.mediator_id?.user_id,
          today,
          `payment-${forClient}`,
          true
        );

        const emailPromises = [];
        const markReminderPromises = [];

        for (const emailReminder of emailReminders || []) {
          const totalReminders = countValidReminders(emailReminder?.reminders);
          const todaysReminders = Object.entries(emailReminder?.reminders || {})
            .filter(
              ([_, reminder]) =>
                reminder &&
                moment(reminder?.date).isSame(today, "day") &&
                !reminder?.is_sent
            )
            .map(([reminderType, reminder]) => ({ reminderType, reminder }));

          if (!todaysReminders.length) {
            console.log(
              `No unsent Payment Reminders for case ${caseData.id} , Date: ${today}`
            );
            continue;
          }

          const additionalParty = emailReminder.additional_party || null;

          const partyData = getAllRecordOfParty(
            caseData,
            forClient === "additional-party" ? additionalParty.role : forClient,
            additionalParty?.id ? true : false,
            additionalParty?.id
          );

          if (
            partyData?.payment.status === "paid" ||
            partyData?.payment.status === "paid_manually"
          ) {
            continue;
          } else {
            for (const { reminderType, reminder } of todaysReminders) {
              try {
                const nextReminderDate = getNextValidReminder(
                  emailReminder?.reminders || {},
                  reminderType || null
                )?.date;
                emailPromises.push(() =>
                  sendPaymentEmail(caseData, partyData, [
                    {
                      [`${getPrimaryAccessorByRole(partyData.role)}`]:
                        forClient !== "additional-party"
                          ? partyData.client_id
                          : partyData.primary_party_id,
                      additional_client_id:
                        forClient === "additional-party"
                          ? partyData.client_id
                          : null,
                      case_id: caseData.id,
                      type: "payment",
                      mediator: caseData?.mediator_id?.mediator_id,
                      event: `Payment Reminder ${convertCountingWordToDigit(
                        reminderType
                      )}/${totalReminders}`,
                      amount:
                        partyData?.payment?.grand_total &&
                        partyData?.payment?.grand_total > 0
                          ? partyData?.payment?.grand_total
                          : partyData?.payment?.amount,
                      next_reminder:
                        nextReminderDate !== null &&
                        nextReminderDate !== undefined
                          ? moment(nextReminderDate).format("MMMM D,YYYY")
                          : null,
                      // created_at: "2025-08-21 18:01:24.099244+00",
                    },
                  ])
                );
                markReminderPromises.push(() =>
                  markReminderAsSent(
                    emailReminder.id,
                    reminderType,
                    `payment-${forClient}`
                  )
                );
              } catch (error) {
                console.error(
                  `Error processing Payment Reminder ${reminderType} for case ${caseData.id}:`,
                  error
                );
              }
            }
          }
        }

        // await Promise.all(emailPromises.map((fn) => fn()));
        for (const fn of emailPromises) {
          try {
            await fn();
            await delay(500);
          } catch (err) {
            console.error("Error sending one email:", err);
          }
        }

        await Promise.all(markReminderPromises.map((fn) => fn()));

        console.log(
          `Payment Reminders of ${`payment-${forClient}`} -> case_id (${
            caseData.id
          }) have been processed. Date: ${today}`
        );
      }
    }
  } catch (err) {
    console.log(
      `Error While Sending Payment Reminder For ${`payment-${forClient}`}: Date: ${today}`,
      err
    );
  }
}

async function defendentReminders() {
  const param1 = "defendant";
  sendReminders(param1);
}

async function plaintiffReminders() {
  const param1 = "plaintiff";
  sendReminders(param1);
}

async function additionalPartyPaymentReminders() {
  const param1 = "additional-party";
  sendReminders(param1);
}

// plaintiffReminders();
// defendentReminders();

module.exports = {
  sendReminders,
  defendentReminders,
  plaintiffReminders,
  additionalPartyPaymentReminders,
};
