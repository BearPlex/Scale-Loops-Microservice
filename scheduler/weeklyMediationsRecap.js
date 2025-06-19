const supabase = require("../config/supabaseClient");
const moment = require("moment");
const { loopsHeader, loopsUrl } = require("../services/supabaseController");
const { convertToAMPM, generateCasesHtml } = require("../utils/functions");
const { LOOPS_EMAIL_TRANSACTIONAL_IDS } = require("../constants/emailConstant");
const axios = require("axios");

async function sendWeeklyRecapEmailToMediator(userId = null) {
  const { data, error } = await supabase.rpc(
    "get_all_mediators_weekly_summary",
    userId ? { user_id_input: userId } : { user_id_input: null }
  );

  if (error) {
    console.error("Error fetching weekly summary:", error);
    return;
  }

  if (!data || !Array.isArray(data)) {
    console.warn("Invalid or empty response from summary");
    return;
  }

  for (const item of data) {
    const mediator = item?.mediator;
    const thisWeek = item?.thisWeek;
    const nextWeekCases = item?.nextWeekCases || [];

    if (!mediator?.email) continue;

    const cases = nextWeekCases
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .map((c) => {
        const parties = [];

        if (c.party1 && c.party1.name) {
          parties.push({
            partyName: c.party1.name,
            partyRole: c.party1.client_type || "Party 1",
            onboarding: c.party1.onboarding ? "✅" : "❌",
            payment: c.party1.payment ? "✅" : "❌",
            documents:
              c.party1.brief === true || c.party1.key_documents === true
                ? "✅"
                : "❌",
          });
        }

        if (c.party2 && c.party2.name) {
          parties.push({
            partyName: c.party2.name,
            partyRole: c.party2.client_type || "Party 2",
            onboarding: c.party2.onboarding ? "✅" : "❌",
            payment: c.party2.payment ? "✅" : "❌",
            documents:
              c.party2.brief === true || c.party2.key_documents === true
                ? "✅"
                : "❌",
          });
        }

        return {
          caseTitle: c.caseName || "Untitled Case",
          caseDate: `${moment(c?.scheduledDate).format(
            "MMMM DD, YYYY"
          )} at ${convertToAMPM(c?.scheduledTime)}`,
          partyCount: parties.length,
          parties,
          url: c?.viewUrl,
        };
      })
      .filter((c) => c.parties.length > 0);

    const casesHtml = generateCasesHtml(cases);
    const emailData = {
      transactionalId: LOOPS_EMAIL_TRANSACTIONAL_IDS.WEEKLY_RECAP_FOR_MEDIATOR,
      email: mediator.email,
      // email: "hiqbal@bearplex.com",
      dataVariables: {
        mediatorName: `${mediator.first_name} ${mediator.last_name}`,
        totalMediations: thisWeek?.totalMediations || 0,
        casesHtml: casesHtml ? casesHtml : " ",
        // deltaCount: thisWeek?.deltaCount || 0,
        // deltaPositive: thisWeek?.deltaPositive || false,
      },
    };

    try {
      const response = await axios.post(loopsUrl, emailData, {
        headers: loopsHeader,
      });
      console.log(`Email sent to ${mediator.email}:`, response.status);
    } catch (err) {
      console.error(
        `Failed to send to ${mediator.email}`,
        err?.response?.data || err.message
      );
    }
  }
}

async function weeklyMediationRecap() {
  const today = moment().utc().startOf("day");
  const isFriday = today.day() === 5;
  console.log("Is today Friday?", isFriday);

  if (!isFriday) {
    return true;
  }

  try {
    await sendWeeklyRecapEmailToMediator();
    // "74b49fc0-5d92-4a04-a52a-7f25d4441e9c"
  } catch (err) {
    console.log(
      `Error While Sending Weekly Mediation Recap: Date: ${today}`,
      err
    );
  }
}

module.exports = {
  weeklyMediationRecap,
};
