const { MEDIATORS } = require("./user.constant");




const LOOPS_EMAIL_TRANSACTIONAL_IDS = {
  HOURLY_INVOICE_TO_PARTY: "cm9ingbxa3b95hnsowyaveln1",
  HOURLY_INVOICE_REMINDER_TO_PARTY: "cmbt3hzaq22so0x0i0547g1ba",

  MEDIATION_MEETING_SCHEDULED: "clzv3neig0298t0ajzkzsu52m",
  MEDIATION_MEETING_SCHEDULED_ODR: "cm8wuuzcf7o7w1ls71to3k1gd",
  MEDIATION_MEETING_SCHEDULED_ODR_REVISED: "cma2mg7fr48ovz9n1yhf6n1o5",

  NEW_MEDIATOR_SESSION_TO_ODR_MEDIATOR: "cm8wwrz207k9j8adbg95fvd6v",
  NEW_MEDIATOR_SESSION_TO_MEDIATOR: "clzv3d8q702mx11zx99l85qdf",
  NEW_MEDIATOR_SESSION_TO_MEDIATOR_CUSTOM: "cmdfvwdc203mg130ioofckmc2",

  POST_ONBOARDING_EMAIL_TO_ODR_MEDIATOR: "cm8wxbays4mdffzmq6b7fat8o",
  POST_ONBOARDING_EMAIL_TO_MEDIATOR: "cm14vfywt03i7y84hy8c9eke1",

  NEW_INVOICE_FOR_ODR_MEDIATOR: "cm8wy05js7rz2vxpc64s50pyt",
  NEW_INVOICE_FOR_MEDIATOR: "clzvhm65300pan89xc1vr7ap5",



  ZOOM_MEETING_LINK_FOR_ODR_MEDIATOR: "cm8xfqu8a0epbdq5c7buaoz8c",
  ZOOM_MEETING_LINK_FOR_MEDIATOR: "cm0zmtwun02nlhvu1addu7z2q",

  ZOOM_MEETING_LINK_TO_CLIENT_FOR_ODR_MEDIATOR: "cm8xgge1j01zb59lxzl9kl2oq",
  ZOOM_MEETING_LINK_TO_CLIENT_FOR_MEDIATOR: "clztzevpa00sv1ubdto7pkda3",

  ZOOM_REMINDER_FOR_PARTIES_MEDIATOR: "cmcakm2mf07zsyl0iie3383oe",
  ZOOM_REMINDER_FOR_PARTIES_ODR_MEDIATOR: "cmcalmb5u6flezf0iu0vt0dzq",

  ZOOM_REMINDER_FOR_NON_ODR_MEDIATOR: "cmcbqeri02eqny40ibf57j22h",
  ZOOM_REMINDER_FOR_ODR_MEDIATOR: "cmcbqlwra2gb2y40ih01qulgz",

  PAYMENT_INVOICE_REMINDER_FOR_ODR_MEDIATOR: "cm8xo2u1005rb1yeh385ccox9",
  PAYMENT_INVOICE_REMINDER_FOR_MEDIATOR: "cm4a1erz6005x4ftd0j6l2rvv",

  POST_PAYMENT_INVOICE_FOR_ODR_MEDIATOR: "cm8xodcmx06wl5hmwt4xyehq4",
  POST_PAYMENT_INVOICE_FOR_MEDIATOR: "cm14v0xnl0357y84hwbtvrg8i",

  ONBOARDING_REMINDER_FOR_ODR_MEDIATOR: "cm8xomzku07pfdz2n5a3hvp5r",
  ONBOARDING_REMINDER_FOR_MEDIATOR: "clzu5zwwu0006x4avb8b86g2w",

  BRIEF_REMINDER_TO_PARTY: "cm1phuaxe004g2wx8qtwg9167",

  RESCHEDULED_FOR_MEDIATOR: "cm6qhtakt001e122vhqdqsocm",
  RESCHEDULED_FOR_ODR_MEDIATOR: "cm9798x9g0k4976j06xtsf1c1",

  CASE_DELETE_FOR_ODR_MEDIATOR: "cmbgfz9ns4g1s280i73v0ynbm",
  CASE_DELETE_FOR_MEDIATOR: "cmbgfnv9325pnzk0irlc05iiv",

  CASE_CANCEL_FOR_ODR_MEDIATOR: "cmg0w92rv4uauy90iclldfa10",
  CASE_CANCEL_FOR_MEDIATOR: "cmdfvsori04ubxi0i0ja7d2uk",

  WEEKLY_RECAP_FOR_MEDIATOR: "cmae21luk8123lffztydy3v37",
  CRM_NOTIFICATION_TO_MEDIATOR: "cmgl0fum9jgg1200i0dhex679",
  CASE_OUTCOME_REPORT_REMINDER: "cmgt8bpgvedcw390iq0egp1n7",

  ARI_LOOPS_EMAIL_TRANSACTION_ID: {
    MEDIATION_MEETING_SCHEDULED: "cmdfwgaz709mbye0iquqid8c5",
    ONBOARDING_REMINDER_TO_PARTY: "cmdfwg2i209ud170i6x13yem6",
    BRIEF_REMINDER_TO_PARTY: "cmdfwy7ip0f4oye0iofz66hvo",
    ZOOM_MEETING_SCHEDULED_TO_PARTY: "cmdfwzv9d00sbxr0i8dwampz4",
    MANUAL_HOURLY_INOICE_TO_PARTY: "cmdgma5j60ibn120icaif0n00",
    CASE_RESCHEDULED_TO_PARTY: "cmdfx14yf012q040ijn4lcz74",
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS_TO_PARTY:
      "cmdipouu70ky43e0ifszcvyqd",
    ZOOM_LINK_REMINDER_TO_PARTY: "cmdh6sakg5qjv120ippnvpmym",
    DELETE_EMAIL_TO_PARTY: "cmdiz4g8f0uaj1e0iike6hnwk",
    CANCEL_EMAIL_TO_PARTY: "cmg0we0ml51uqwi0h2b347q9q",
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

const CUSTOM_MEDIATORS_EMAILS = {
  [`${MEDIATORS.SAAD_QA.user_id}`]: {
    email: MEDIATORS.SAAD_QA.email,
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS: (data) => {
      const payload = {
        name: data?.name,
        mediatorName: data?.mediatorName,
        dateAndTime: data?.dateAndTime,
        slotType: data?.slotType,
        time: data?.time,
        mediatorEmail: data?.mediatorEmail,
      };
      const transcationId = "cmagxjlwk0uswqlzbkdeveyd9";

      return { payload, transcationId, isInvoiceCreate: false };
    },
    ZOOM_LINK_SEND: (data) => {
      const payload = {
        name: data?.name,
        dateAndTime: data?.dateAndTime,
        zoomURL: data?.zoomURL,
        caseNumber: data?.caseNumber || "N/A",
        caseTitle: data?.caseTitle,
        mediatorName: data?.mediatorName,
        mediatorEmail: data?.mediatorEmail,
      };
      const transcationId = "cmagy14tc000kwkby4iqt7ev9";

      return { payload, transcationId };
    },
  },

  [`${MEDIATORS.MATTHEW_PROUDFOOT.user_id}`]: {
    email: MEDIATORS.MATTHEW_PROUDFOOT.email,
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS: (data) => {
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
    ZOOM_LINK_SEND: (data) => {
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
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS: (data) => {
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

    MEDIATION_SCHEDULE_EMAIL_TO_PARTY: (data = {}) => {
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

    ZOOM_MEETING_SCHEDULED_TO_PARTY: (data = {}) => {
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

    ONBOARDING_REMINDER_TO_PARTY: (data = {}) => {
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
          .ONBOARDING_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    BRIEF_REMINDER_TO_PARTY: (data = {}) => {
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

    ZOOM_LINK_REMINDER_TO_PARTY: (data = {}) => {
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

    RESCHEDULED_EMAIL_TO_PARTY: (data = {}) => {
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

    MANUAL_HOURLY_INOICE: (data = {}) => {
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
          .MANUAL_HOURLY_INOICE_TO_PARTY;

      return { payload, transcationId };
    },

    DELETE_EMAIL_TO_PARTY: (data = {}) => {
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

    CANCEL_EMAIL_TO_PARTY: (data = {}) => {
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
    BRIEF_REMINDER_TO_PARTY: (data = {}) => {
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

    GSC_CONFIRMATION_MEDIATION_ONBOARDING_EMAIL_TO_PARTY: (data = {}) => {
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

  [`${MEDIATORS.HAMAD_PERVAIZ.user_id}`]: {
    email: MEDIATORS.HAMAD_PERVAIZ.email,
    INVOICE_CONFIRMATION_AND_SESSION_DETAILS: (data) => {
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

    MEDIATION_SCHEDULE_EMAIL_TO_PARTY: (data = {}) => {
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

    ZOOM_MEETING_SCHEDULED_TO_PARTY: (data = {}) => {
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

    ONBOARDING_REMINDER_TO_PARTY: (data = {}) => {
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
          .ONBOARDING_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    BRIEF_REMINDER_TO_PARTY: (data = {}) => {
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
        LOOPS_EMAIL_TRANSACTIONAL_IDS.ARI_LOOPS_EMAIL_TRANSACTION_ID
          .BRIEF_REMINDER_TO_PARTY;

      return { payload, transcationId };
    },

    ZOOM_LINK_REMINDER_TO_PARTY: (data = {}) => {
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

    RESCHEDULED_EMAIL_TO_PARTY: (data = {}) => {
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

    MANUAL_HOURLY_INOICE: (data = {}) => {
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
          .MANUAL_HOURLY_INOICE_TO_PARTY;

      return { payload, transcationId };
    },

    DELETE_EMAIL_TO_PARTY: (data = {}) => {
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
  },

  [`${MEDIATORS.HAIDER_IQBAL.user_id}`]: {
    //staging
    email: MEDIATORS.HAIDER_IQBAL.email,
    BRIEF_REMINDER_TO_PARTY: (data = {}) => {
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

  [`${MEDIATORS.ADAM_WANNON.user_id}`]: {
    //production
    email: MEDIATORS.ADAM_WANNON.email,
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

  [`${MEDIATORS.ADAM_WANNON_STAGING.user_id}`]: {
    //staging
    email: MEDIATORS.ADAM_WANNON_STAGING.email,
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
};

module.exports = {
  LOOPS_EMAIL_TRANSACTIONAL_IDS,
  CUSTOM_MEDIATORS_EMAILS,
};
