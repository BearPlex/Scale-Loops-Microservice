const {
  CASE_PARTIES,
  ONBOARDING_TABLE,
  PAYMENTS_TABLE,
  ODR_CASE_META_DATA_TABLE,
} = require("../../constants/supabase.constant");
const {
  findCasesByMediatorId,
  findAdditionalParticipants,
  findParticipants,
  findCaseById,
} = require("../../services/supabaseController");
const { safeParseArray } = require("../functions");

const buildLookup = (arr, key = "client_id") =>
  new Map((arr || []).map((item) => [item[key], item]));

const getPartyData = (
  party,
  additionalParties,
  paymentMap,
  onboardingMap,
  odrMap,
  participants
) => {
  if (!party) return null;

  const primaryId = party.client_id;

  const filteredAdditional = (additionalParties || [])
    .filter(({ primary_party_id }) => primary_party_id === primaryId)
    .map((item) => ({
      ...item,
      payment: paymentMap.get(item.client_id) || null,
      onboarding: onboardingMap.get(item.client_id) || null,
      odrCaseMetaData: odrMap.get(item.client_id) || null,
    }));

  return {
    ...party,
    payment: paymentMap.get(primaryId) || null,
    onboarding: onboardingMap.get(primaryId) || null,
    odrCaseMetaData: odrMap.get(primaryId) || null,
    additionalParties: filteredAdditional,
    participants,
    alternate_emails:
      participants?.find(
        (x) => x.client_id === primaryId && x?.alternate_emails?.length > 0
      )?.alternate_emails || [],
  };
};

const processSingleCaseData = async (caseData) => {
  const {
    payments = [],
    onboarding = [],
    odr_case_meta_data = [],
    additionalParties = [],
    plaintiff_id,
    defender_id,
    id: case_id,
  } = caseData || {};

  const participants = await findParticipants(case_id);
  const additionalParticipants = await findAdditionalParticipants(case_id);

  const paymentMap = buildLookup(payments);
  const onboardingMap = buildLookup(onboarding, "client_id");
  const odrMap = buildLookup(odr_case_meta_data, "client_id");

  const result = {
    ...caseData,
    service_list: safeParseArray(caseData?.service_list),
    caption_page: safeParseArray(caseData?.caption_page),
    plaintiff: getPartyData(
      { ...plaintiff_id, role: "primary_plaintiff" },
      additionalParties?.map((x) => ({
        ...x,
        name: x?.client?.name,
        email: x?.client?.email,
        alternate_emails:
          additionalParticipants?.find(
            ({ primary_party_id, client_id, alternate_emails }) =>
              primary_party_id === plaintiff_id?.client_id &&
              client_id === x.client_id &&
              alternate_emails?.length > 0
          )?.alternate_emails || [],
        participants: additionalParticipants?.filter(
          ({ primary_party_id, client_id }) =>
            primary_party_id === plaintiff_id?.client_id &&
            client_id === x.client_id
        ),
      })),
      paymentMap,
      onboardingMap,
      odrMap,
      participants.filter(
        ({ client_id }) => client_id === plaintiff_id?.client_id
      )
    ),
    defendant: getPartyData(
      { ...defender_id, role: "primary_defendant" },
      additionalParties?.map((x) => ({
        ...x,
        name: x?.client?.name,
        email: x?.client?.email,
        alternate_emails:
          additionalParticipants?.find(
            ({ primary_party_id, client_id, alternate_emails }) =>
              primary_party_id === defender_id?.client_id &&
              client_id === x.client_id &&
              alternate_emails?.length > 0
          )?.alternate_emails || [],
        participants: additionalParticipants?.filter(
          ({ primary_party_id, client_id }) =>
            primary_party_id === defender_id?.client_id &&
            client_id === x.client_id
        ),
      })),
      paymentMap,
      onboardingMap,
      odrMap,
      participants.filter(
        ({ client_id }) => client_id === defender_id?.client_id
      )
    ),
  };

  delete result?.payments;
  delete result?.onboarding;
  delete result?.odr_case_meta_data;
  delete result?.additionalParties;
  delete result?.defender_id;
  delete result?.plaintiff_id;

  return result;
};

const casePrimaryAndAdditionalPartiesData = async (
  caseId = null,
  mediatorId = null,
  filters = []
) => {
  try {
    // console.log("casePrimaryAndAdditionalPartiesData -> ", {
    //   caseId,
    //   mediatorId,
    //   filters,
    // });

    const columns = `
      *,
      casemetadata(*),
      additionalParties:${CASE_PARTIES}(*,client:client_id(*)),
      coupon:coupon_id(*),
      defender_id(*),
      plaintiff_id(*),
      ${PAYMENTS_TABLE}(*),
      ${ONBOARDING_TABLE}(*),
      ${ODR_CASE_META_DATA_TABLE}(*),
      mediator_id(first_name,last_name,photo_url,email,timezone,mediator_id,email_cc,user_id,payment_reminder_days)
    `;

    if (caseId) {
      const caseData = await findCaseById(caseId, columns);
      if (!caseData) return null;
      return await processSingleCaseData(caseData);
    }

    if (mediatorId) {
      const cases = await findCasesByMediatorId(mediatorId, columns, filters);
      // console.log("cases.length", cases?.length);
      if (!cases || cases.length === 0) return [];

      const processedCases = await Promise.all(
        cases.map(async (caseData) => await processSingleCaseData(caseData))
      );
      return processedCases;
    }

    return null;
  } catch (err) {
    console.error("Helper get cases data error:", err);
    throw err;
  }
};

module.exports = {
  casePrimaryAndAdditionalPartiesData,
};
