const axios = require("axios");
const supabase = require("../config/supabaseClient");
const {
  LOOPS_EMAIL_TRANSACTIONAL_IDS,
  CUSTOM_MEDIATORS_EMAILS,
} = require("../constants/emailConstant");

const url = "https://app.loops.so/api/v1/transactional";

const headers = {
  Authorization: "Bearer cdbf87f9912af8a5aac2bc5b88b8afbe",
  "Content-Type": "application/json",
};

// async function fetchHourlyInvoicesEmailRemainders(
//   reminder_id,
//   date = null,
//   type = "onBoarding"
// ) {
//   try {
//     let query = supabase
//       .from("hourly_invoices_reminders")
//       .select("*")
//       .eq("case_id", case_id)
//       .eq("mediator_id", mediator_id);

//     if (type !== null) {
//       query.eq("type", type);
//     }

//     if (date) {
//       query = query.or(
//         `reminders->first->>date.eq.${date},reminders->second->>date.eq.${date},reminders->third->>date.eq.${date},reminders->fourth->>date.eq.${date}`
//       );
//     }

//     const { data: reminders, error } = await query.single();

//     if (error) return null;

//     return reminders;
//   } catch (err) {
//     return err;
//   }
// }

async function fetchEmailRemainders(
  case_id,
  mediator_id,
  date = null,
  type = "onBoarding"
) {
  try {
    let query = supabase
      .from("email_reminders")
      .select("*")
      .eq("case_id", case_id)
      .eq("mediator_id", mediator_id);

    if (type !== null) {
      query.eq("type", type);
    }

    if (date) {
      query = query.or(
        `reminders->first->>date.eq.${date},reminders->second->>date.eq.${date},reminders->third->>date.eq.${date},reminders->fourth->>date.eq.${date}`
      );
    }

    const { data: reminders, error } = await query.single();

    if (error) return null;

    return reminders;
  } catch (err) {
    return err;
  }
}

async function markReminderAsSent(reminderId, reminderType, emailType) {
  try {
    const { data: reminderData, error: fetchError } = await supabase
      .from("email_reminders")
      .select("reminders")
      .eq("id", reminderId)
      .eq("type", emailType)
      .single();

    if (fetchError || !reminderData) {
      throw new Error(fetchError?.message || "Reminder not found");
    }

    const updatedReminders = { ...reminderData.reminders };
    if (updatedReminders?.[reminderType]?.is_sent !== undefined) {
      updatedReminders[reminderType].is_sent = true;
    } else {
      throw new Error(`Invalid reminder type: ${reminderType}`);
    }

    const { error: updateError } = await supabase
      .from("email_reminders")
      .update({ reminders: updatedReminders })
      .eq("id", reminderId)
      .eq("type", emailType);

    if (updateError) throw updateError;

    return { success: true, message: `${reminderType} marked as sent` };
  } catch (err) {
    return err;
  }
}

async function markHourlyInvoiceReminderAsSent(
  reminderId,
  reminderType,
  emailType
) {
  try {
    const { data: reminderData, error: fetchError } = await supabase
      .from("hourly_invoices_reminders")
      .select("reminders")
      .eq("id", reminderId)
      .eq("type", emailType)
      .single();

    if (fetchError || !reminderData) {
      throw new Error(fetchError?.message || "Hourly Reminder not found");
    }

    const updatedReminders = { ...reminderData.reminders };
    if (updatedReminders?.[reminderType]?.is_sent !== undefined) {
      updatedReminders[reminderType].is_sent = true;
    } else {
      throw new Error(`Invalid hourly reminder type: ${reminderType}`);
    }

    const { error: updateError } = await supabase
      .from("hourly_invoices_reminders")
      .update({ reminders: updatedReminders })
      .eq("id", reminderId)
      .eq("type", emailType);

    if (updateError) throw updateError;

    return { success: true, message: `${reminderType} marked as sent` };
  } catch (err) {
    return err;
  }
}

async function findCaseById(case_id, columns = "*", filters = []) {
  try {
    // Base query
    let query = supabase.from("cases").select(columns).eq("id", case_id);

    // Add dynamic filters (eq conditions)
    filters.forEach((filter) => {
      query = query.eq(filter.column, filter.value);
    });

    const { data: caseObj, error: fetchError } = await query.single();

    if (fetchError) throw fetchError;

    return caseObj;
  } catch (err) {
    console.error("Error fetching case:", err);
    return { error: err.message || "Error fetching case" };
  }
}

