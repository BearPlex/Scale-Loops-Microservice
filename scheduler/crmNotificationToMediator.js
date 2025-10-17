const supabase = require("../config/supabaseClient");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const { loopsHeader, loopsUrl } = require("../services/supabaseController");
const { LOOPS_EMAIL_TRANSACTIONAL_IDS } = require("../constants/emailConstant");
const axios = require("axios");
const advancedFormat = require("dayjs/plugin/advancedFormat"); // ← ADD THIS

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(advancedFormat);

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDaysOverdue(executionDate, today) {
  const dueDate = dayjs.utc(executionDate).startOf('day');
  const todayStart = today.startOf('day');
  return todayStart.diff(dueDate, 'day');
}

function formatDate(date, includeDayName = true) {
  const d = dayjs.utc(date);
  if (includeDayName) {
    return d.format('ddd, MMM Do');
  }
  return d.format('MMM Do');
}

function analyzeClientTasks(clientData, today, endOfWeek) {
  const client = clientData.client;
  const tasks = clientData.tasks || [];

  // console.log("dataaaaa", { client, tasks })

  if (!tasks.length || !client) {
    return null;
  }

  // Sort all tasks by execution date first (oldest to newest)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a?.execution_date || !b?.execution_date) return 0;
    return dayjs.utc(a.execution_date).diff(dayjs.utc(b.execution_date));
  });

  const overdueTasks = [];
  const upcomingTasks = [];

  for (const task of sortedTasks) {
    if (!task.execution_date) continue;

    // Only process tasks where is_assigned = false
    if (task.is_assigned === true) continue;

    const executionDate = dayjs.utc(task.execution_date);

    // Simple logic: overdue = before today, upcoming = today or after
    if (executionDate && executionDate.isBefore(today, 'day')) {
      overdueTasks.push({
        ...task,
        daysOverdue: getDaysOverdue(task.execution_date, today),
      });
    } else if (executionDate && executionDate.isSameOrAfter(today, 'day')) {
      upcomingTasks.push(task);
    }
  }

  // For overdue: get the OLDEST (most overdue) task
  const oldestOverdue = overdueTasks.length > 0 ? overdueTasks[0] : null;

  // For upcoming: get the NEAREST upcoming task (closest to today)
  const nearestUpcoming = upcomingTasks.length > 0 ? upcomingTasks[0] : null;

  if (!oldestOverdue && !nearestUpcoming) {
    return null;
  }

  return {
    client: {
      name: client.name || 'Unknown',
      email: client.email || '',
      designation: client.designation || client.case_designation || client.type || 'Contact',
      case_name: client.case_name || '',
      phone: client.phone_number || '',
      rating: client.rating || 0,
    },
    latestOverdue: oldestOverdue,
    earliestUpcoming: nearestUpcoming,
  };
}

function generateOverdueTasksHtml(clientsWithTasks) {
  const overdueClients = clientsWithTasks.filter(c => c.latestOverdue);

  if (overdueClients.length === 0) {
    return '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6b7280; font-size: 14px; border: none; background-color: white;">No overdue tasks</td></tr>';
  }

  // Sort overdue clients by their task execution date (most recent overdue first)
  const sortedOverdueClients = overdueClients.sort((a, b) => {
    const dateA = dayjs.utc(a.latestOverdue.execution_date);
    const dateB = dayjs.utc(b.latestOverdue.execution_date);
    return dateB.diff(dateA); // Most recent first
  });

  return sortedOverdueClients.map((clientData, index) => {
    const task = clientData.latestOverdue;
    const client = clientData.client;
    const isEven = index % 2 === 1;
    const backgroundColor = isEven ? '#fef2f2' : 'white';

    return `<tr style="background-color: ${backgroundColor};"><td class="task-title" style="padding: 18px 20px;">${escapeHtml(task.title) || 'Untitled Task'}</td><td style="padding: 18px 20px;"><div class="contact-name">${escapeHtml(client.name)}</div><div class="contact-email">${escapeHtml(client.email)}</div><div class="contact-role">${escapeHtml(client.designation)}</div></td><td style="padding: 18px 20px; text-align: left; vertical-align: middle;"><div style="display: flex; align-items: center;"><img src="https://afudlphkrgumumsmfeor.supabase.co/storage/v1/object/public/onboarding_form_data/assets/alert.png" alt="⚠️" style="width: 20px; height: 20px; margin-right: 12px; flex-shrink: 0;" /><div><div style="color: #dc2626; font-size: 15px; font-weight: 500; margin-bottom: 8px;">Due: ${formatDate(task.execution_date, false)}</div><div style="color: #dc2626; font-size: 14px; font-weight: 400;">${task.daysOverdue} day${task.daysOverdue !== 1 ? 's' : ''} overdue</div></div></div></td></tr>`;
  })?.slice(0, 5)?.join('');
}

