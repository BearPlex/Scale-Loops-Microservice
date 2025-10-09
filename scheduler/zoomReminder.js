const supabase = require("../config/supabaseClient");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const {
  convertToAMPM,
  generateICSFileForManual,
  getFullCaseName,
  getPrimaryAccessorByRole,
  delay,
} = require("../utils/functions");
const {
  sendZoomEmailReminder,
  sendZoomEmailReminderForMediators,
} = require("../services/supabaseController");
const {
  casePrimaryAndAdditionalPartiesData,
} = require("../utils/helpers/caseDetail.helper");
const { CASE_STATUS } = require("../constants/constant");

// Extend dayjs with UTC plugin
dayjs.extend(utc);

// Constants for better maintainability
const ZOOM_REMINDER_CONFIG = {
  DAYS_BEFORE_MEDIATION: 1,
  EMAIL_DELAY_MS: 500,
  LOG_PREFIX: "[ZOOM_REMINDER]",
};

/**
 * Fetch all mediators with their settings
 * @returns {Promise<Array>} Array of mediator objects
 */
async function getMediator() {
  try {
    const { data, error } = await supabase
      .from("mediators")
      .select("*,mediator_settings(*)");
    // .eq("email", "hiqbal@bearplex.com");

    if (error) {
      console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERROR] Failed to fetch mediators:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [WARNING] No mediators found`);
      return [];
    }

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] Fetched ${data.length} mediators`);
    return data;
  } catch (err) {
    console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [CRITICAL] Unexpected error in getMediator:`, {
      message: err.message,
      stack: err.stack,
    });
    return [];
  }
}

/**
 * Fetch cases scheduled for tomorrow with zoom links
 * @param {string} mediatorId - Mediator's user ID
 * @returns {Promise<Array>} Array of case objects
 */
async function getMediatorCases(mediatorId) {
  try {
    if (!mediatorId) {
      console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERROR] getMediatorCases called with invalid mediatorId`);
      return [];
    }

    const oneDayAfter = dayjs.utc().add(ZOOM_REMINDER_CONFIG.DAYS_BEFORE_MEDIATION, "day").format("YYYY-MM-DD");

    const filters = [
      { column: "mediation_date", value: oneDayAfter },
      { column: "zoom_id", value: null, type: "neq" },
      { column: "status", value: CASE_STATUS.cancelled, type: "neq" },
    ];

    const cases = await casePrimaryAndAdditionalPartiesData(
      null,
      mediatorId,
      filters
    );

    if (!cases || cases.length === 0) {
      console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [INFO] No cases found for mediator ${mediatorId} on ${oneDayAfter}`);
      return [];
    }

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] Found ${cases.length} case(s) for mediator ${mediatorId}`);
    return cases;
  } catch (err) {
    console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERROR] Failed to fetch cases for mediator ${mediatorId}:`, {
      message: err.message,
      stack: err.stack,
    });
    return [];
  }
}

/**
 * Validate required data before sending email
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} { isValid: boolean, missingFields: Array<string> }
 */
function validateEmailData(data, requiredFields) {
  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], data);
    return !value;
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Send zoom reminder email to mediator
 * @param {Object} mediator - Mediator object
 * @param {Object} caseData - Case data object
 * @param {string} icsCalendarData - ICS calendar file content
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function formatAndSendEmailForMediator(mediator, caseData, icsCalendarData) {
  const logContext = `Case ${caseData?.id} - Mediator ${mediator?.email}`;

  try {
    // Validate required data
    const validation = validateEmailData(mediator, ['email', 'first_name', 'last_name']);
    if (!validation.isValid) {
      throw new Error(`Missing required mediator fields: ${validation.missingFields.join(', ')}`);
    }

    const caseValidation = validateEmailData(caseData, ['mediation_date', 'zoom_link', 'case_schedule_time']);
    if (!caseValidation.isValid) {
      throw new Error(`Missing required case fields: ${caseValidation.missingFields.join(', ')}`);
    }

    const baseData = {
      mediatorName: `${mediator.first_name} ${mediator.last_name}`,
      dateAndTime: `${dayjs.utc(caseData.mediation_date).format("MMMM DD, YYYY")} at ${convertToAMPM(caseData.case_schedule_time)}`,
      zoomURL: caseData.zoom_link,
      caseTitle: getFullCaseName(caseData.case_name, caseData.additional_case_names),
      caseNumber: caseData.case_number || "N/A",
      is_odr_mediator: mediator.is_odr_mediator || false,
      calenderBlob: icsCalendarData,
      email: mediator.email,
    };

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SENDING] ${logContext}`);

    await sendZoomEmailReminderForMediators(baseData);

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] ${logContext} - Email sent successfully`);
    return { success: true };
  } catch (error) {
    console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [FAILED] ${logContext}:`, {
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send zoom reminder email to party/participant
 * @param {Object} mediator - Mediator object
 * @param {Object} caseData - Case data object
 * @param {Object} client - Client/party object
 * @param {string} icsCalendarData - ICS calendar file content
 * @param {Object|null} emailLog - Email log data for database tracking
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function formatAndSendEmail(mediator, caseData, client, icsCalendarData, emailLog = null) {
  const logContext = `Case ${caseData?.id} - Client ${client?.email}`;

  try {
    // Validate required data
    const validation = validateEmailData(client, ['email', 'name']);
    if (!validation.isValid) {
      throw new Error(`Missing required client fields: ${validation.missingFields.join(', ')}`);
    }

    const mediatorValidation = validateEmailData(mediator, ['first_name', 'last_name', 'email']);
    if (!mediatorValidation.isValid) {
      throw new Error(`Missing required mediator fields: ${mediatorValidation.missingFields.join(', ')}`);
    }

    const caseValidation = validateEmailData(caseData, ['mediation_date', 'zoom_link', 'case_schedule_time', 'id']);
    if (!caseValidation.isValid) {
      throw new Error(`Missing required case fields: ${caseValidation.missingFields.join(', ')}`);
    }

    const baseData = {
      name: client.name,
      mediatorName: `${mediator.first_name} ${mediator.last_name}`,
      dateAndTime: `${dayjs.utc(caseData.mediation_date).format("MMMM DD, YYYY")} at ${convertToAMPM(caseData.case_schedule_time)}`,
      zoomURL: caseData.zoom_link,
      caseTitle: getFullCaseName(caseData.case_name, caseData.additional_case_names),
      caseNumber: caseData.case_number || "N/A",
      is_odr_mediator: mediator.is_odr_mediator || false,
      calenderBlob: icsCalendarData,
      case_id: caseData.id,
      mediatorEmail: mediator.email,
    };

    // Find alternate emails from participants
    const alternateEmails = caseData?.participants?.find(
      (x) => x.client_id === client.client_id && x.email === client.email
    )?.alternate_emails || [];

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SENDING] ${logContext}`, {
      hasAlternateEmails: alternateEmails.length > 0,
      alternateCount: alternateEmails.length,
    });

    // Send primary email
    await sendZoomEmailReminder({ ...baseData, email: client.email }, emailLog);
    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] ${logContext} - Primary email sent`);

    // Send to alternate emails
    let alternateSuccessCount = 0;
    let alternateFailCount = 0;

    if (Array.isArray(alternateEmails) && alternateEmails.length > 0) {
      for (const alternateEmail of alternateEmails) {
        try {
          await sendZoomEmailReminder({ ...baseData, email: alternateEmail });
          alternateSuccessCount++;
          console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] ${logContext} - Alternate email sent to ${alternateEmail}`);
        } catch (altError) {
          alternateFailCount++;
          console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [FAILED] ${logContext} - Alternate email to ${alternateEmail}:`, altError.message);
        }
      }
    }

    // Send to CC emails
    let ccSuccessCount = 0;
    let ccFailCount = 0;

    if (mediator?.email_cc && Array.isArray(mediator.email_cc) && mediator.email_cc.length > 0) {
      for (const ccEmail of mediator.email_cc) {
        try {
          await sendZoomEmailReminder({ ...baseData, email: ccEmail });
          ccSuccessCount++;
          console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] ${logContext} - CC email sent to ${ccEmail}`);
        } catch (ccError) {
          ccFailCount++;
          console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [FAILED] ${logContext} - CC email to ${ccEmail}:`, ccError.message);
        }
      }
    }

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUMMARY] ${logContext}:`, {
      primary: 'sent',
      alternates: `${alternateSuccessCount}/${alternateEmails.length} sent`,
      cc: `${ccSuccessCount}/${mediator?.email_cc?.length || 0} sent`,
    });

    return { success: true };
  } catch (error) {
    console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [FAILED] ${logContext}:`, {
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Process and send emails for a party (plaintiff/defendant) and their additional parties
 * @param {Object} party - Party object (plaintiff or defendant)
 * @param {string} partyRoleKey - Role key for database logging ('plaintiff' or 'defender')
 * @param {Object} caseMediator - Mediator object for this case
 * @param {Object} caseData - Case data object
 * @param {string} icsData - ICS calendar file content
 * @returns {Array<Function>} Array of email sending functions
 */
function buildPartyEmailQueue(party, partyRoleKey, caseMediator, caseData, icsData) {
  const emailQueue = [];
  const logPrefix = `${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [buildPartyEmailQueue]`;

  try {
    if (!party?.client_id) {
      console.log(`${logPrefix} [INFO] Case ${caseData?.id} - No ${partyRoleKey} data, skipping`);
      return emailQueue;
    }

    // Process participants (excluding primary party)
    const participants = party?.participants?.filter(
      ({ email }) => email !== party.email
    ) || [];

    if (participants.length > 0) {
      console.log(`${logPrefix} [INFO] Case ${caseData?.id} - Found ${participants.length} additional participant(s) for ${partyRoleKey}`);

      for (const participant of participants) {
        emailQueue.push({
          fn: () => formatAndSendEmail(caseMediator, caseData, participant, icsData, null),
          type: 'participant',
          email: participant.email,
          caseId: caseData.id,
        });
      }
    }

    // Process primary party
    emailQueue.push({
      fn: () => formatAndSendEmail(caseMediator, caseData, party, icsData, {
        [`${partyRoleKey}_id`]: party.client_id,
        case_id: caseData.id,
        type: "zoom",
        mediator: caseMediator?.mediator_id,
        event: "Zoom Reminder Sent.",
      }),
      type: 'primary',
      email: party.email,
      caseId: caseData.id,
    });

    // Process additional parties
    const additionalParties = party?.additionalParties || [];

    if (additionalParties.length > 0) {
      console.log(`${logPrefix} [INFO] Case ${caseData?.id} - Found ${additionalParties.length} additional part${additionalParties.length > 1 ? 'ies' : 'y'} for ${partyRoleKey}`);

      for (const additionalParty of additionalParties) {
        // Process participants of additional party
        const additionalParticipants = additionalParty?.participants?.filter(
          ({ email }) => email !== additionalParty.email
        ) || [];

        for (const participant of additionalParticipants) {
          emailQueue.push({
            fn: () => formatAndSendEmail(caseMediator, caseData, participant, icsData, null),
            type: 'additional_participant',
            email: participant.email,
            caseId: caseData.id,
          });
        }

        // Process additional party itself
        emailQueue.push({
          fn: () => formatAndSendEmail(caseMediator, caseData, additionalParty, icsData, {
            [`${getPrimaryAccessorByRole(additionalParty.role)}`]:
              additionalParty.primary_party_id ?? additionalParty.client_id,
            additional_client_id:
              additionalParty.primary_party_id !== null ? additionalParty.client_id : null,
            case_id: caseData.id,
            type: "zoom",
            mediator: caseMediator?.mediator_id,
            event: "Zoom Reminder Sent.",
          }),
          type: 'additional_party',
          email: additionalParty.email,
          caseId: caseData.id,
        });
      }
    }

    console.log(`${logPrefix} [SUCCESS] Case ${caseData?.id} - Built queue with ${emailQueue.length} email(s) for ${partyRoleKey}`);
    return emailQueue;
  } catch (err) {
    console.error(`${logPrefix} [ERROR] Case ${caseData?.id} - Failed to build email queue for ${partyRoleKey}:`, {
      message: err.message,
      stack: err.stack,
    });
    return emailQueue;
  }
}

/**
 * Main function to send zoom reminders for all cases
 * @returns {Promise<Object>} Summary of processing results
 */
async function sendZoomReminders() {
  const startTime = dayjs.utc();
  const summary = {
    totalMediators: 0,
    processedMediators: 0,
    totalCases: 0,
    processedCases: 0,
    totalEmails: 0,
    successfulEmails: 0,
    failedEmails: 0,
    errors: [],
  };

  console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} ===== ZOOM REMINDER JOB STARTED =====`);
  console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [INFO] Job started at ${startTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);

  try {
    const mediators = await getMediator();
    summary.totalMediators = mediators.length;

    if (mediators.length === 0) {
      console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [WARNING] No mediators to process, exiting`);
      return summary;
    }

    for (const mediator of mediators) {
      try {
        console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [PROCESSING] Mediator: ${mediator.email}`);

        const mediatorCases = await getMediatorCases(mediator?.user_id);
        summary.totalCases += mediatorCases.length;

        if (mediatorCases.length === 0) {
          console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [INFO] No cases for mediator ${mediator.email}`);
          summary.processedMediators++;
          continue;
        }

        for (const caseData of mediatorCases) {
          try {
            console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [PROCESSING] Case ${caseData.id} for mediator ${mediator.email}`);

            const { plaintiff, defendant, mediator_id: caseMediator } = caseData;

            // Validate case mediator data
            if (!caseMediator) {
              throw new Error(`Case ${caseData.id} has no mediator data`);
            }

            // Generate ICS calendar file
            let icsData;
            try {
              icsData = generateICSFileForManual(
                caseData,
                caseMediator,
                mediator?.mediator_settings
              );
            } catch (icsError) {
              console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERROR] Failed to generate ICS file for case ${caseData.id}:`, icsError.message);
              throw new Error(`ICS generation failed: ${icsError.message}`);
            }

            // Build email queue for all parties
            const emailQueue = [];

            // Process plaintiff
            const plaintiffQueue = buildPartyEmailQueue(plaintiff, "plaintiff", caseMediator, caseData, icsData);
            emailQueue.push(...plaintiffQueue);

            // Process defendant
            const defendantQueue = buildPartyEmailQueue(defendant, "defender", caseMediator, caseData, icsData);
            emailQueue.push(...defendantQueue);

            // Add mediator email
            emailQueue.push({
              fn: () => formatAndSendEmailForMediator(caseMediator, caseData, icsData),
              type: 'mediator',
              email: caseMediator.email,
              caseId: caseData.id,
            });

            summary.totalEmails += emailQueue.length;
            console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [INFO] Case ${caseData.id} - Queued ${emailQueue.length} email(s)`);

            // Execute email queue with proper error handling
            for (const item of emailQueue) {
              try {
                console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SENDING] Case ${item.caseId} - ${item.type} - ${item.email}`);

                const result = await item.fn();

                if (result.success) {
                  summary.successfulEmails++;
                } else {
                  summary.failedEmails++;
                  summary.errors.push({
                    caseId: item.caseId,
                    email: item.email,
                    type: item.type,
                    error: result.error,
                  });
                }

                await delay(ZOOM_REMINDER_CONFIG.EMAIL_DELAY_MS);
              } catch (emailError) {
                summary.failedEmails++;
                summary.errors.push({
                  caseId: item.caseId,
                  email: item.email,
                  type: item.type,
                  error: emailError.message,
                });
                console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [FAILED] Case ${item.caseId} - ${item.type} - ${item.email}:`, {
                  message: emailError.message,
                  stack: emailError.stack,
                });
              }
            }

            summary.processedCases++;
            console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] Case ${caseData.id} processed successfully`);
          } catch (caseError) {
            console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERROR] Failed to process case ${caseData.id}:`, {
              message: caseError.message,
              stack: caseError.stack,
            });
            summary.errors.push({
              caseId: caseData.id,
              error: caseError.message,
            });
          }
        }

        summary.processedMediators++;
        console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUCCESS] Completed processing mediator ${mediator.email}`);
      } catch (mediatorError) {
        console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERROR] Failed to process mediator ${mediator.email}:`, {
          message: mediatorError.message,
          stack: mediatorError.stack,
        });
        summary.errors.push({
          mediator: mediator.email,
          error: mediatorError.message,
        });
      }
    }

    const endTime = dayjs.utc();
    const duration = endTime.diff(startTime, 'second', true).toFixed(2);

    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} ===== ZOOM REMINDER JOB COMPLETED =====`);
    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [INFO] Job completed at ${endTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);
    console.log(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [SUMMARY]`, {
      startTime: startTime.format('YYYY-MM-DD HH:mm:ss UTC'),
      endTime: endTime.format('YYYY-MM-DD HH:mm:ss UTC'),
      duration: `${duration}s`,
      mediators: `${summary.processedMediators}/${summary.totalMediators}`,
      cases: `${summary.processedCases}/${summary.totalCases}`,
      emails: `${summary.successfulEmails}/${summary.totalEmails} sent`,
      failed: summary.failedEmails,
      errors: summary.errors.length,
    });

    if (summary.errors.length > 0) {
      console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERRORS] ${summary.errors.length} error(s) occurred:`,
        summary.errors.slice(0, 10) // Log first 10 errors
      );
      if (summary.errors.length > 10) {
        console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [ERRORS] ... and ${summary.errors.length - 10} more errors`);
      }
    }

    return summary;
  } catch (error) {
    console.error(`${ZOOM_REMINDER_CONFIG.LOG_PREFIX} [CRITICAL] Job failed with critical error:`, {
      message: error.message,
      stack: error.stack,
    });

    summary.errors.push({
      critical: true,
      error: error.message,
    });

    return summary;
  }
}

// sendZoomReminders()

module.exports = {
  sendZoomReminders,
};