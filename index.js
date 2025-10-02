const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// Simple in-memory storage (replace with MongoDB/Mongoose in a production app)
const users = {};
const userLogs = {};

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Helper function to generate a 24-char hex ID (mock MongoDB _id)
function generateId() {
  const characters = "0123456789abcdef";
  let id = "";
  do {
    id = "";
    for (let i = 0; i < 24; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      id += characters[randomIndex];
    }
  } while (users.hasOwnProperty(id));
  return id;
}

// 2 & 3. POST /api/users - Create New User
app.post("/api/users", (req, res) => {
  const { username } = req.body;

  // Check if the username already exists
  const existingUser = Object.values(users).find(
    (user) => user.username === username
  );

  if (existingUser) {
    return res.json(existingUser);
  }

  const userId = generateId();
  const newUser = { username: username, _id: userId };
  users[userId] = newUser;
  userLogs[userId] = []; // Initialize log array for the new user

  res.json(newUser);
});

// 4, 5, & 6. GET /api/users - Get All Users
app.get("/api/users", (req, res) => {
  // Returns an array of user objects with username and _id
  res.json(Object.values(users));
});

// 7 & 8. POST /api/users/:_id/exercises - Add Exercise
app.post("/api/users/:_id/exercises", (req, res) => {
  const _id = req.params._id;
  const { description, duration, date } = req.body;

  const user = users[_id];

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Handle date: use provided date or current date, then format with toDateString()
  const newDate = date ? new Date(date) : new Date();
  const dateString = newDate.toDateString();

  const newExercise = {
    description: String(description),
    duration: parseInt(duration),
    date: dateString,
  };

  // Add the exercise to the user's log
  userLogs[_id].push(newExercise);

  // Construct the required response (user object + new exercise details)
  const responseObj = {
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date,
    _id: user._id,
  };

  res.json(responseObj);
});

// 9-16. GET /api/users/:_id/logs - Get Exercise Log
app.get("/api/users/:_id/logs", (req, res) => {
  const _id = req.params._id;
  const user = users[_id];

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let log = userLogs[_id] || []; // Start with the full log
  const { from, to, limit } = req.query;

  // 16. Filter by 'from' date
  if (from) {
    // Dates are expected in 'yyyy-mm-dd' format
    const fromDate = new Date(from);
    log = log.filter((exercise) => {
      const logDate = new Date(exercise.date);
      // Compare the time values
      return logDate.getTime() >= fromDate.getTime();
    });
  }

  // 16. Filter by 'to' date
  if (to) {
    const toDate = new Date(to);
    log = log.filter((exercise) => {
      const logDate = new Date(exercise.date);
      // Compare the time values
      return logDate.getTime() <= toDate.getTime();
    });
  }

  // 16. Apply 'limit'
  if (limit) {
    const limitInt = parseInt(limit);
    if (!isNaN(limitInt) && limitInt > 0) {
      log = log.slice(0, limitInt);
    }
  }

  // 10, 11, 12, 13, 14, 15. Return the final log object
  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date, // already in toDateString format
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});