async function sendOnboardingEmailReminder(payload, emailLog = null) {
  const {
    email,
    name,
    mediatorName,
    onboardingURL,
    dateAndTime,
    caseNumber,
    caseTitle,
    mediatorEmail,
    case_id,

    briefDueDate,
  } = payload;

  const caseData = await findCaseById(case_id, "*,mediator:mediator_id(*)");

  const data = {
    transactionalId: caseData?.mediator?.is_odr_mediator
      ? LOOPS_EMAIL_TRANSACTIONAL_IDS.ONBOARDING_REMINDER_FOR_ODR_MEDIATOR
      : LOOPS_EMAIL_TRANSACTIONAL_IDS.ONBOARDING_REMINDER_FOR_MEDIATOR,
    email,
    dataVariables: {
      name,
      email,
      caseTitle,
      dateAndTime,
      onboardingURL,
      mediatorName,
      mediatorEmail,
      ...(!caseData?.mediator?.is_odr_mediator && {
        caseNumber: caseNumber || " ",
      }),
    },
  };

  try {
    const response = await axios.post(url, data, { headers });
    // console.log(response, "response from loops api");
    if (response.status === 200) {
      console.log("Case ID: ", case_id, " -> emailLog", emailLog);
      if (emailLog !== null) {
        const { error } = await supabase.from("email_logs").insert([emailLog]);

        console.log("Case ID: ", case_id, " -> emailLog | error", error);
      }
    }
    // Loops API might respond with 200 and `success: false`
    if (response.status !== 200) {
      console.error(
        "Case ID: ",
        case_id,
        " -> Loops API error response:",
        response.data
      );
      throw new Error(
        `Loops API error: ${JSON.stringify(response.data.error)}`
      );
    }
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// async function sendOnboardingEmailReminder(payload, emailLog = null) {
//     try {
//       // Simulate a failure (e.g., API failure)
//       throw new Error("Simulated API failure");

//       // Normal functionality...
//     } catch (error) {
//       console.log("Error in sendOnboardingEmailReminder:", error);
//       throw error; // This will cause BullMQ to fail the job
//     }
//   }

async function getLatestLog({ case_id, plaintiff_id, defender_id, type }) {
  try {
    if (!case_id && (!plaintiff_id || !defender_id)) {
      throw new Error(
        "At least one filter parameter is required (case_id, plaintiff_id, defender_id)."
      );
    }

    let query = supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (case_id) {
      query = query.eq("case_id", case_id);
    }
    if (plaintiff_id) {
      query = query.eq("plaintiff_id", plaintiff_id);
    }
    if (defender_id) {
      query = query.eq("defender_id", defender_id);
    }
    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (err) {
    console.error("Error fetching latest log:", err.message);
    throw err;
  }
}

async function sendPaymentsReminders(payload, reminderArr = null) {
  const {
    email,
    name,
    mediatorName,
    totalDue,
    dueDate,
    paymentURL,
    mediatorEmail,
    caseTitle,
    caseNumber,
    mediationDateAndTime,
    case_id,
  } = payload;

  const caseData = await findCaseById(case_id, "*,mediator:mediator_id(*)");

  const data = {
    transactionalId: caseData?.mediator?.is_odr_mediator
      ? LOOPS_EMAIL_TRANSACTIONAL_IDS.PAYMENT_INVOICE_REMINDER_FOR_ODR_MEDIATOR
      : LOOPS_EMAIL_TRANSACTIONAL_IDS.PAYMENT_INVOICE_REMINDER_FOR_MEDIATOR,

    email,
    dataVariables: {
      name,
      totalDue,
      dueDate,
      paymentURL: paymentURL ? paymentURL : " ",
      mediatorName,
      mediatorEmail,
      caseTitle,
      mediationDateAndTime,
      ...(!caseData?.mediator?.is_odr_mediator && {
        caseNumber: caseNumber || " ",
      }),
    },
  };
  try {
    const response = await axios.post(url, data, { headers });
    if (response) {
      // console.log("reminderArr", reminderArr);
      // console.log(
      //   "reminderArr !== null && Array.isArray(reminderArr)",
      //   reminderArr !== null && Array.isArray(reminderArr)
      // );
      if (reminderArr !== null && Array.isArray(reminderArr)) {
        const insertionPromises = reminderArr.map(async (emailLog) => {
          const filterCriteria = {
            case_id: emailLog.case_id,
            type: emailLog.type,
          };
          if (emailLog.plaintiff_id?.client_id) {
            filterCriteria.plaintiff_id = emailLog.plaintiff_id?.client_id;
          }
          if (emailLog.defender_id?.client_id) {
            filterCriteria.defender_id = emailLog.defender_id?.client_id;
          }

          // const existingLog = await getLatestLog(filterCriteria);
          // console.log("existingLog", existingLog);
          // if (existingLog) {
          //   console.log(
          //     `Skipping email log for case_id: ${emailLog.case_id}, type: ${emailLog.type}, as it already exists.`
          //   );
          //   return;
          // }
          // Insert the email log if it doesn't already exist

          // console.log("emailLog", emailLog);
          const { data, error } = await supabase
            .from("email_logs")
            .insert([emailLog]);

          if (error) {
            console.error(
              `Error inserting email log: ${JSON.stringify(emailLog)}`,
              error
            );
          } else {
            console.log(
              `Successfully inserted email log: ${JSON.stringify(data)}`
            );
          }
        });
        await Promise.all(insertionPromises);
      }
    }
    return response;
  } catch (error) {
    console.error("error:sendPaymentsReminders", error?.response?.data);
    throw error;
  }
}

async function sendBriefEmailReminder(payload, emailLog = null) {
  const {
    email,
    name,
    dateAndTime,
    caseTitle,
    caseNumber,
    onboardingURL,
    mediatorName,
    mediatorEmail,
    mediatorUserId,
  } = payload;

  const isCustomMediator = CUSTOM_MEDIATORS_EMAILS[mediatorUserId];

  const data = {
    transactionalId: isCustomMediator?.email
      ? isCustomMediator?.BRIEF_REMINDER({
          name,
          dateAndTime,
          caseTitle,
          caseNumber: caseNumber ? caseNumber : " ",
          onboardingURL,
          mediatorName,
          mediatorEmail,
        })?.transcationId
      : LOOPS_EMAIL_TRANSACTIONAL_IDS.BRIEF_FOR_ODR_MEDIATOR,
    email,
    dataVariables: {
      name,
      dateAndTime,
      caseTitle,
      caseNumber: caseNumber ? caseNumber : " ",
      onboardingURL,
      mediatorName,
      mediatorEmail,
    },
  };

  try {
    const response = await axios.post(url, data, { headers });
    if (data) {
      if (emailLog !== null) {
        await supabase.from("email_logs").insert([emailLog]);
      }
    }
    console.log("response:sendBriefEmailReminder", data);
    return response;
  } catch (error) {
    console.log("error:sendBriefEmailReminder", error?.response);
  }
}

async function sendKeyDocumentEmailReminder(payload, emailLog = null) {
  const {
    email,
    name,
    dateAndTime,
    caseTitle,
    onboardingURL,
    mediatorName,
    mediatorEmail,
    // caseNumber
  } = payload;

  const data = {
    transactionalId: "cm9799s5h022faa9c0krrx4vn",
    email,
    dataVariables: {
      name,
      dateAndTime,
      caseTitle,
      onboardingURL,
      mediatorName,
      mediatorEmail,
      // caseNumber: caseNumber ? caseNumber : " ",
    },
  };

  try {
    const response = await axios.post(url, data, { headers });
    if (data) {
      // console.log("emailLog", emailLog);
      if (emailLog !== null) {
        const { data, error } = await supabase
          .from("email_logs")
          .insert([emailLog]);
      }
    }
    console.log("response:sendKeyDocumentEmailReminder", data);
    return response;
  } catch (error) {
    console.log("error:sendKeyDocumentEmailReminder", error?.response);
  }
}

async function sendHourlyInvoiceReminder(payload, reminderArr = null) {
  const {
    email,
    name,
    mediatorName,
    totalDue,
    paymentURL,
    mediatorEmail,
    caseTitle,
    mediationDateAndTime,
    case_id,
    // dueDate,
    // caseNumber,
  } = payload;

  const caseData = await findCaseById(case_id, "*,mediator:mediator_id(*)");

  const data = {
    transactionalId: caseData?.mediator?.is_odr_mediator
      ? LOOPS_EMAIL_TRANSACTIONAL_IDS.HOURLY_INVOICE_REMINDER
      : LOOPS_EMAIL_TRANSACTIONAL_IDS.HOURLY_INVOICE_REMINDER,

    email,
    dataVariables: {
      name,
      totalDue,
      paymentURL: paymentURL ? paymentURL : " ",
      mediatorName,
      mediatorEmail,
      caseTitle,
      dateAndTime: mediationDateAndTime,
      // dueDate,
      // ...(!caseData?.mediator?.is_odr_mediator && {
      //   caseNumber: caseNumber || " ",
      // }),
    },
  };
  try {
    const response = await axios.post(url, data, { headers });
    if (response) {
      if (reminderArr !== null && Array.isArray(reminderArr)) {
        const insertionPromises = reminderArr.map(async (emailLog) => {
          const filterCriteria = {
            case_id: emailLog.case_id,
            type: emailLog.type,
          };
          if (emailLog.plaintiff_id?.client_id) {
            filterCriteria.plaintiff_id = emailLog.plaintiff_id?.client_id;
          }
          if (emailLog.defender_id?.client_id) {
            filterCriteria.defender_id = emailLog.defender_id?.client_id;
          }

          const { data, error } = await supabase
            .from("email_logs")
            .insert([emailLog]);

          if (error) {
            console.error(
              `Error inserting email log: ${JSON.stringify(emailLog)}`,
              error
            );
          } else {
            console.log(
              `Successfully inserted email log: ${JSON.stringify(data)}`
            );
          }
        });
        await Promise.all(insertionPromises);
      }
    }
    return response;
  } catch (error) {
    console.error("error:sendPaymentsReminders", error?.response?.data);
    throw error;
  }
}

module.exports = {
  getLatestLog,
  sendOnboardingEmailReminder,
  markReminderAsSent,
  fetchEmailRemainders,
  sendPaymentsReminders,
  sendBriefEmailReminder,
  sendKeyDocumentEmailReminder,
  sendHourlyInvoiceReminder,
  markHourlyInvoiceReminderAsSent,
};
