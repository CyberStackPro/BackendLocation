// app.js
const express = require("express");
const useragent = require("express-useragent");
const { locationMiddleware, limiter } = require("./middleawre/getLocation");

const app = express();

app.use(express.json());
app.use(useragent.express());
app.use(limiter);

// Use location middleware globally or on specific routes
app.use(locationMiddleware);

// Example route
app.post("/register", registerUser);
