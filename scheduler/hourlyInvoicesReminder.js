const supabase = require("../config/supabaseClient");
const moment = require("moment");
const { sendPaymentsReminders } = require("../services/supabaseController");
const {
  formatAmount,
  convertToAMPM,
  generateInvoiceUrlFrontend,
  convertToTimezone,
  convertCentsToDollars,
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
      case:case_id(id,case_schedule_time,mediation_date,case_number,case_name))`
    )
    .neq("hourly_invoice_id.status", "paid")
    .neq("hourly_invoice_id.status", "paid_manually");
  // .eq("id", 960)

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

    console.log("invoice", invoice);
    // console.log("mediatorData", mediatorData);
    console.log("reminderObj", reminderObj);

    const invoiceCreateDateTz = convertToTimezone(
      invoice.created_at,
      mediatorData.timezone
    );
    // console.log("invoiceCreateDateTz", invoiceCreateDateTz.format());
    // console.log("invoice.due_date", invoice.due_date);
    const remainingDueDays = Math.ceil(
      invoiceCreateDateTz.diff(invoice.due_date || 0, "days", true)
    );
    // console.log("remainingDueDays", remainingDueDays);

    const baseEmailData = {
      name: clientData?.name,
      mediatorName: `${mediatorData?.first_name} ${mediatorData?.last_name}`,
      mediationDateAndTime: `${moment(caseData?.mediation_date).format(
        "MMMM DD, YYYY"
      )} at ${convertToAMPM(caseData?.case_schedule_time)}`,
      totalDue: formatAmount(convertCentsToDollars(invoice?.amount)),
      dueDate:
        remainingDueDays <= 0
          ? moment(invoice.created_at).startOf("day").format("MMMM DD, YYYY")
          : moment(invoice.due_date).startOf("day").format("MMMM DD, YYYY"),
      caseNumber: caseData?.case_number,
      caseTitle: caseData?.case_name,

      paymentURL:
        !invoice?.hasOwnProperty("invoice_id") || invoice?.invoice_id === null
          ? invoice?.payment_url
          : generateInvoiceUrlFrontend(
              invoice?.invoice_id,
              mediatorData?.user_id
            ),
      mediatorEmail: mediatorData?.email,
    };

    console.log("baseEmailData", baseEmailData);
    return;
    await sendPaymentsReminders(
      { ...baseEmailData, email: clientData?.email, case_id: caseData?.id },
      reminderObj
    );

    if (mediatorData?.email_cc && Array.isArray(mediatorData?.email_cc)) {
      for (const ccEmail of mediatorData?.email_cc) {
        await sendPaymentsReminders({
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
          `No unsent Hourly Invoice Reminders for case ${invoiceReminder.invoice.case.id} , Date: ${today}`
        );
        continue;
      }
      console.log("totalReminders", totalReminders);
      console.log("todaysReminders", todaysReminders);

      // return;
      // console.log("cases", cases?.[0]?.payments);
      // return;

      const emailPromises = [];
      const markReminderPromises = [];

      for (const { reminderType, reminder } of todaysReminders) {
        try {
          const nextReminderDate = getNextValidReminder(
            invoiceReminder?.reminders || {},
            reminderType || null
          )?.date;
          console.log("nextReminderDate", nextReminderDate);

          emailPromises.push(() =>
            sendPaymentEmail(invoiceReminder.invoice, {
              client_id: invoiceReminder.invoice.client_id,
              case_id: invoiceReminder.invoice.case.id,
              type: "hourly-invoice",
              event: `Hourly Invoice Reminder ${convertCountingWordToDigit(
                reminderType
              )}/${totalReminders}`,
              amount: invoiceReminder.invoice.amount,
              next_reminder:
                nextReminderDate !== null && nextReminderDate !== undefined
                  ? moment(nextReminderDate).format("MMMM D,YYYY")
                  : null,
            })
          );
          // markReminderPromises.push(() =>
          //   markReminderAsSent(
          //     emailReminders.id,
          //     reminderType,
          //     `payment-${forClient}`
          //   )
          // );
        } catch (error) {
          console.error(
            `Error processing Payment Reminder ${reminderType} for case ${caseData.id}:`,
            error
          );
        }
      }

      await Promise.all(emailPromises.map((fn) => fn()));
      // await Promise.all(markReminderPromises.map((fn) => fn()));

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
