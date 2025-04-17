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
