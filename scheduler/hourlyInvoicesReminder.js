const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  sendHourlyInvoiceReminder,
  markHourlyInvoiceReminderAsSent,
} = require("../services/supabaseController");
const {
  formatAmount,
  convertToAMPM,
  generateInvoiceUrlFrontend,
  convertCentsToDollars,
  convertToTimezone,
  getFullCaseName,
} = require("../utils/functions");
const {
  countValidReminders,
  convertCountingWordToDigit,
  getNextValidReminder,
} = require("../utils/functions");

async function getHourlyInvoicesReminders() {
  const { data, error } = await supabase
    .from("hourly_invoices_reminders")
    .select(
      `*,
      invoice:hourly_invoice_id!inner(*,
      mediator:mediator_id(first_name,last_name,email,user_id,mediator_id,email_cc,timezone),
      client:client_id(name,email,client_id),
      case:case_id(id,case_schedule_time,mediation_date,case_number,case_name,additional_case_names,plaintiff_id,defender_id))`
    )
    .neq("hourly_invoice_id.status", "paid")
    .neq("hourly_invoice_id.status", "paid_manually");
  // .in("hourly_invoice_id", [699, 700]);

  if (error) {
    return [];
  }

  return data;
}

const sendPaymentEmail = async (invoice, reminderObj = null) => {
  try {
    const clientData = invoice.client;
    const mediatorData = invoice.mediator;
    const caseData = invoice.case;

    // const invoiceCreateDateTz = convertToTimezone(
    //   invoice.created_at,
    //   mediatorData.timezone
    // );

    // const remainingDueDays = Math.ceil(
    //   invoiceCreateDateTz.diff(invoice.due_date || 0, "days", true)
    // );

    const baseEmailData = {
      name: clientData?.name,
      caseTitle: getFullCaseName(
        caseData?.case_name,
        caseData?.additional_case_names
      ),
      mediatorName: `${mediatorData?.first_name} ${mediatorData?.last_name}`,
      mediatorEmail: mediatorData?.email,
      mediationDateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      totalDue: formatAmount(convertCentsToDollars(invoice?.amount)),
      // dueDate:
      //   remainingDueDays <= 0
      //     ? moment(invoice.created_at).startOf("day").format("MMMM DD, YYYY")
      //     : moment(invoice.due_date).startOf("day").format("MMMM DD, YYYY"),
      paymentURL:
        !invoice?.hasOwnProperty("invoice_id") || invoice?.invoice_id === null
          ? invoice?.payment_url
          : generateInvoiceUrlFrontend(
              invoice?.invoice_id,
              mediatorData?.user_id
            ),
      // caseNumber: caseData?.case_number,
    };
    await sendHourlyInvoiceReminder(
      { ...baseEmailData, email: clientData?.email, case_id: caseData?.id },
      reminderObj
    );

    if (mediatorData?.email_cc && Array.isArray(mediatorData?.email_cc)) {
      for (const ccEmail of mediatorData?.email_cc) {
        await sendHourlyInvoiceReminder({
          ...baseEmailData,
          email: ccEmail,
          case_id: caseData?.id,
        });
      }
    }

    console.log("Hourly Invoice reminder emails sent successfully.");
  } catch (error) {
    console.log(
      "Error While sending Hourly Invoice Reminder: ",
      error?.message
    );
  }
};

async function hourlyInvoicesReminder() {
  const today = moment().utc().startOf("day").format("YYYY-MM-DD");
  // const today = moment("2025-06-23").startOf("day").format("YYYY-MM-DD");

  try {
    const invoicesReminders = await getHourlyInvoicesReminders();

    for (const invoiceReminder of invoicesReminders) {
      const totalReminders = countValidReminders(invoiceReminder?.reminders);
      const todaysReminders = Object.entries(invoiceReminder?.reminders || {})
        .filter(
          ([_, reminder]) =>
            reminder &&
            moment(reminder?.date).isSame(today, "day") &&
            !reminder?.is_sent
        )
        .map(([reminderType, reminder]) => ({ reminderType, reminder }));
      if (!todaysReminders.length) {
        console.log(
          `No unsent Hourly Invoice Reminders for ID -> ${invoiceReminder.id} , Date: ${today}`
        );
        continue;
      }

      const emailPromises = [];
      const markReminderPromises = [];

      for (const { reminderType, reminder } of todaysReminders) {
        try {
          const nextReminderDate = getNextValidReminder(
            invoiceReminder?.reminders || {},
            reminderType || null
          )?.date;

          const isDefendant =
            invoiceReminder.invoice.client_id !==
            invoiceReminder.invoice.case.plaintiff_id;

          emailPromises.push(() =>
            sendPaymentEmail(invoiceReminder.invoice, [
              {
                [isDefendant ? "defender_id" : "plaintiff_id"]: isDefendant
                  ? invoiceReminder.invoice.case.defender_id
                  : invoiceReminder.invoice.case.plaintiff_id,
                mediator: invoiceReminder.invoice.mediator.mediator_id,
                case_id: invoiceReminder.invoice.case.id,
                type: "hourly-invoice",
                event: `Hourly Invoice Reminder ${convertCountingWordToDigit(
                  reminderType
                )}/${totalReminders}`,
                amount: convertCentsToDollars(invoiceReminder.invoice.amount),
                next_reminder:
                  nextReminderDate !== null && nextReminderDate !== undefined
                    ? moment(nextReminderDate).format("MMMM D,YYYY")
                    : null,
              },
            ])
          );
          markReminderPromises.push(() =>
            markHourlyInvoiceReminderAsSent(
              invoiceReminder.id,
              reminderType,
              `hourly-invoice`
            )
          );
        } catch (error) {
          console.error(
            `Error processing Payment Reminder ${reminderType} for case ${caseData.id}:`,
            error
          );
        }
      }

      await Promise.all(emailPromises.map((fn) => fn()));
      await Promise.all(markReminderPromises.map((fn) => fn()));

      console.log(
        `Hourly Invoice Reminders for case ${invoiceReminder.invoice.case.id} have been processed. Date: ${today}`
      );
    }
  } catch (err) {
    // console.log("err", err);
    console.log(
      `Error While Sending Hourly Invoice Reminder: Date: ${today}`,
      err
    );
  }
}

module.exports = {
  hourlyInvoicesReminder,
};
