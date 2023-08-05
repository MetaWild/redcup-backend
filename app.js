const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const dotenvExpand = require("dotenv-expand");

const myLocalEnv = dotenv.config({ path: ".env.local" });
dotenvExpand.expand(myLocalEnv);

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const { db } = require("./database");
const cronJobs = require("./cron-jobs");
const PORT = process.env.PORT || 5000;

const usersRoutes = require("./routes/users-route");
const eventsRoutes = require("./routes/events-route");
const HttpError = require("./models/http-error");

const app = express();
app.use(
  cors({
    origin: [
      "https://whatsthemove.us",
      "http://localhost:3000",
      "https://checkout.stripe.com",
      "https://dashboard.stripe.com",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200,
  })
);

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Add the authenticate middleware here
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/Bearer (.*)/);

  if (!match) {
    res.status(401).end();
    return;
  }

  const token = match[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).end();
  }
}

app.use(authenticate);

app.use("/api/users", usersRoutes);
app.use("/api/events", eventsRoutes);

app.use((req, res, next) => {
  throw new HttpError("Could not find this route");
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
