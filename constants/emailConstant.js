const { MEDIATORS } = require("./user.constant");

const LOOPS_EMAIL_TRANSACTIONAL_IDS = {
  HOURLY_INVOICE_REMINDER_TO_PARTY: "cmbt3hzaq22so0x0i0547g1ba",

  ZOOM_REMINDER_FOR_PARTIES_MEDIATOR: "cmcakm2mf07zsyl0iie3383oe",
  ZOOM_REMINDER_FOR_PARTIES_ODR_MEDIATOR: "cmcalmb5u6flezf0iu0vt0dzq",

  ZOOM_REMINDER_TO_NON_ODR_MEDIATOR: "cmcbqeri02eqny40ibf57j22h",
  ZOOM_REMINDER_TO_ODR_MEDIATOR: "cmcbqlwra2gb2y40ih01qulgz",

  PAYMENT_INVOICE_REMINDER_FOR_ODR_MEDIATOR: "cm8xo2u1005rb1yeh385ccox9",
  PAYMENT_INVOICE_REMINDER_FOR_MEDIATOR: "cm4a1erz6005x4ftd0j6l2rvv",

  ONBOARDING_REMINDER_FOR_ODR_MEDIATOR: "cm8xomzku07pfdz2n5a3hvp5r",
  ONBOARDING_REMINDER_FOR_MEDIATOR: "clzu5zwwu0006x4avb8b86g2w",

  BRIEF_REMINDER_TO_PARTY: "cm1phuaxe004g2wx8qtwg9167",

  WEEKLY_RECAP_FOR_MEDIATOR: "cmae21luk8123lffztydy3v37",
  CRM_NOTIFICATION_TO_MEDIATOR: "cmgl0fum9jgg1200i0dhex679",
  CASE_OUTCOME_REPORT_REMINDER: "cmgt8bpgvedcw390iq0egp1n7",

  ARI_LOOPS_EMAIL_TRANSACTION_ID: {
    MEDIATION_MEETING_SCHEDULED: "cmdfwgaz709mbye0iquqid8c5",
    ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR: "cmdfwg2i209ud170i6x13yem6",
    BRIEF_REMINDER_TO_PARTY: "cmdfwy7ip0f4oye0iofz66hvo",
    ZOOM_MEETING_SCHEDULED_TO_PARTY: "cmdfwzv9d00sbxr0i8dwampz4",
    HOURLY_INVOICE_TO_PARTY: "cmdgma5j60ibn120icaif0n00",
    CASE_RESCHEDULED_TO_PARTY: "cmdfx14yf012q040ijn4lcz74",
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS_TO_PARTY:
      "cmdipouu70ky43e0ifszcvyqd",
    ZOOM_LINK_REMINDER_TO_PARTY: "cmdh6sakg5qjv120ippnvpmym",
    DELETE_EMAIL_TO_PARTY: "cmdiz4g8f0uaj1e0iike6hnwk",
    CANCEL_EMAIL_TO_PARTY: "cmg0we0ml51uqwi0h2b347q9q",
    HOURLY_INVOICE_REMINDER_TO_PARTY: "cmdfwvnqt0dqsy80iuy1s6j28",
  },

  KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID: {
    MEDIATION_MEETING_SCHEDULED: "cmhkldtovevjk380i922lnifk",
    HOURLY_INVOICE_TO_PARTY: "cmhkmixesiftx1u0i5k3ucv0y",
    HOURLY_INVOICE_REMINDER_TO_PARTY: "cmhkmdo3mi7v4zy0iwi2barr3",
    NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR: "cmhlwj7ey0ww01e0i4otknu9q",
    ZOOM_MEETING_SCHEDULED_TO_PARTY: "cmhkmg2jainb12p0iboew9z95",
    CASE_RESCHEDULED_TO_PARTY: "cmhkmngtsieuz3j0i99d38x43",
    BRIEF_REMINDER_TO_PARTY: "cmhkm9x42i47o1m0incyd3ngm",
    ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR: "cmhkm6cozij8v2p0itehyhaks",
    ZOOM_LINK_REMINDER_TO_PARTY: "cmhkn645riom91g0jwv8ar9xm",
    DELETE_EMAIL_TO_PARTY: "cmhknfkikivpe0e0ixnf09w34",
    CANCEL_EMAIL_TO_PARTY: "cmhknd5x3it9z3j0i3xm92osm",
  },

  MATTHEW_PROUDFOOT_TRANSACTION_ID: {
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS_TO_PARTY:
      "cmagxjlwk0uswqlzbkdeveyd9",
    ZOOM_MEETING_SCHEDULED_TO_PARTY: "cmagy14tc000kwkby4iqt7ev9",
  },

  JIM_SHEA_TRANSACTION_ID: {
    BRIEF_REMINDER_TO_PARTY: "cmevvd826017p2g0irowa6zdr",
    GSC_CONFIRMATION_MEDIATION_ONBOARDING_EMAIL_TO_PARTY:
      "cmfcq0mov0gnduc0i1km85an3",
  },

  FATEEMAH_TRANSACTION_ID: {
    MEDIATION_SCHEDULE_EMAIL_TO_PARTY: "cmfozxibb3ih5xw0iauti1lbo",
  },
};

