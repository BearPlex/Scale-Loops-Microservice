const supabase = require("../config/supabaseClient");
const cron = require("node-cron");
const moment = require("moment");
const { sendPaymentsReminders } = require("../services/supabaseController");
const {
  formatAmount,
  convertToAMPM,
  generateInvoiceUrlFrontend,
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

async function getCases(forClient) {
  const today = moment().utc().startOf("day").format("YYYY-MM-DD");
  const { data, error } = await supabase
    .from("cases")
    .select(
      `*,
      onboarding(*),
      mediator:mediator_id(*),
      defender_id(*,onboarding(*),payments(*)),
      plaintiff_id(*,onboarding(*),payments(*)) `
    )
    .gt("mediation_date", today);

  if (error) {
    return [];
  }
  return data
    ? data.map((x) => ({
        ...x,
        payments: x[
          forClient === "defendant" ? "defender_id" : "plaintiff_id"
        ]?.payments?.filter((y) => y.case_id === x.id),
      }))
    : [];
}

const getClientInfo = async (clientId) => {
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", clientId)
    .single();
  return data;
};

const clients = {};

const sendPaymentEmail = async (
  caseData,
  paymentInfo,
  reminderArr = null,
  as
) => {
  try {
    if (clients[paymentInfo?.client_id]) {
    } else {
      const client = await getClientInfo(paymentInfo?.client_id);
      clients[client?.client_id] = client;
    }

    const clientData = clients[paymentInfo?.client_id];
    const mediationDate = moment(caseData?.mediation_date).startOf("day");

    const xDaysAfterOnBoarding = moment(
      caseData?.[as === "defender" ? "defender_id" : "plaintiff_id"]
        ?.onboarding?.[0]?.created_at
    )
      .add(caseData?.mediator?.payment_reminder_days, "day")
      .utc();

    const remainingDueDays =
      mediationDate.diff(xDaysAfterOnBoarding, "days") + 1;

    const baseEmailData = {
      name: clientData?.name,
      mediatorName: `${caseData?.mediator?.first_name} ${caseData?.mediator?.last_name}`,
      mediationDateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      totalDue: formatAmount(
        paymentInfo?.grand_total && paymentInfo?.grand_total > 0
          ? paymentInfo?.grand_total
          : paymentInfo?.amount
      ),
      dueDate:
        remainingDueDays <= 0
          ? moment(
              caseData?.[as === "defender" ? "defender_id" : "plaintiff_id"]
                ?.onboarding?.[0]?.created_at
            )
              .startOf("day")
              .format("MMMM DD, YYYY")
          : moment(xDaysAfterOnBoarding).startOf("day").format("MMMM DD, YYYY"),
      caseNumber: caseData?.case_number,
      caseTitle: caseData?.case_name,
      // paymentURL: paymentInfo?.payment_url,

      paymentURL:
        paymentInfo?.invoice_id === null
          ? paymentInfo?.payment_url
          : generateInvoiceUrlFrontend(
              paymentInfo?.invoice_id,
              caseData?.mediator?.user_id
            ),
      mediatorEmail: caseData?.mediator?.email,
    };

    await sendPaymentsReminders(
      { ...baseEmailData, email: clientData?.email, case_id: caseData?.id },
      reminderArr
    );

    if (
      caseData?.mediator?.email_cc &&
      Array.isArray(caseData?.mediator?.email_cc)
    ) {
      for (const ccEmail of caseData?.mediator?.email_cc) {
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

async function sendReminders(forClient) {
  const today = moment().utc().startOf("day").format("YYYY-MM-DD");
  // const today = moment().startOf("day").format("YYYY-MM-DD");

  try {
    const cases = await getCases(forClient);
    for (const caseData of cases) {
      const emailReminders = await fetchEmailRemainders(
        caseData.id,
        caseData.mediator_id,
        today,
        `payment-${forClient}`
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
          `No unsent Payment Reminders for case ${caseData.id} , Date: ${today}`
        );
        continue;
      }

      const emailPromises = [];
      const markReminderPromises = [];
      for (const payment of caseData?.payments || []) {
        if (payment.status === "paid" || payment.status === "paid_manually") {
          continue;
        } else {
          for (const { reminderType, reminder } of todaysReminders) {
            try {
              const nextReminderDate = getNextValidReminder(
                emailReminders?.reminders || {},
                reminderType || null
              )?.date;
              emailPromises.push(() =>
                sendPaymentEmail(
                  caseData,
                  payment,
                  [
                    {
                      [forClient === "defendant"
                        ? "defender_id"
                        : "plaintiff_id"]:
                        forClient === "defendant"
                          ? caseData.defender_id?.client_id
                          : caseData.plaintiff_id?.client_id,
                      case_id: caseData.id,
                      type: "payment",
                      mediator: caseData?.mediator?.mediator_id,
                      event: `Payment Reminder ${convertCountingWordToDigit(
                        reminderType
                      )}/${totalReminders}`,
                      amount:
                        payment?.grand_total && payment?.grand_total > 0
                          ? payment?.grand_total
                          : payment?.amount,
                      // created_at: moment(reminder?.date),
                      next_reminder:
                        nextReminderDate !== null &&
                        nextReminderDate !== undefined
                          ? moment(nextReminderDate).format("MMMM D,YYYY")
                          : null,
                    },
                  ],
                  forClient === "defendant" ? "defender" : "plaintiff"
                )
              );
              markReminderPromises.push(() =>
                markReminderAsSent(
                  emailReminders.id,
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

      await Promise.all(emailPromises.map((fn) => fn()));
      await Promise.all(markReminderPromises.map((fn) => fn()));

      console.log(
        `Payment Reminders of ${`payment-${forClient}`} for case ${
          caseData.id
        } have been processed. Date: ${today}`
      );
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

module.exports = {
  sendReminders,
  defendentReminders,
  plaintiffReminders,
};
