const axios = require("axios");
const supabase = require("../config/supabaseClient");
const {
  LOOPS_EMAIL_TRANSACTIONAL_IDS,
  CUSTOM_MEDIATORS_EMAILS,
} = require("../constants/emailConstant");
const {
  ADDITIONAL_PARTICIPANTS_TABLE,
  PARTICIPANTS_TABLE,
} = require("../constants/supabase.constant");

const url = "https://app.loops.so/api/v1/transactional";

const headers = {
  Authorization: "Bearer cdbf87f9912af8a5aac2bc5b88b8afbe",
  // Authorization: "Bearer ",
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
  type = "onBoarding",
  isArrayResponse = false
) {
  try {
    let query = supabase
      .from("email_reminders")
      .select("*,additional_party:additional_party_id(*,client:client_id(*))")
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

    let reminders, queryError;

    if (type === "payment-additional-party" || isArrayResponse) {
      const { data, error } = await query;

      reminders = data;
      queryError = error;
    } else {
      const { data, error } = await query.single();

      reminders = data;
      queryError = error;
    }

    if (queryError) return null;

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

async function findCasesByMediatorId(mediator_id, columns = "*", filters = []) {
  try {
    let query = supabase
      .from("cases")
      .select(columns)
      .eq("mediator_id", mediator_id);

    filters.forEach((filter) => {
      if (filter?.type === "gte") {
        query = query.gte(filter.column, filter.value);
      } else if (filter?.type === "neq") {
        query = query.neq(filter.column, filter.value);
      } else {
        query = query.eq(filter.column, filter.value);
      }
    });
    const { data, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    return data;
  } catch (err) {
    console.error("Error fetching case:", err);
    return { error: err.message || "Error fetching case" };
  }
}

async function getParticipants(case_id, client_id) {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("client_id", client_id)
    .eq("case_id", case_id);
  if (error) return [];
  return data;
}

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

async function sendOnboardingEmailReminder(payload, emailLog = null) {
  const {
    email,
    name,
    mediatorName,
    caseTitle,
    caseNumber,
    dateAndTime,
    onboardingURL,
    mediatorEmail,
    case_id,
    briefDueDate, // unused currently
  } = payload;

  try {
    const caseData = await findCaseById(case_id, "*,mediator:mediator_id(*)");
    const customMediator =
      CUSTOM_MEDIATORS_EMAILS?.[caseData?.mediator?.user_id];

    const { payload: emailPayload, transcationId } =
      customMediator?.email &&
      customMediator?.ONBOARDING_REMINDER_TO_PARTY &&
      typeof customMediator?.ONBOARDING_REMINDER_TO_PARTY === "function"
        ? customMediator.ONBOARDING_REMINDER_TO_PARTY({
            name,
            mediatorName,
            caseTitle,
            caseNumber: caseNumber || "N/A",
            dateAndTime,
            onboardingURL,
            mediatorEmail,
          })
        : {
            payload: {
              name,
              caseTitle,
              dateAndTime,
              onboardingURL,
              mediatorName,
              mediatorEmail,
              ...(!caseData?.mediator?.is_odr_mediator && {
                caseNumber: caseNumber || "N/A",
                zoomLink: caseData?.zoom_link || "N/A",
              }),
            },
            transcationId: caseData?.mediator?.is_odr_mediator
              ? LOOPS_EMAIL_TRANSACTIONAL_IDS.ONBOARDING_REMINDER_FOR_ODR_MEDIATOR
              : LOOPS_EMAIL_TRANSACTIONAL_IDS.ONBOARDING_REMINDER_FOR_MEDIATOR,
          };

    const data = {
      transactionalId: transcationId,
      email,
      dataVariables: emailPayload,
    };

    const response = await axios.post(url, data, { headers });
    console.log("✅ Onboarding reminder email sent:", response.data);

    if (emailLog) {
      const { error } = await supabase.from("email_logs").insert([emailLog]);
      if (error) {
        console.error(
          `⚠️ Failed to insert email log for case_id: ${case_id}`,
          error
        );
      } else {
        console.log(`✅ Email log inserted for case_id: ${case_id}`);
      }
    }

    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      "❌ Error sending onboarding reminder:",
      err.response?.data || err.message
    );
    return { success: false, error: err.response?.data || err.message };
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
        caseNumber: caseNumber || "N/A",
        zoomLink: caseData?.zoom_link || "N/A",
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

    zoomLink,
    isOdrMediator = false,
  } = payload;

  try {
    const customMediator = CUSTOM_MEDIATORS_EMAILS?.[mediatorUserId];

    const { payload: emailPayload, transcationId } =
      customMediator?.email &&
      customMediator?.BRIEF_REMINDER_TO_PARTY &&
      typeof customMediator?.BRIEF_REMINDER_TO_PARTY === "function"
        ? customMediator.BRIEF_REMINDER_TO_PARTY({
            name,
            mediatorName,
            caseTitle,
            caseNumber: caseNumber || "N/A",
            dateAndTime,
            mediatorEmail,
            onboardingURL,
          })
        : {
            payload: {
              name,
              dateAndTime,
              caseTitle,
              onboardingURL,
              mediatorName,
              mediatorEmail,
              ...(!isOdrMediator && {
                caseNumber: caseNumber || "N/A",
                zoomLink: zoomLink || "N/A",
              }),
            },
            transcationId:
              LOOPS_EMAIL_TRANSACTIONAL_IDS.BRIEF_REMINDER_NON_ODR_MEDIATOR,
          };

    const data = {
      transactionalId: transcationId,
      email,
      dataVariables: emailPayload,
    };

    const response = await axios.post(url, data, { headers });
    console.log("✅ Brief reminder email sent:", response.data);

    if (emailLog) {
      const { error } = await supabase.from("email_logs").insert([emailLog]);
      if (error) {
        console.error("⚠️ Failed to insert email log:", error);
      } else {
        console.log("✅ Email log inserted successfully.");
      }
    }

    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      "❌ Error sending brief reminder:",
      err.response?.data || err.message
    );
    return { success: false, error: err.response?.data || err.message };
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
    dueDate,
    caseNumber,
  } = payload;

  try {
    const caseData = await findCaseById(case_id, "*,mediator:mediator_id(*)");
    const customMediator =
      CUSTOM_MEDIATORS_EMAILS?.[caseData?.mediator?.user_id];

    const { payload: emailPayload, transcationId } =
      customMediator?.email &&
      customMediator?.HOURLY_PAYMENT_REMINDER_TO_PARTY &&
      typeof customMediator?.HOURLY_PAYMENT_REMINDER_TO_PARTY === "function"
        ? customMediator.HOURLY_PAYMENT_REMINDER_TO_PARTY({
            name,
            mediatorName,
            totalDue,
            paymentURL,
            mediatorEmail,
            caseTitle,
            mediationDateAndTime: mediationDateAndTime,
            dueDate,
            caseNumber,
          })
        : {
            payload: {
              name,
              mediatorName,
              totalDue,
              paymentURL: paymentURL || " ",
              mediatorEmail,
              caseTitle,
              dateAndTime: mediationDateAndTime,
              zoomLink: caseData?.zoom_link || "N/A",
              // dueDate: dueDate || "",
              // caseNumber: caseNumber || "",
            },
            transcationId:
              LOOPS_EMAIL_TRANSACTIONAL_IDS.HOURLY_INVOICE_REMINDER_TO_PARTY,
          };

    const data = {
      transactionalId: transcationId,
      email,
      dataVariables: emailPayload,
    };

    const response = await axios.post(url, data, { headers });
    console.log("✅ Reminder email sent successfully:", response.data);

    if (Array.isArray(reminderArr) && reminderArr.length > 0) {
      const insertionPromises = reminderArr.map(async (emailLog) => {
        const { error } = await supabase.from("email_logs").insert([emailLog]);
        if (error) {
          console.error(
            `⚠️ Failed to insert email log: ${JSON.stringify(emailLog)}`,
            error
          );
        } else {
          console.log(`✅ Email log inserted for case_id: ${emailLog.case_id}`);
        }
      });

      await Promise.all(insertionPromises);
    }

    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      "❌ Error sending payment reminder:",
      err.response?.data || err.message
    );
    return { success: false, error: err.response?.data || err.message };
  }
}

