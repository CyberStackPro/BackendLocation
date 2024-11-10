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
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(useragent.express());
app.use(requestIp.mw());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost/locationaware_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

// Registration and Login endpoints
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
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
    res.status(500).json({ error: error.message });
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
