# Reminder Service

A backend service for scheduling and sending email reminders for onboarding processes in a mediation platform.

## Features

- Scheduled email reminders for onboarding forms
- BullMQ-based queue system for reliable job processing
- Admin dashboard for queue monitoring
- Support for multiple reminder types (first, second, third reminders)
- Tracking of sent reminders to prevent duplicates
- Integration with email service

## Technologies Used

- Node.js
- Express.js
- BullMQ (Redis-based queue)
- Bull Board (Queue monitoring dashboard)
- IORedis (Redis client)
- Moment.js (Date handling)
- Dotenv (Environment variables)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/reminder-service.git
   cd reminder-service

   Install dependencies:

bash
Copy
npm install
Create a .env file based on .env.example:

env
Copy
REDIS_URL=redis://localhost:6379
PORT=3000

# Add other required environment variables
Start the service:

bash
Copy
npm start
For development with auto-restart:

bash
Copy
npm run dev
Project Structure
Copy
reminder-service/
├── config/               # Configuration files
├── jobs/                # BullMQ worker definitions
│   └── reminderWorker.js # Main worker processing jobs
├── routes/              # API routes
│   └── reminder.js      # Reminder-related routes
├── scheduler/           # Scheduled job definitions
│   ├── dailyReminderCron.js # Daily reminder scheduler
│   └── onboardingFormReminder.js # Onboarding reminder logic
├── services/            # Business logic services
├── utils/               # Utility functions
├── index.js             # Main application entry point
└── README.md            # This file
API Endpoints
POST /reminders - Create a new reminder

GET /reminders - List all reminders

GET /admin/queues - Bull Board dashboard for queue monitoring

Queue System
The service uses BullMQ for processing reminders with:

A queue (reminderQueue) for processing reminder jobs

Workers that handle the actual sending of reminders

Scheduled jobs for recurring reminders

Monitoring
Access the queue dashboard at http://localhost:3000/admin/queues to monitor:

Active jobs

Failed jobs

Completed jobs

Worker status