function generateUpcomingTasksHtml(clientsWithTasks) {
  const upcomingClients = clientsWithTasks.filter(c => c.earliestUpcoming);

  if (upcomingClients.length === 0) {
    return '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6b7280; font-size: 14px; border: none; background-color: white;">No upcoming tasks</td></tr>';
  }

  // Sort upcoming clients by their task execution date (most recent/nearest first)
  const sortedUpcomingClients = upcomingClients.sort((a, b) => {
    const dateA = dayjs.utc(a.earliestUpcoming.execution_date);
    const dateB = dayjs.utc(b.earliestUpcoming.execution_date);
    return dateA.diff(dateB); // Nearest upcoming first
  });

  return sortedUpcomingClients.map((clientData, index) => {
    const task = clientData.earliestUpcoming;
    const client = clientData.client;
    const isEven = index % 2 === 1;
    const backgroundColor = isEven ? '#eff6ff' : 'white';

    return `<tr style="background-color: ${backgroundColor};"><td class="task-title" style="padding: 18px 20px;">${escapeHtml(task.title) || 'Untitled Task'}</td><td style="padding: 18px 20px;"><div class="contact-name">${escapeHtml(client.name)}</div><div class="contact-email">${escapeHtml(client.email)}</div><div class="contact-role">${escapeHtml(client.designation)}</div></td><td style="padding: 18px 20px; text-align: left; vertical-align: middle;"><div style="display: flex; align-items: center; justify-content: flex-start;"><img src="https://afudlphkrgumumsmfeor.supabase.co/storage/v1/object/public/onboarding_form_data/assets/calendar-icon-black-border.png" alt="📅" style="width: 18px; height: 18px; margin-right: 8px; flex-shrink: 0; vertical-align: middle;" /><span style="color: #111827; font-size: 14px; font-weight: 400; line-height: 1.4;">Due: ${formatDate(task.execution_date)}</span></div></td></tr>`;
  })?.slice(0, 5)?.join('');
}

