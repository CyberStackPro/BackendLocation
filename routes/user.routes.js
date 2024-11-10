const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const geoip = require("geoip-lite");
const useragent = require("express-useragent");
const User = require("../models/User");
const requestIp = require("request-ip");

const app = express();

// Registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Get location and device info
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
          deviceInfo: {
            browser: locationAndDeviceInfo.deviceInfo.browser,
            os: locationAndDeviceInfo.deviceInfo.os,
            platform: locationAndDeviceInfo.deviceInfo.platform,
          },
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

// Login endpoint
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
        deviceInfo: {
          browser: locationAndDeviceInfo.deviceInfo.browser,
          os: locationAndDeviceInfo.deviceInfo.os,
          platform: locationAndDeviceInfo.deviceInfo.platform,
        },
        success: false,
      });
      await user.save();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update user location and info
    user.location = locationAndDeviceInfo.location;
    user.deviceInfo = locationAndDeviceInfo.deviceInfo;
    user.networkInfo = locationAndDeviceInfo.networkInfo;
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      location: locationAndDeviceInfo.location.current,
      ip: locationAndDeviceInfo.networkInfo.ip,
      deviceInfo: {
        browser: locationAndDeviceInfo.deviceInfo.browser,
        os: locationAndDeviceInfo.deviceInfo.os,
        platform: locationAndDeviceInfo.deviceInfo.platform,
      },
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

exports = app;
