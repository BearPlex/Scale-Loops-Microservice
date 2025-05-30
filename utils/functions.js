const moment = require("moment");
const momentTimezone = require("moment-timezone");
const executeQuery = require("../config/supabase.helpers");
const supabase = require("../config/supabaseClient");
const axios = require("axios");

function convertToTimezone(date, timezone) {
  return momentTimezone(date).tz(timezone);
}

function notifyTeamAndUser(user, message) {
  console.log(`Notification To ${user}: ${message}`);
}

function convertCentsToDollars(cents = 0) {
  return (cents / 100).toFixed(2);
}

function convertDollarToCents(dollars = 0) {
  return dollars * 100;
}

function formatAmount(amount) {
  return amount
    ? `$${Number(amount)
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
    : "$0";
}

const convertToAMPM = (timeString) => {
  const dateTimeString = moment().format("YYYY-MM-DD") + " " + timeString;
  const utcTime = moment.utc(dateTimeString, "YYYY-MM-DD HH:mm:ss");
  return utcTime.format("h:mm A");
};

// const getNextWorkingDay = (date, interval = 3) => {
//   if (!date) return null;

//   let nextDate = date.clone();
//   let workingDaysAdded = 0;

//   while (workingDaysAdded < interval) {
//     nextDate.add(1, "day");
//     const day = nextDate.isoWeekday();

//     if (day >= 1 && day <= 5) {
//       workingDaysAdded++;
//     }
//   }

//   return nextDate;
// };

const getNextWorkingDay = (date, interval = 3, isSkipInterval = false) => {
  if (!date) return null;

  let nextDate = date.clone();
  if (!isSkipInterval) {
    nextDate.add(interval, "days");
  }

  const day = nextDate.isoWeekday();
  if (day === 6) {
    nextDate.add(2, "days");
  } else if (day === 7) {
    nextDate.add(1, "days");
  }

  return nextDate;
};

// const shiftToNextWorkingDay = (date) => {
//   if (!date) return null;

//   let nextDate = date.clone();
//   const day = nextDate.isoWeekday();
//   if (day === 6) {
//     nextDate.add(2, "days");
//   } else if (day === 7) {
//     nextDate.add(1, "days");
//   }

//   return nextDate;
// };

const shiftToNextWorkingDay = (date) => {
  if (!date) return null;

  let nextDate = date.clone();
  const day = nextDate.isoWeekday();

  if (day === 6) {
    nextDate.add(2, "days");
  } else if (day === 7) {
    nextDate.add(1, "days");
  }

  return nextDate;
};

const calculateReminderDates = (
  caseRegisterDate,
  mediationDate,
  remainderInterval = 3,
  type = "onBoarding",
  bookingConfirmationDate = null
) => {
  console.log("Payload", {
    caseRegisterDate,
    mediationDate,
    remainderInterval,
    type,
    bookingConfirmationDate,
  });
  const mediateDate = moment(mediationDate);
  if (type === "brief") {
    console.log(
      "00000000000000000000000000000",
      caseRegisterDate,
      mediationDate,
      remainderInterval,
      type,
      bookingConfirmationDate
    );
    let firstReminder = getNextWorkingDay(
      moment(mediateDate).subtract(remainderInterval, "days"),
      null,
      true
    );
    let secondReminder = getNextWorkingDay(
      moment(firstReminder).add(3, "days"),
      null,
      true
    );
    if (
      firstReminder.isSameOrBefore(caseRegisterDate) ||
      firstReminder.isSameOrAfter(mediateDate)
    ) {
      firstReminder = null;
    }
    if (
      secondReminder.isSameOrBefore(caseRegisterDate) ||
      secondReminder.isSameOrAfter(mediateDate)
    ) {
      secondReminder = null;
    }

    return {
      firstReminder,
      secondReminder,
      thirdReminder: null,
      fourthReminder: null,
    };
  } else if (type === "payment" && bookingConfirmationDate) {
    const confirmationDate = moment(bookingConfirmationDate);
    let firstReminder = getNextWorkingDay(
      moment(confirmationDate).add(remainderInterval, "days"),
      null,
      true
    );
    if (firstReminder.isSameOrAfter(mediateDate)) {
      firstReminder = null;
    }

    if (firstReminder === null) {
      return {
        firstReminder: null,
        secondReminder: null,
        thirdReminder: null,
        fourthReminder: null,
      };
    }

    let secondReminder = getNextWorkingDay(firstReminder, 3);
    if (secondReminder.isSameOrAfter(mediateDate)) {
      secondReminder = null;
    }
    let thirdReminder = secondReminder
      ? getNextWorkingDay(secondReminder, 3)
      : null;
    if (secondReminder && thirdReminder.isSameOrAfter(mediateDate)) {
      thirdReminder = null;
    }
    let fourthReminder = thirdReminder
      ? getNextWorkingDay(thirdReminder, 3)
      : null;
    if (thirdReminder && fourthReminder.isSameOrAfter(mediateDate)) {
      fourthReminder = null;
    }
    return {
      firstReminder,
      secondReminder,
      thirdReminder,
      fourthReminder,
    };
  }
  let firstReminder = getNextWorkingDay(caseRegisterDate, remainderInterval);
  let secondReminder = getNextWorkingDay(firstReminder, remainderInterval);
  let thirdReminder = getNextWorkingDay(secondReminder, remainderInterval);
  if (firstReminder.isSameOrAfter(mediationDate)) firstReminder = null;
  if (secondReminder.isSameOrAfter(mediationDate)) secondReminder = null;
  if (thirdReminder.isSameOrAfter(mediationDate)) thirdReminder = null;

  return { firstReminder, secondReminder, thirdReminder, fourthReminder: null };
};

const apiHandleUploadFile = async (
  docsFolder = "onboarding_form_data",
  file,
  location = "uploads"
) => {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.originalname}`;
  const imageUploadQuery = supabase.storage
    .from(docsFolder)
    .upload(`${location}/${fileName}`, file.buffer, {
      upsert: true,
      contentType: file.mimetype,
    });

  const uploadedDocsData = await executeQuery(imageUploadQuery);
  uploadedDocsData.data = {
    ...uploadedDocsData.data,
    url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${uploadedDocsData.data?.fullPath}`,
  };
  return uploadedDocsData;
};

async function createPaymentIntent(amount, connectedAccountId) {
  return await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    application_fee_amount: Math.round(amount * 0.08),
    transfer_data: {
      destination: connectedAccountId,
    },
  });
}

function generateICSFileForManual(caseDetail, mediatorDetails) {
  const [hours, minutes] = caseDetail?.case_schedule_time?.split(":");
  const title = caseDetail?.case_name;
  const url = caseDetail?.zoom_link;
  const location = url;
  const description = `Zoom Meeting Link: ${url}`;
  const startDateTime = `${caseDetail?.mediation_date} ${hours}:${minutes}`;
  const organizerName =
    mediatorDetails?.first_name + " " + mediatorDetails?.last_name;
  const organizerEmail = mediatorDetails?.email;

  const start =
    moment
      .tz(startDateTime, mediatorDetails?.timezone)
      .utc()
      .format("YYYYMMDDTHHmm00") + "Z";
  const end =
    moment
      .tz(startDateTime, mediatorDetails?.timezone)
      .add(caseDetail?.slot_type === "fullday" ? 6 : 3, "hours")
      .utc()
      .format("YYYYMMDDTHHmm00") + "Z";

  // Create ICS file content
  const icsFileContent = `
  BEGIN:VCALENDAR
  VERSION:2.0
  CALSCALE:GREGORIAN
  METHOD:PUBLISH
  BEGIN:VEVENT
  UID:${Date.now()}@yourdomain.com
  SUMMARY:${title}
  DESCRIPTION:${description}
  LOCATION:${location}
  URL:${url}
  DTSTART:${start}
  DTEND:${end}
  STATUS:CONFIRMED
  ATTACH;FMTTYPE=application/ics:${url}
  CONFERENCE;FEATURE=ZOOM;LABEL=Join Zoom Meeting:${url}
  ORGANIZER;CN="${organizerName}":MAILTO:${organizerEmail}
  END:VEVENT
  END:VCALENDAR
    `.trim();

  return icsFileContent;
}

async function fetchFileAsBase64(url, customFilename) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    // Extract the file type from the URL
    const contentType =
      response.headers["content-type"] || "application/octet-stream";
    // const filename = url.split("/").pop();
    const base64Data = Buffer.from(response.data).toString("base64");
    const fileExtension = contentType.split("/")[1] || "bin";

    const fullFilename = `${customFilename}.${fileExtension}`;

    return {
      filename: fullFilename,
      contentType,
      data: base64Data,
    };
  } catch (error) {
    console.error("Error fetching or converting the file:", error);
    // throw error;
    return null;
  }
}

const createDateFromTimeString = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes, seconds] = timeString.split(":").map(Number);
  const now = new Date();
  now?.setHours(hours, minutes, seconds, 0);
  return now;
};

const calculateStripeProcessingFee = (
  amount = 0,
  convertInCent = true,
  notAdd30Cent = false
) => {
  let fee = notAdd30Cent ? amount * 0.029 : amount * 0.029 + 0.3;
  fee = Math.floor(fee * 100) / 100;
  if (convertInCent) {
    return Math.floor(fee * 100);
  }
  return fee;
};

function getUTCDateTime(date, slotTime) {
  const utcDateTime = moment.utc(`${date} ${slotTime}`, "YYYY-MM-DD HH:mm:ss");
  return utcDateTime.toISOString();
}

async function fetchCalendarEvents(calendar, startDate, endDate, timezone) {
  let allEvents = [];
  let pageToken = null;

  do {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
      timeZone: timezone,
      pageToken: pageToken,
    });

    const events = response.data.items.map((event) => ({
      id: event.id,
      status: event.status,
      // htmlLink: event.htmlLink,
      summary: event.summary,
      // organizer: event.organizer,
      start: event.start,
      end: event.end,
      // attendees: event.attendees,
      // hangoutLink: event.hangoutLink,
      // reminders: event.reminders,
      eventType: event.transparency === "transparent" ? "free" : "busy",
      transparency: event.transparency || "opaque",
    }));

    allEvents = allEvents.concat(events);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allEvents;
}

const getCurrentTimeInTimezone = (timezone) => {
  return moment().tz(timezone);
};

const calculateBriefDays = (mediationDate, reminderDays, timezone) => {
  const today = getCurrentTimeInTimezone(timezone).startOf("day");
  const xDaysBeforeBriefMediationDate = moment(mediationDate)
    .utc()
    .subtract(reminderDays, "days");

  return xDaysBeforeBriefMediationDate.diff(today, "days");
};

function countValidReminders(reminders = {}) {
  return Object.values(reminders).reduce((count, reminder) => {
    return reminder !== null ? count + 1 : count;
  }, 0);
}

function convertCountingWordToDigit(countingWord) {
  const wordToDigitMap = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
  };

  return wordToDigitMap[countingWord] || null;
}

function sortCountingWords(words) {
  const wordOrderMap = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
  };

  return words.sort((a, b) => {
    return (wordOrderMap[a] || 0) - (wordOrderMap[b] || 0);
  });
}

function getNextValidReminder(reminders, currentReminderWord) {
  console.log("reminders", { reminders, currentReminderWord });
  if (!currentReminderWord || !reminders.hasOwnProperty(currentReminderWord)) {
    return null;
  }

  const keys = Object.keys(reminders);
  console.log("keys", sortCountingWords(keys));
  let foundCurrent = false;

  for (const key of sortCountingWords(keys)) {
    if (key === currentReminderWord) {
      foundCurrent = true;
      continue;
    }

    if (foundCurrent) {
      console.log("foundCurrent", foundCurrent, key, reminders[key]);
      return reminders?.[key] ? reminders?.[key] : null;
    }
  }

  return null;
}

const generateInvoiceUrlFrontend = (invoiceId, mediatorId) => {
  const baseUrl =
    process.env.FRONT_END_BASE_URL || "https://app.scalemediation.com";
  // console.log(
  //   "`${baseUrl}/invoice-link/${invoiceId}/${mediatorId}`",
  //   `${baseUrl}/invoice-link/${invoiceId}/${mediatorId}`
  // );
  return `${baseUrl}/invoice-link/${invoiceId}/${mediatorId}`;
};

function safeParseArray(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      const isCheckSingleFile = value?.includes("https://");
      return isCheckSingleFile ? [value] : [];
    }
  }
  return Array.isArray(value) ? value : [];
}

module.exports = {
  notifyTeamAndUser,
  convertCentsToDollars,
  convertDollarToCents,
  formatAmount,
  convertToAMPM,
  getNextWorkingDay,
  calculateReminderDates,
  shiftToNextWorkingDay,
  apiHandleUploadFile,
  generateICSFileForManual,
  fetchFileAsBase64,
  convertToTimezone,
  createDateFromTimeString,
  calculateStripeProcessingFee,
  getUTCDateTime,
  fetchCalendarEvents,
  getCurrentTimeInTimezone,
  calculateBriefDays,
  countValidReminders,
  convertCountingWordToDigit,
  getNextValidReminder,
  generateInvoiceUrlFrontend,
  safeParseArray,
};
