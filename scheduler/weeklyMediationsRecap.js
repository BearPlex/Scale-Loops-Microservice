const supabase = require("../config/supabaseClient");
const moment = require("moment");
const {
  loopsHeader,
  loopsUrl,
  findAdditionalParticipants,
} = require("../services/supabaseController");
const { convertToAMPM, generateCasesHtml } = require("../utils/functions");
const { LOOPS_EMAIL_TRANSACTIONAL_IDS } = require("../constants/emailConstant");
const axios = require("axios");

async function sendWeeklyRecapEmailToMediator(userId = null) {
  // console.log("userId", userId)
  const { data, error } = await supabase.rpc(
    "get_all_mediators_weekly_summary_v1",
    userId ? { user_id_input: userId } : { user_id_input: null }
  );

  if (error) {
    console.error("Error fetching weekly summary:", error);
    return;
  }
  // console.log("data", data)
  if (!data || !Array.isArray(data)) {
    console.warn("Invalid or empty response from summary");
    return;
  }
  const nonGscMediators = data.filter(
    (item) => !item?.mediator?.is_gsc_cases_allowed
  );
  // console.log("nonGscMediators", nonGscMediators);
  // return;

  for (const item of nonGscMediators) {
    const mediator = item?.mediator;
    const thisWeek = item?.thisWeek;
    const nextWeekCases = item?.nextWeekCases || [];
    // console.log("nextWeekCases", nextWeekCases)
    if (!mediator?.email) continue;

    const cases = await Promise.all(
      nextWeekCases
        .sort(
          (a, b) =>
            new Date(a.scheduledDate || a.mediation_date) -
            new Date(b.scheduledDate || b.mediation_date)
        )
        .map(async (c) => {
          const parties = [];
          const caseIdForQueries = c.caseId || c.case_id || c.id;

          const normalizeBoolean = (val) => {
            if (typeof val === "boolean") return val;
            if (typeof val === "number") return val !== 0;
            if (typeof val === "string") {
              const v = val.toLowerCase();
              return v === "true" || v === "t" || v === "1" || v === "yes";
            }
            return false;
          };

          const toCheckmark = (val) => (normalizeBoolean(val) ? "✅" : "❌");

          const isPaid = (
            payment,
            hourlyPayment = null,
            paymentType = null
          ) => {
            const pricing_type =
              typeof paymentType === "string"
                ? paymentType.toLowerCase()
                : paymentType;

            if (pricing_type === "hourly" && hourlyPayment !== null) {
              // Case 1: Only hourly check
              return normalizeBoolean(hourlyPayment);
            } else if (hourlyPayment === null) {
              // Case 2: Only check payments
              if (typeof payment === "boolean") return payment;
              if (typeof payment === "string") {
                const v = payment.toLowerCase();
                return (
                  v === "paid" ||
                  v === "paid_manually" ||
                  v === "true" ||
                  v === "t" ||
                  v === "1"
                );
              }
              return normalizeBoolean(payment);
            } else {
              // Case 3: Both hourly & payment must be true, otherwise false
              const hourlyPaid = normalizeBoolean(hourlyPayment);
              const regularPaid = normalizeBoolean(payment);
              return hourlyPaid && regularPaid;
            }
          };

          const hasDocs = (obj = {}) => {
            if (mediator?.is_odr_mediator) {
              return normalizeBoolean(obj.key_documents);
              // ||
              // normalizeBoolean(obj.documents) ||
              // normalizeBoolean(obj.has_documents)
            }
            return normalizeBoolean(obj.brief);
          };

          const getDisplayName = (obj = {}) => {
            return (
              obj.name ||
              obj.client?.name ||
              obj.email ||
              obj.client?.email ||
              "Party"
            );
          };

          const roleLabel = (role) => {
            if (!role) return "Party";
            const r = String(role).toLowerCase();
            if (r.includes("plaintiff")) return "Plaintiff";
            if (r.includes("defendant")) return "Defendant";
            return role;
          };

          const pushParty = (obj = {}, role, pricingTypeForCase = null) => {
            console.log("obj", obj);
            if (!obj) return;

            parties.push({
              partyName: getDisplayName(obj),
              partyRole: roleLabel(
                role || obj.client_type || obj.role || obj.party?.role
              ),
              onboarding: toCheckmark(obj.onboarding),
              payment: toCheckmark(
                isPaid(
                  obj.payment,
                  obj.hourly_payment === null ? null : obj.hourly_payment,
                  c.pricingType
                )
              ),
              documents: toCheckmark(hasDocs(obj)),
            });
          };

          const enrichAdditionalParty = async (clientId) => {
            if (!caseIdForQueries || !clientId) {
              return {
                onboarding: false,
                payment: false,
                brief: false,
                key_documents: false,
              };
            }
            try {
              const [onb, pay, meta, cap] = await Promise.all([
                supabase
                  .from("onboarding")
                  .select("completed, brief_info, is_brief_submit_manually")
                  .eq("case_id", caseIdForQueries)
                  .eq("client_id", clientId)
                  .maybeSingle(),
                supabase
                  .from("payments")
                  .select("status")
                  .eq("case_id", caseIdForQueries)
                  .eq("client_id", clientId)
                  .in("status", ["paid", "paid_manually"])
                  .limit(1),
                supabase
                  .from("odr_case_meta_data")
                  .select(
                    "additional_docs, court_adr_order_docs, mediator_statement_docs"
                  )
                  .eq("case_id", caseIdForQueries)
                  .limit(1),
                supabase
                  .from("cases")
                  .select("caption_page")
                  .eq("id", caseIdForQueries)
                  .single(),
              ]);

              const onbRow = onb?.data || null;
              const paid = Array.isArray(pay?.data) && pay.data.length > 0;
              const metaRow = Array.isArray(meta?.data)
                ? meta.data[0]
                : meta?.data;
              const caption = cap?.data?.caption_page;

              const hasBrief = !!(
                onbRow &&
                ((typeof onbRow.brief_info === "string" &&
                  onbRow.brief_info.length > 2) ||
                  (Array.isArray(onbRow.brief_info) &&
                    onbRow.brief_info.length > 0) ||
                  onbRow.is_brief_submit_manually === true)
              );

              const hasCaseDocs = !!(
                (Array.isArray(caption) && caption.length > 0) ||
                (metaRow &&
                  ((Array.isArray(metaRow.additional_docs) &&
                    metaRow.additional_docs.length > 0) ||
                    (Array.isArray(metaRow.court_adr_order_docs) &&
                      metaRow.court_adr_order_docs.length > 0) ||
                    (Array.isArray(metaRow.mediator_statement_docs) &&
                      metaRow.mediator_statement_docs.length > 0)))
              );

              return {
                onboarding: onbRow?.completed === true,
                payment: paid,
                brief: hasBrief,
                key_documents: hasCaseDocs,
              };
            } catch (e) {
              return {
                onboarding: false,
                payment: false,
                brief: false,
                key_documents: false,
              };
            }
          };
          // console.log("c", c)
          // Backward compatibility: old shape party1/party2
          const casePricingType = c?.pricingType || c?.pricing_type || null;

          if (c.party1 && (c.party1.name || c.party1.email)) {
            pushParty(
              c.party1,
              c.party1?.client_type || "Plaintiff",
              casePricingType
            );
          }

          if (c.party2 && (c.party2.name || c.party2.email)) {
            pushParty(
              c.party2,
              c.party2.client_type || "Defendant",
              casePricingType
            );
          }

          // New shape: plaintiff/defendant
          // if (c.plaintiff) {
          //   pushParty(c.plaintiff, "plaintiff", casePricingType);
          // }
          // if (c.defendant) {
          //   pushParty(c.defendant, "defendant", casePricingType);
          // }

          // Additional parties: any number, either side (support multiple possible keys)
          let additionalArrays = [
            // c?.additionalParties || [],
            // c?.additional_parties || [],
            // c?.additionalParticipants || [],
            c?.additional_participants || [],
          ].filter(Array.isArray);

          // // If RPC payload doesn't include additional parties, fetch them
          // if (additionalArrays.length === 0) {
          //   try {
          //     const caseId = c.caseId || c.case_id || c.id;
          //     if (caseId) {
          //       // Fetch from case_parties table, excluding primary parties
          //       const { data: fetched, error: fetchError } = await supabase
          //         .from("case_parties")
          //         .select("*,client:client_id(*)")
          //         .eq("case_id", caseId)
          //         .not(
          //           "client_id",
          //           "in",
          //           `(${c.plaintiff_id || 0},${c.defender_id || 0})`
          //         );

          //       if (
          //         !fetchError &&
          //         Array.isArray(fetched) &&
          //         fetched.length > 0
          //       ) {
          //         additionalArrays = [fetched];
          //       }
          //     }
          //   } catch (e) {
          //     console.log(
          //       "Could not fetch additional participants",
          //       e?.message || e
          //     );
          //   }
          // }

          if (additionalArrays.length > 0) {
            for (const arr of additionalArrays) {
              for (const ap of arr) {
                let aParty = {
                  name:
                    ap?.name ||
                    ap?.client?.name ||
                    ap?.email ||
                    ap?.client?.email,
                  onboarding: ap?.onboarding,
                  payment: ap?.payment ?? ap?.is_paid,
                  hourly_payment:
                    ap?.hourly_payment ?? ap?.hourlyPayment ?? null,
                  pricing_type: ap?.pricing_type ?? ap?.paymentType ?? null,
                  brief: ap?.brief,
                  key_documents: ap?.key_documents,
                  documents: ap?.documents,
                  has_documents: ap?.has_documents,
                };

                if (
                  aParty.onboarding === undefined ||
                  aParty.payment === undefined ||
                  (aParty.brief === undefined &&
                    aParty.key_documents === undefined)
                ) {
                  const clientId = ap?.client_id || ap?.client?.client_id;
                  const enriched = await enrichAdditionalParty(clientId);
                  aParty = { ...aParty, ...enriched };
                }

                pushParty(aParty, ap?.role || ap?.client_type, casePricingType);
              }
            }
          }
          // console.log("parties", parties)

          const scheduledDate = c?.scheduledDate || c?.mediation_date;
          const scheduledTime = c?.scheduledTime || c?.case_schedule_time;
          const dateStr = scheduledDate
            ? moment(scheduledDate).format("MMMM DD, YYYY")
            : "";
          const caseDate = scheduledTime
            ? `${dateStr} at ${convertToAMPM(scheduledTime)}`
            : dateStr;
          // console.log("ererere")
          return {
            caseTitle: c.caseName || c.case_name || "Untitled Case",
            caseDate,
            partyCount: parties.length,
            parties,
            url: c?.viewUrl || c?.url,
          };
        })
    );

    const filteredCases = cases.filter((c) => c.parties.length > 0);

    const casesHtml = generateCasesHtml(cases);

    const totalMediationsHtml = `<mj-wrapper padding-left="12px" padding-right="14px" padding="3px">
            <mj-section padding="0px">
              <mj-column padding="0px">
                <mj-text padding="0px">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border-left: 4px solid #34d399; border-top-right-radius: 5px; border-bottom-right-radius: 5px; padding: 16px;">
                    <tr>
                      <td style="padding: 16px; font-size: 14px; color: #111827;">
                        <strong>Nice work</strong> — you completed <span style="color:#027776; font-size:16px; font-weight:bold;">${
                          thisWeek?.totalMediations
                        }</span> ${
      thisWeek?.totalMediations > 1 ? "mediations" : "mediation"
    } this week!<br />
                      </td>
                    </tr>
                  </table>
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-wrapper>`;

    if (casesHtml === "" && thisWeek?.totalMediations <= 0) {
      console.log(
        "No Mediations in this week and also no any in next week  -> ",
        "Mediator Email:",
        mediator?.email
      );
      continue;
    }

    const emailData = {
      transactionalId: LOOPS_EMAIL_TRANSACTIONAL_IDS.WEEKLY_RECAP_FOR_MEDIATOR,
      email: mediator.email,
      // email: "adam@scalemediation.com",
      // email: "hiqbal@bearplex.com",
      dataVariables: {
        mediatorName: `${mediator.first_name} ${mediator.last_name}`,
        totalMediationsHtml:
          thisWeek?.totalMediations > 0 ? totalMediationsHtml : " ",
        casesHtml: casesHtml
          ? casesHtml
          : `<tr>
                <td colspan="5" style="padding: 10px; text-align: center; font-size: 12px; color: #6b7280;">
                  You have no cases for next week
                </td>
              </tr>`,
        // totalMediations: thisWeek?.totalMediations || 0,
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
  console.log("Is today Friday?", isFriday, "Date: ", today);

  if (!isFriday) {
    return true;
  }

  try {
    await sendWeeklyRecapEmailToMediator();
    // "74b49fc0-5d92-4a04-a52a-7f25d4441e9c" // Haider iqbal (STAGING)
    // "ea514a48-e99f-44e3-b5b7-dbe9e9abe473" // Hamad Peraiz (APP)
    // f86dd041-c56c-4db3-a3e7-d3dbe6937a8d
    // 6cc65cd0-a8b5-49e7-b9ee-d0da92e75ff5 // eric
    // e9df3361-f659-4938-8f8b-bd5572e386e6 //corey
    // 414a9fbc-d0e4-4ee6-abcd-90e5c5c53bf4 Jennifer
    // 1b2d6f19-d846-4eea-a861-8c00b9c848f0 //Fateemah
    // 571149e9-cf12-4a5a-a5ac-73d8b6a01a9d //ProudFoot
    // await sendWeeklyRecapEmailToMediator("571149e9-cf12-4a5a-a5ac-73d8b6a01a9d");
  } catch (err) {
    console.log(
      `Error While Sending Weekly Mediation Recap: Date: ${today}`,
      err
    );
  }
}

// weeklyMediationRecap();
module.exports = {
  weeklyMediationRecap,
};