async function sendCrmNotificationToMediator(userId = null) {
  const startTime = dayjs.utc();
  console.log(`[CRM_NOTIFICATION] Job started at ${startTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);

  try {
    const { data, error } = await supabase.rpc(
      "crm_notification_to_mediator",
      userId ? { user_id_input: userId } : { user_id_input: null }
    );
    // console.log("data", data)

    if (error) {
      console.error("[CRM_NOTIFICATION] Error fetching data:", error);
      throw error;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("[CRM_NOTIFICATION] No mediators found or empty response from RPC");
      return;
    }

    console.log(`[CRM_NOTIFICATION] Found ${data.length} mediators to process`);

    const today = dayjs.utc().startOf('day');
    const endOfWeek = today.add(7, 'day');

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Process each mediator
    for (const mediatorData of data) {
      const mediator = mediatorData.mediator;

      if (!mediator || !mediator.email) {
        console.warn("[CRM_NOTIFICATION] Skipping mediator without email");
        skippedCount++;
        continue;
      }

      const mediatorName = `${mediator.first_name || ''} ${mediator.last_name || ''}`.trim() || 'Mediator';
      const clients = mediatorData.clients || [];
      console.log("clients", { clients })

      console.log(`[CRM_NOTIFICATION] Processing ${mediatorName} (${mediator.email}) with ${clients.length} clients`);

      // Analyze tasks for each client
      const analyzedClients = [];
      for (const clientData of clients) {
        const analyzed = analyzeClientTasks(clientData, today, endOfWeek);
        if (analyzed) {
          analyzedClients.push(analyzed);
        }
      }

      // console.log("client", clients?.find((x) => x.client?.email === "hiqbal@bearplex.com"))
      // console.log('////////////////////////////////////////////////')
      // console.log("analyzedClients", analyzedClients, analyzedClients?.find((x) => x.client?.email === "hiqbal@bearplex.comm"))


      console.log(`[CRM_NOTIFICATION] Found ${analyzedClients.length} clients with relevant tasks for ${mediatorName}`);

      // If no clients have relevant tasks, skip this mediator
      if (analyzedClients.length === 0) {
        console.log(`[CRM_NOTIFICATION] No relevant tasks for ${mediatorName}, skipping email`);
        skippedCount++;
        continue;
      }

      // Count tasks
      const overdueCount = analyzedClients.filter(c => c.latestOverdue).length;
      const upcomingCount = analyzedClients.filter(c => c.earliestUpcoming).length;

      // Generate HTML for email
      const overdueTasksHtml = generateOverdueTasksHtml(analyzedClients);
      const upcomingTasksHtml = generateUpcomingTasksHtml(analyzedClients);

      // console.log("overdueTasksHtml", overdueTasksHtml)
      // console.log("upcomingTasksHtml", upcomingTasksHtml)

      // Prepare email data
      const emailData = {
        transactionalId: LOOPS_EMAIL_TRANSACTIONAL_IDS.CRM_NOTIFICATION_TO_MEDIATOR,
        email: mediator.email,
        // email: "hiqbal@bearplex.com",
        // email: "dev@scalemediation.com",
        // email: "adam@scalemediation.com",

        dataVariables: {
          mediatorName,
          upcomingTasksHtml,
          overdueTasksHtml,
          // clientName: "hello",
        },
      };

      try {
        const response = await axios.post(loopsUrl, emailData, {
          headers: loopsHeader,
        });

        console.log(
          `[CRM_NOTIFICATION] ✅ Email sent to ${mediator.email} - ` +
          `Status: ${response.status} - Overdue: ${overdueCount}, Upcoming: ${upcomingCount}`
        );
        successCount++;
      } catch (err) {
        console.error(
          `[CRM_NOTIFICATION] ❌ Failed to send to ${mediator.email}:`,
          err?.response?.data || err.message
        );
        failureCount++;
      }
    }

    const endTime = dayjs.utc();
    const duration = endTime.diff(startTime, 'second', true).toFixed(2);

    console.log(`[CRM_NOTIFICATION] ===== JOB COMPLETED =====`);
    console.log(`[CRM_NOTIFICATION] Job completed at ${endTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);
    console.log(`[CRM_NOTIFICATION] Duration: ${duration}s`);
    console.log(`[CRM_NOTIFICATION] Total mediators: ${data.length}`);
    console.log(`[CRM_NOTIFICATION] Emails sent: ${successCount}`);
    console.log(`[CRM_NOTIFICATION] Failed: ${failureCount}`);
    console.log(`[CRM_NOTIFICATION] Skipped (no tasks): ${skippedCount}`);

  } catch (err) {
    console.error(
      `[CRM_NOTIFICATION] Error in CRM notification job:`,
      err?.message || err
    );
    throw err;
  }
}

/**
 * Main function that runs on Mondays to send CRM notifications
 * @returns {Promise<boolean>}
 */
async function crmNotificationToMediator() {
  const today = dayjs.utc().startOf("day");
  const isMonday = today.day() === 1;

  console.log(`[CRM_NOTIFICATION] Is today Monday? ${isMonday} - Date: ${today.format('YYYY-MM-DD')}`);

  if (!isMonday) {
    console.log("[CRM_NOTIFICATION] Skipping - Not Monday");
    return true;
  }

  try {
    // await sendCrmNotificationToMediator("74b49fc0-5d92-4a04-a52a-7f25d4441e9c");
    await sendCrmNotificationToMediator();
    return true;
  } catch (err) {
    console.error(
      `[CRM_NOTIFICATION] Error while sending CRM notifications - Date: ${today.format('YYYY-MM-DD')}`,
      err
    );
    return false;
  }
}

// Uncomment to test locally
// crmNotificationToMediator();

module.exports = {
  crmNotificationToMediator,
};
