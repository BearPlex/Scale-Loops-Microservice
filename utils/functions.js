const moment = require("moment");
const momentTimezone = require("moment-timezone");

function convertToTimezone(date, timezone) {
  return momentTimezone(date).tz(timezone);
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
  // console.log("reminders", { reminders, currentReminderWord });
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

function generateCasesHtml(cases) {
  if (!Array.isArray(cases) || cases.length === 0) return "";

  return cases
    .map((c, index) => {
      const caseUrl = c.url ? escapeHtml(c.url) : "#";

      const partyRowsHtml = c.parties
        .map((p, partyIndex) => {
          if (partyIndex === 0) {
            return `
              <tr>
                <td rowspan="${
                  c.partyCount
                }" valign="top" align="left" style="padding-left:10px; padding-right:20px; width: 30%;">
                  <div class="case-title">
                    <a href="${caseUrl}" target="_blank" style="color:#027776; text-decoration:none; cursor: pointer;">
                      ${escapeHtml(c.caseTitle)}
                    </a>
                  </div>
                  <div class="case-meta">${escapeHtml(c.caseDate)}</div>
                </td>
                <td style="padding-top: 2px; padding-bottom: 2px;width: 13.5%; ">
                  <div class="party-name">${escapeHtml(p.partyName)}</div>
                  <div class="party-role">${escapeHtml(p.partyRole)}</div>
                </td>
                <td style="width: 17.33%;" align="center">${escapeHtml(
                  p.onboarding
                )}</td>
                <td style="width: 17.33%;" align="center">${escapeHtml(
                  p.payment
                )}</td>
                <td style="width: 21.83%;" align="center">${escapeHtml(
                  p.documents
                )}</td>
              </tr>
            `;
          } else {
            return `
              <tr>
                <td style="padding-top: 3px; padding-bottom: 3px;">
                  <div class="party-name">${escapeHtml(p.partyName)}</div>
                  <div class="party-role">${escapeHtml(p.partyRole)}</div>
                </td>
                <td align="center">${escapeHtml(p.onboarding)}</td>
                <td align="center">${escapeHtml(p.payment)}</td>
                <td align="center">${escapeHtml(p.documents)}</td>
              </tr>
            `;
          }
        })
        .join("");

      const dividerRow =
        index < cases.length - 1
          ? `
        <tr>
          <td colspan="5" style="padding-top:5px; padding-bottom:5px;">
            <div style="height:1px; background-color:#e5e7eb;"></div>
          </td>
        </tr>
      `
          : "";

      return partyRowsHtml + dividerRow;
    })
    .join("");
}

function escapeHtml(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateICSFileForManual(caseDetail, mediatorDetails) {
  const [hours, minutes] = caseDetail?.case_schedule_time?.split(":");
  const title = getFullCaseName(
    caseDetail?.case_name,
    caseDetail?.additional_case_names
  );
  const url = caseDetail?.zoom_link;
  const location = url;
  const description = `Zoom Meeting Link: ${url}`;
  const startDateTime = `${caseDetail?.mediation_date} ${hours}:${minutes}`;
  const organizerName =
    mediatorDetails?.first_name + " " + mediatorDetails?.last_name;
  const organizerEmail = mediatorDetails?.email;

  // Convert start and end times to UTC format
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

function getFullCaseName(caseName = "", additionalCaseNames = []) {
  if (additionalCaseNames?.length <= 0) {
    return caseName;
  }

  return `${caseName}${
    additionalCaseNames?.length > 0
      ? `, ${additionalCaseNames?.join(", ")}`
      : " "
  }`;
}

module.exports = {
  convertCentsToDollars,
  convertDollarToCents,
  formatAmount,
  convertToAMPM,
  getNextWorkingDay,
  calculateReminderDates,
  shiftToNextWorkingDay,
  convertToTimezone,
  getCurrentTimeInTimezone,
  calculateBriefDays,
  countValidReminders,
  convertCountingWordToDigit,
  getNextValidReminder,
  generateInvoiceUrlFrontend,
  safeParseArray,
  generateCasesHtml,
  generateICSFileForManual,
  getFullCaseName,
};
