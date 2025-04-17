module.exports = function validateReminder(data) {
    if (!data.email || !data.subject || !data.message || !data.scheduledTime) {
      throw new Error('Missing required fields');
    }
  };
  