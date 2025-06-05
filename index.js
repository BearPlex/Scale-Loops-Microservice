require("dotenv").config();
const express = require("express");
require("./jobs/enqueueDailyJobs");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("✅ Server is up and running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
