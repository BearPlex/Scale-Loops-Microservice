const supabase = require("../config/supabaseClient");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { loopsHeader, loopsUrl } = require("../services/supabaseController");
const { LOOPS_EMAIL_TRANSACTIONAL_IDS } = require("../constants/emailConstant");
const axios = require("axios");
const { MEDIATORS } = require("../constants/user.constant");

dayjs.extend(utc);

async function sendCaseOutcomeReportReminder(userId = null) {
    const startTime = dayjs.utc();
    console.log(`[CASE_OUTCOME_REMINDER] Job started at ${startTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);

    try {
        // Calculate the date 48 hours ago
        const fortyEightHoursAgo = dayjs.utc();
        // .subtract(48, 'hours');

        console.log(`[CASE_OUTCOME_REMINDER] Looking for mediations completed on ${fortyEightHoursAgo.format('YYYY-MM-DD')}`);

        // Query for completed mediations from 48 hours ago using cases table
        let query = supabase
            .from('cases')
            .select(`
        id,
        case_name,
        mediation_date,
        case_number,
        case_schedule_time,
        mediator:mediator_id(
          mediator_id,
          first_name,
          last_name,
          email
        )
      `)
            .eq('mediation_date', fortyEightHoursAgo.format('YYYY-MM-DD'))
            .not('mediator_id', 'is', null);

        // If specific user ID is provided, filter by that mediator
        if (userId) {
            query = query.eq('mediator_id', userId);
        }

        const { data: casesData, error } = await query;

        if (error) {
            console.error("[CASE_OUTCOME_REMINDER] Error fetching cases:", error);
            throw error;
        }

        if (!casesData || !Array.isArray(casesData) || casesData.length === 0) {
            console.warn("[CASE_OUTCOME_REMINDER] No completed mediations found for outcome report reminders");
            return;
        }

        console.log(`[CASE_OUTCOME_REMINDER] Found ${casesData.length} completed mediations to process`);

        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;

        // Process each completed mediation
        for (const caseData of casesData) {
            const mediator = caseData.mediator;

            if (!mediator || !mediator.email) {
                console.warn("[CASE_OUTCOME_REMINDER] Skipping case without mediator email");
                skippedCount++;
                continue;
            }

            if (!caseData || !caseData.case_name) {
                console.warn("[CASE_OUTCOME_REMINDER] Skipping case without case_name");
                skippedCount++;
                continue;
            }

            // Check if outcome report already exists for this case and mediator
            const { data: existingOutcome, error: outcomeError } = await supabase
                .from('outcome_cases')
                .select('id')
                .eq('case_id', caseData.id)
                .eq('mediator_id', mediator.mediator_id)
                .maybeSingle();

            if (outcomeError) {
                console.error(`[CASE_OUTCOME_REMINDER] Error checking outcome for case ${caseData.id}:`, outcomeError);
                skippedCount++;
                continue;
            }

            // If outcome report exists, skip this case
            if (existingOutcome) {
                console.log(`[CASE_OUTCOME_REMINDER] Skipping case ${caseData.id} - outcome report already exists`);
                skippedCount++;
                continue;
            }

            const mediatorName = `${mediator.first_name || ''} ${mediator.last_name || ''}`.trim() || 'Mediator';
            const caseTitle = caseData.case_name;
            const case_schedule_time = caseData.case_schedule_time;
            const case_number = caseData.case_number;

            console.log(`[CASE_OUTCOME_REMINDER] Processing reminder for ${mediatorName} - Case: ${caseTitle}`);

            // Prepare email data
            const emailData = {
                transactionalId: LOOPS_EMAIL_TRANSACTIONAL_IDS.CASE_OUTCOME_REPORT_REMINDER,
                email: mediator.email,
                // email: "hiqbal@bearplex.com",
                dataVariables: {
                    mediatorName,
                    caseNumber: case_number || "N/A",
                    caseTitle,
                    caseUrl: `https://app.scalemediation.com/cases/${caseData.id}`,
                },
            };

            try {
                const response = await axios.post(loopsUrl, emailData, {
                    headers: loopsHeader,
                });

                console.log(
                    `[CASE_OUTCOME_REMINDER] ✅ Email sent to ${mediator.email} - ` +
                    `Status: ${response.status} - Case: ${caseTitle} - ${case_schedule_time}`
                );
                successCount++;
            } catch (err) {
                console.error(
                    `[CASE_OUTCOME_REMINDER] ❌ Failed to send to ${mediator.email}:`,
                    err?.response?.data || err.message
                );
                failureCount++;
            }
        }

        const endTime = dayjs.utc();
        const duration = endTime.diff(startTime, 'second', true).toFixed(2);

        console.log(`[CASE_OUTCOME_REMINDER] ===== JOB COMPLETED =====`);
        console.log(`[CASE_OUTCOME_REMINDER] Job completed at ${endTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);
        console.log(`[CASE_OUTCOME_REMINDER] Duration: ${duration}s`);
        // console.log(`[CASE_OUTCOME_REMINDER] Total mediations: ${data.length}`);
        console.log(`[CASE_OUTCOME_REMINDER] Emails sent: ${successCount}`);
        console.log(`[CASE_OUTCOME_REMINDER] Failed: ${failureCount}`);
        console.log(`[CASE_OUTCOME_REMINDER] Skipped: ${skippedCount}`);

    } catch (err) {
        console.error(
            `[CASE_OUTCOME_REMINDER] Error in case outcome report reminder job:`,
            err?.message || err
        );
        throw err;
    }
}

/**
 * Main function that runs daily to send case outcome report reminders
 * @returns {Promise<boolean>}
 */
async function caseOutcomeReportReminder() {
    const today = dayjs.utc().startOf("day");
    console.log(`[CASE_OUTCOME_REMINDER] Running case outcome report reminder job - Date: ${today.format('YYYY-MM-DD')}`);

    try {
        await sendCaseOutcomeReportReminder();
        // await sendCaseOutcomeReportReminder(MEDIATORS.MATTHEW_PROUDFOOT.user_id);
        return true;
    } catch (err) {
        console.error(
            `[CASE_OUTCOME_REMINDER] Error while sending case outcome report reminders - Date: ${today.format('YYYY-MM-DD')}`,
            err
        );
        return false;
    }
}

// Uncomment to test locally
// caseOutcomeReportReminder();

module.exports = {
    caseOutcomeReportReminder,
};