const LOOPS_EMAIL_TEMPLATE_NAME = {
  // Top-level transactional template names
  HOURLY_INVOICE_EMAIL_ID: "HOURLY_INVOICE_EMAIL_ID",
  HOURLY_INVOICE_TO_PARTY: "HOURLY_INVOICE_TO_PARTY",
  HOURLY_INVOICE_REMINDER_TO_PARTY: "HOURLY_INVOICE_REMINDER_TO_PARTY",

  MEDIATION_MEETING_SCHEDULED: "MEDIATION_MEETING_SCHEDULED",
  MEDIATION_MEETING_SCHEDULED_ODR: "MEDIATION_MEETING_SCHEDULED_ODR",
  MEDIATION_MEETING_SCHEDULED_ODR_REVISED:
    "MEDIATION_MEETING_SCHEDULED_ODR_REVISED",

  NEW_MEDIATOR_SESSION_TO_ODR_MEDIATOR: "NEW_MEDIATOR_SESSION_TO_ODR_MEDIATOR",
  NEW_MEDIATOR_SESSION_TO_MEDIATOR: "NEW_MEDIATOR_SESSION_TO_MEDIATOR",
  NEW_MEDIATOR_SESSION_TO_MEDIATOR_CUSTOM:
    "NEW_MEDIATOR_SESSION_TO_MEDIATOR_CUSTOM",

  POST_ONBOARDING_EMAIL_TO_ODR_MEDIATOR:
    "POST_ONBOARDING_EMAIL_TO_ODR_MEDIATOR",
  POST_ONBOARDING_EMAIL_TO_MEDIATOR: "POST_ONBOARDING_EMAIL_TO_MEDIATOR",

  NEW_INVOICE_TO_PARTY_FOR_ODR_MEDIATOR:
    "NEW_INVOICE_TO_PARTY_FOR_ODR_MEDIATOR",
  NEW_INVOICE_TO_PARTY_BY_NON_ODR_MEDIATOR:
    "NEW_INVOICE_TO_PARTY_BY_NON_ODR_MEDIATOR",
  NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR:
    "NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR",

  ZOOM_MEETING_LINK_FOR_ODR_MEDIATOR: "ZOOM_MEETING_LINK_FOR_ODR_MEDIATOR",
  ZOOM_MEETING_LINK_FOR_MEDIATOR: "ZOOM_MEETING_LINK_FOR_MEDIATOR",

  ZOOM_MEETING_LINK_TO_CLIENT_FOR_ODR_MEDIATOR:
    "ZOOM_MEETING_LINK_TO_CLIENT_FOR_ODR_MEDIATOR",
  ZOOM_MEETING_LINK_TO_CLIENT_FOR_MEDIATOR:
    "ZOOM_MEETING_LINK_TO_CLIENT_FOR_MEDIATOR",

  PAYMENT_INVOICE_REMINDER_FOR_ODR_MEDIATOR:
    "PAYMENT_INVOICE_REMINDER_FOR_ODR_MEDIATOR",
  PAYMENT_INVOICE_REMINDER_FOR_MEDIATOR:
    "PAYMENT_INVOICE_REMINDER_FOR_MEDIATOR",

  POST_PAYMENT_INVOICE_FOR_ODR_MEDIATOR:
    "POST_PAYMENT_INVOICE_FOR_ODR_MEDIATOR",
  POST_PAYMENT_INVOICE_FOR_MEDIATOR: "POST_PAYMENT_INVOICE_FOR_MEDIATOR",

  ONBOARDING_REMINDER_FOR_ODR_MEDIATOR: "ONBOARDING_REMINDER_FOR_ODR_MEDIATOR",
  ONBOARDING_REMINDER_FOR_MEDIATOR: "ONBOARDING_REMINDER_FOR_MEDIATOR",

  BRIEF_REMINDER_TO_PARTY: "BRIEF_REMINDER_TO_PARTY",

  RESCHEDULED_FOR_MEDIATOR: "RESCHEDULED_FOR_MEDIATOR",
  RESCHEDULED_FOR_ODR_MEDIATOR: "RESCHEDULED_FOR_ODR_MEDIATOR",

  CASE_DELETE_FOR_ODR_MEDIATOR: "CASE_DELETE_FOR_ODR_MEDIATOR",
  CASE_DELETE_FOR_MEDIATOR: "CASE_DELETE_FOR_MEDIATOR",

  CASE_CANCEL_FOR_ODR_MEDIATOR: "CASE_CANCEL_FOR_ODR_MEDIATOR",
  CASE_CANCEL_FOR_MEDIATOR: "CASE_CANCEL_FOR_MEDIATOR",

  WEEKLY_RECAP_FOR_MEDIATOR: "WEEKLY_RECAP_FOR_MEDIATOR",

  // Generic template names used as keys in CUSTOM_MEDIATORS_EMAILS
  INVOICE_CONFIRMATION_AND_SESSION_DETAILS:
    "INVOICE_CONFIRMATION_AND_SESSION_DETAILS",
  ZOOM_LINK_SEND: "ZOOM_LINK_SEND",
  MEDIATION_SCHEDULE_EMAIL_TO_PARTY: "MEDIATION_SCHEDULE_EMAIL_TO_PARTY",
  ZOOM_MEETING_SCHEDULED_TO_PARTY: "ZOOM_MEETING_SCHEDULED_TO_PARTY",
  ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR:
    "ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR",
  ZOOM_LINK_REMINDER_TO_PARTY: "ZOOM_LINK_REMINDER_TO_PARTY",
  RESCHEDULED_EMAIL_TO_PARTY: "RESCHEDULED_EMAIL_TO_PARTY",

  DELETE_EMAIL_TO_PARTY: "DELETE_EMAIL_TO_PARTY",
  CANCEL_EMAIL_TO_PARTY: "CANCEL_EMAIL_TO_PARTY",
  GSC_CONFIRMATION_MEDIATION_ONBOARDING_EMAIL_TO_PARTY:
    "GSC_CONFIRMATION_MEDIATION_ONBOARDING_EMAIL_TO_PARTY",
};