async function sendZoomEmailReminder(payload, emailLog = null) {
  const {
    email,
    name,
    mediatorName,
    dateAndTime,
    zoomURL,
    caseTitle,
    caseNumber,
    mediatorEmail,
    is_odr_mediator,
    calenderBlob,
    case_id,
  } = payload;

  try {
    const caseData = await findCaseById(case_id, "*,mediator:mediator_id(*)");

    const customMediator =
      CUSTOM_MEDIATORS_EMAILS?.[caseData?.mediator?.user_id];

    const { payload: emailPayload, transcationId } =
      customMediator?.email &&
      customMediator?.ZOOM_LINK_REMINDER_TO_PARTY &&
      typeof customMediator?.ZOOM_LINK_REMINDER_TO_PARTY === "function"
        ? customMediator.ZOOM_LINK_REMINDER_TO_PARTY({
            name,
            caseTitle,
            dateAndTime,
            zoomURL,
            mediatorName,
            mediatorEmail,
            caseNumber,
          })
        : {
            payload: {
              name,
              caseTitle,
              dateAndTime,
              zoomURL,
              mediatorName,
              mediatorEmail,
              ...(!is_odr_mediator && { caseNumber: caseNumber || "N/A" }),
            },
            transcationId: is_odr_mediator
              ? LOOPS_EMAIL_TRANSACTIONAL_IDS.ZOOM_REMINDER_FOR_PARTIES_ODR_MEDIATOR
              : LOOPS_EMAIL_TRANSACTIONAL_IDS.ZOOM_REMINDER_FOR_PARTIES_MEDIATOR,
          };

    const data = {
      transactionalId: transcationId,
      email,
      dataVariables: emailPayload,
      attachments: [
        {
          filename: "zoom-invite.ics",
          contentType: "text/calendar; method=REQUEST; charset=UTF-8",
          data: Buffer.from(calenderBlob, "utf8").toString("base64"),
        },
      ],
    };

    const response = await axios.post(url, data, { headers });
    console.log("✅ Zoom reminder email sent:", response.data);

    if (emailLog) {
      const { error } = await supabase.from("email_logs").insert([emailLog]);
      if (error) {
        console.error("⚠️ Failed to insert email log:", error);
      } else {
        console.log("✅ Email log inserted successfully.");
      }
    }

    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      "❌ Error sending Zoom reminder:",
      err.response?.data || err.message
    );
    return { success: false, error: err.response?.data || err.message };
  }
}

