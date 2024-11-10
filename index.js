const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const useragent = require("express-useragent");
const requestIp = require("request-ip");
const User = require("./models/User");
const getLocationAndDeviceInfo = require("./middleawre/getLocation");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const corsOptions = {
  origin: "https://locationdetect.onrender.com", // Frontend URL
  // origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(useragent.express());
app.use(requestIp.mw());

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost/locationaware_db",
  {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 60000, // Increase to 60 seconds
    socketTimeoutMS: 60000, // Increase to 60 seconds
    connectTimeoutMS: 60000, // Add connection timeout
    // Add these additional options
    maxPoolSize: 10,
    retryWrites: true,
    w: "majority",
  }
);

// Add connection error handling
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB successfully");
});

// Registration and Login endpoints
app.post("/api/register", async (req, res) => {
  const { username, password, email } = req.body;
  try {
    // Add validation
    if (!username || !password || !email) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists before saving
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    const locationAndDeviceInfo = getLocationAndDeviceInfo(req);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      email,
      ...locationAndDeviceInfo,
      lastLogin: new Date(),
      loginHistory: [
        {
          timestamp: new Date(),
          location: locationAndDeviceInfo.location.current,
          ip: locationAndDeviceInfo.networkInfo.ip,
          deviceInfo: locationAndDeviceInfo.deviceInfo,
          success: true,
        },
      ],
    });

    await user.save();
    res.status(201).json({
      message: "User registered successfully",
      locationInfo: locationAndDeviceInfo,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed. Please try again later.",
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const locationAndDeviceInfo = getLocationAndDeviceInfo(req);

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      user.loginHistory.push({
        timestamp: new Date(),
        location: locationAndDeviceInfo.location.current,
        ip: locationAndDeviceInfo.networkInfo.ip,
        deviceInfo: locationAndDeviceInfo.deviceInfo,
        success: false,
      });
      await user.save();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.location = locationAndDeviceInfo.location;
    user.deviceInfo = locationAndDeviceInfo.deviceInfo;
    user.networkInfo = locationAndDeviceInfo.networkInfo;
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      location: locationAndDeviceInfo.location.current,
      ip: locationAndDeviceInfo.networkInfo.ip,
      deviceInfo: locationAndDeviceInfo.deviceInfo,
      success: true,
    });

    await user.save();
    res.json({
      message: "Login successful",
      user,
      locationInfo: locationAndDeviceInfo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export app for modular imports or testing
module.exports = app;

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