const CUSTOM_MEDIATORS_EMAILS = {
  [`${MEDIATORS.MATTHEW_PROUDFOOT.user_id}`]: {
    email: MEDIATORS.MATTHEW_PROUDFOOT.email,
    [`${LOOPS_EMAIL_TEMPLATE_NAME.INVOICE_CONFIRMATION_AND_SESSION_DETAILS}`]: (
      data
    ) => {
      const payload = {
        name: data?.name,
        mediatorName: data?.mediatorName,
        dateAndTime: data?.dateAndTime,
        slotType: data?.slotType,
        time: data?.time,
        mediatorEmail: data?.mediatorEmail,
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.MATTHEW_PROUDFOOT_TRANSACTION_ID
          .INVOICE_CONFIRMATION_AND_SESSION_DETAILS_TO_PARTY;

      return { payload, transcationId, isInvoiceCreate: false };
    },
    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_LINK_SEND}`]: (data) => {
      const payload = {
        name: data?.name,
        dateAndTime: data?.dateAndTime,
        zoomURL: data?.zoomURL,
        caseNumber: data?.caseNumber || "N/A",
        caseTitle: data?.caseTitle,
        mediatorName: data?.mediatorName,
        mediatorEmail: data?.mediatorEmail,
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.MATTHEW_PROUDFOOT_TRANSACTION_ID
          .ZOOM_MEETING_SCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },
  },

  [`${MEDIATORS.ARI_SLIFFMAN.user_id}`]: {
    email: MEDIATORS.ARI_SLIFFMAN.email,
    [`${LOOPS_EMAIL_TEMPLATE_NAME.INVOICE_CONFIRMATION_AND_SESSION_DETAILS}`]: (
      data
    ) => {
      const payload = {
        name: data?.name || "",
        mediatorName: data?.mediatorName || "",
        dateAndTime: data?.dateAndTime || "",
        mediatorEmail: data?.mediatorEmail || "",
        slotType: data?.slotType || "",
        time: data?.time || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .INVOICE_CONFIRMATION_AND_SESSION_DETAILS_TO_PARTY;

      return { payload, transcationId, isInvoiceCreate: true };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.MEDIATION_SCHEDULE_EMAIL_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        mediatorName: data?.mediatorName || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        onboardingURL: data?.onboardingURL || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .MEDIATION_MEETING_SCHEDULED;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_MEETING_SCHEDULED_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        dateAndTime: data?.dateAndTime || "",
        zoomURL: data?.zoomURL || "",
        caseNumber: data?.caseNumber || "N/A",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .ZOOM_MEETING_SCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR}`]:
      (data = {}) => {
        const payload = {
          name: data?.name || " ",
          mediatorName: data?.mediatorName || " ",
          caseTitle: data?.caseTitle || " ",
          caseNumber: data?.caseNumber || "N/A",
          dateAndTime: data?.dateAndTime || " ",
          onboardingURL: data?.onboardingURL || " ",
          mediatorEmail: data?.mediatorEmail || " ",
        };
        const transcationId =
          LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
            .ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR;

        return { payload, transcationId };
      },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.BRIEF_REMINDER_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || " ",
        mediatorName: data?.mediatorName || " ",
        caseTitle: data?.caseTitle || " ",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || " ",
        mediatorEmail: data?.mediatorEmail || " ",
        onboardingURL: data?.onboardingURL || " ",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .BRIEF_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_LINK_REMINDER_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        mediatorName: data?.mediatorName || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        mediatorEmail: data?.mediatorEmail || "",
        zoomURL: data?.zoomURL || "",
        dateAndTime: data?.dateAndTime || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .ZOOM_LINK_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.RESCHEDULED_EMAIL_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        oldDateAndTime: data?.oldDateAndTime || "",
        newDateAndtime: data?.newDateAndtime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .CASE_RESCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.HOURLY_INVOICE_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        mediatorName: data?.mediatorName || "",
        totalDue: data?.totalDue || "",
        caseTitle: data?.caseTitle || "",
        dateAndTime: data?.dateAndTime || "",
        paymentURL: data?.paymentURL || "",
        mediatorEmail: data?.mediatorEmail || "",
        dueDate: data?.dueDate || "",
        caseNumber: data?.caseNumber || "N/A",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .HOURLY_INVOICE_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.DELETE_EMAIL_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .DELETE_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.CANCEL_EMAIL_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .CANCEL_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },
  },

  [`${MEDIATORS.JIM_SHEA.user_id}`]: {
    email: MEDIATORS.JIM_SHEA.email,
    [`${LOOPS_EMAIL_TEMPLATE_NAME.BRIEF_REMINDER_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        mediatorName: data?.mediatorName || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorEmail: data?.mediatorEmail || "",
        onboardingURL: data?.onboardingURL || " ",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.JIM_SHEA_TRANSACTION_ID
          .BRIEF_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.GSC_CONFIRMATION_MEDIATION_ONBOARDING_EMAIL_TO_PARTY}`]:
      (data = {}) => {
        const payload = {
          name: data?.name || " ",
          mediatorName: data?.mediatorName || " ",
          caseTitle: data?.caseTitle || " ",
          caseNumber: data?.caseNumber || "N/A",
          dateAndTime: data?.dateAndTime || " ",
          mediatorEmail: data?.mediatorEmail || " ",
          zoomLink: data?.zoomLink || "",
          zoomCallNumber: data?.zoomCallNumber || "N/A",
          zoomId: data?.zoomId || " ",
        };
        const transcationId =
          LOOPS_EMAIL_TRANSACTIONAL_IDS.JIM_SHEA_TRANSACTION_ID
            .GSC_CONFIRMATION_MEDIATION_ONBOARDING_EMAIL_TO_PARTY;

        return { payload, transcationId };
      },
  },

  [`${MEDIATORS.FATEMEH_MASHOUF.user_id}`]: {
    //production
    email: MEDIATORS.FATEMEH_MASHOUF.email,
    MEDIATION_SCHEDULE_EMAIL_TO_PARTY: (data = {}) => {
      const payload = {
        name: data?.name || " ",
        mediatorName: data?.mediatorName || " ",
        caseTitle: data?.caseTitle || " ",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || " ",
        mediatorEmail: data?.mediatorEmail || " ",
        onboardingURL: data?.onboardingURL || " ",
        zoomLink: data?.zoom_link || " ",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.FATEEMAH_TRANSACTION_ID
          .MEDIATION_SCHEDULE_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },
  },

  [`${MEDIATORS.KATIE_BAIN.user_id}`]: {
    email: MEDIATORS.KATIE_BAIN.email,

    [`${LOOPS_EMAIL_TEMPLATE_NAME.HOURLY_INVOICE_REMINDER_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        totalDue: data?.totalDue || "",
        dueDate: data?.dueDate || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        mediationDateAndTime: data?.dateAndTime || "",
        paymentURL: data?.paymentURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .HOURLY_INVOICE_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.HOURLY_INVOICE_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        totalDue: data?.totalDue || "",
        dueDate: data?.dueDate || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        paymentURL: data?.paymentURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .HOURLY_INVOICE_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR}`]: (
      data
    ) => {
      const payload = {
        name: data?.name || "",
        dateAndTime: data?.dateAndTime || "",
        totalDue: data?.totalDue || "",
        dueDate: data?.dueDate || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        zoomLink: data?.zoom_link || "N/A",
        paymentURL: data?.paymentURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR;

      return { payload, transcationId, isInvoiceCreate: true };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.MEDIATION_SCHEDULE_EMAIL_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        onboardingURL: data?.onboardingURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .MEDIATION_MEETING_SCHEDULED;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.RESCHEDULED_EMAIL_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        oldDateAndTime: data?.oldDateAndTime || "",
        newDateAndtime: data?.newDateAndtime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .CASE_RESCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.BRIEF_REMINDER_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || " ",
        caseTitle: data?.caseTitle || " ",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || " ",
        onboardingURL: data?.onboardingURL || " ",
        mediatorName: data?.mediatorName || " ",
        mediatorEmail: data?.mediatorEmail || " ",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .BRIEF_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR}`]:
      (data = {}) => {
        const payload = {
          name: data?.name || " ",
          caseTitle: data?.caseTitle || " ",
          caseNumber: data?.caseNumber || "N/A",
          dateAndTime: data?.dateAndTime || " ",
          onboardingURL: data?.onboardingURL || " ",
          mediatorName: data?.mediatorName || " ",
          mediatorEmail: data?.mediatorEmail || " ",
        };
        const transcationId =
          LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
            .ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR;

        return { payload, transcationId };
      },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_MEETING_SCHEDULED_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        dateAndTime: data?.dateAndTime || "",
        zoomURL: data?.zoomURL || "",
        caseNumber: data?.caseNumber || "N/A",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .ZOOM_MEETING_SCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_LINK_REMINDER_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        dateAndTime: data?.dateAndTime || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        zoomURL: data?.zoomURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .ZOOM_LINK_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.DELETE_EMAIL_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .DELETE_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.CANCEL_EMAIL_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorName: data?.mediatorName || " ",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .CANCEL_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },
  },

  [`${MEDIATORS.ADAM_WANNON.user_id}`]: {
    email: MEDIATORS.ADAM_WANNON.email,

    [`${LOOPS_EMAIL_TEMPLATE_NAME.HOURLY_INVOICE_REMINDER_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        totalDue: data?.totalDue || "",
        dueDate: data?.dueDate || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        mediationDateAndTime: data?.dateAndTime || "",
        paymentURL: data?.paymentURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .HOURLY_INVOICE_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.HOURLY_INVOICE_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        totalDue: data?.totalDue || "",
        dueDate: data?.dueDate || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        paymentURL: data?.paymentURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .HOURLY_INVOICE_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR}`]: (
      data
    ) => {
      const payload = {
        name: data?.name || "",
        dateAndTime: data?.dateAndTime || "",
        totalDue: data?.totalDue || "",
        dueDate: data?.dueDate || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        zoomLink: data?.zoom_link || "N/A",
        paymentURL: data?.paymentURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transactionalId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .NEW_INVOICE_TO_PARTY_BY_CUSTOM_MEDIATOR;

      return { payload, transactionalId, isInvoiceCreate: true };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.MEDIATION_SCHEDULE_EMAIL_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        onboardingURL: data?.onboardingURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .MEDIATION_MEETING_SCHEDULED;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.RESCHEDULED_EMAIL_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        oldDateAndTime: data?.oldDateAndTime || "",
        newDateAndtime: data?.newDateAndtime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .CASE_RESCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.BRIEF_REMINDER_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || " ",
        caseTitle: data?.caseTitle || " ",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || " ",
        onboardingURL: data?.onboardingURL || " ",
        mediatorName: data?.mediatorName || " ",
        mediatorEmail: data?.mediatorEmail || " ",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .BRIEF_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR}`]:
      (data = {}) => {
        const payload = {
          name: data?.name || " ",
          caseTitle: data?.caseTitle || " ",
          caseNumber: data?.caseNumber || "N/A",
          dateAndTime: data?.dateAndTime || " ",
          onboardingURL: data?.onboardingURL || " ",
          mediatorName: data?.mediatorName || " ",
          mediatorEmail: data?.mediatorEmail || " ",
        };
        const transcationId =
          LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
            .ONBOARDING_REMINDER_TO_PARTY_CUSTOM_MEDIATOR;

        return { payload, transcationId };
      },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_MEETING_SCHEDULED_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        dateAndTime: data?.dateAndTime || "",
        zoomURL: data?.zoomURL || "",
        caseNumber: data?.caseNumber || "N/A",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .ZOOM_MEETING_SCHEDULED_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.ZOOM_LINK_REMINDER_TO_PARTY}`]: (
      data = {}
    ) => {
      const payload = {
        name: data?.name || "",
        dateAndTime: data?.dateAndTime || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        zoomURL: data?.zoomURL || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .ZOOM_LINK_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.DELETE_EMAIL_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorName: data?.mediatorName || "",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .DELETE_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },

    [`${LOOPS_EMAIL_TEMPLATE_NAME.CANCEL_EMAIL_TO_PARTY}`]: (data = {}) => {
      const payload = {
        name: data?.name || "",
        caseTitle: data?.caseTitle || "",
        caseNumber: data?.caseNumber || "N/A",
        dateAndTime: data?.dateAndTime || "",
        mediatorName: data?.mediatorName || " ",
        mediatorEmail: data?.mediatorEmail || "",
      };
      const transcationId =
        LOOPS_EMAIL_TRANSACTIONAL_IDS.KATIE_BAIN_LOOPS_EMAIL_TRANSACTION_ID
          .CANCEL_EMAIL_TO_PARTY;

      return { payload, transcationId };
    },
  },
};

module.exports = {
  LOOPS_EMAIL_TRANSACTIONAL_IDS,
  CUSTOM_MEDIATORS_EMAILS,
  LOOPS_EMAIL_TEMPLATE_NAME,
};