async function sendZoomEmailReminderForMediators(payload) {
  const {
    email,
    mediatorName,
    dateAndTime,
    zoomURL,
    caseTitle,
    caseNumber,
    is_odr_mediator,
    calenderBlob,
  } = payload;

  const data = {
    transactionalId: is_odr_mediator
      ? LOOPS_EMAIL_TRANSACTIONAL_IDS.ZOOM_REMINDER_FOR_ODR_MEDIATOR
      : LOOPS_EMAIL_TRANSACTIONAL_IDS.ZOOM_REMINDER_FOR_NON_ODR_MEDIATOR,
    email,
    dataVariables: {
      email,
      caseTitle,
      dateAndTime,
      zoomURL,
      mediatorName,
      ...(!is_odr_mediator && {
        caseNumber: caseNumber || "N/A",
      }),
    },
    attachments: [
      {
        filename: "zoom-invite.ics",
        contentType: "text/calendar",
        data: calenderBlob,
      },
    ],
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function findParticipants(caseId, selectQuery = "*") {
  try {
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select(selectQuery)
      .eq("case_id", caseId);

    if (error) throw error;

    return data;
  } catch (err) {
    console.error("Error fetching participants:", err);
    throw err;
  }
}

async function findAdditionalParticipants(caseId, selectQuery = "*") {
  try {
    const { data, error } = await supabase
      .from(ADDITIONAL_PARTICIPANTS_TABLE)
      .select(selectQuery)
      .eq("case_id", caseId);

    if (error) throw error;

    return data;
  } catch (err) {
    console.error("Error fetching additional participants:", err);
    throw err;
  }
}

module.exports = {
  loopsHeader: headers,
  loopsUrl: url,
  getLatestLog,
  sendOnboardingEmailReminder,
  markReminderAsSent,
  fetchEmailRemainders,
  sendPaymentsReminders,
  sendBriefEmailReminder,
  sendKeyDocumentEmailReminder,
  sendHourlyInvoiceReminder,
  markHourlyInvoiceReminderAsSent,
  sendZoomEmailReminder,
  sendZoomEmailReminderForMediators,
  getParticipants,
  findCaseById,
  findAdditionalParticipants,
  findParticipants,
  findCasesByMediatorId,
};
