const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const useragent = require("express-useragent");
const requestIp = require("request-ip");
const getLocationAndDeviceInfo = require("./middleawre/getLocation");
const User = require("./models/User");

const dotenv = require("dotenv");
const connectToMongoDb = require("./config/db");

dotenv.config();

const app = express();

const corsOptions = {
  origin: ["https://locationdetect.onrender.com", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Dynamic CORS configuration
app.use((req, res, next) => {
  const ngrokUrl = req.headers.host;
  if (ngrokUrl && !corsOptions.origin.includes(`https://${ngrokUrl}`)) {
    corsOptions.origin.push(`https://${ngrokUrl}`);
  }
  next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(useragent.express());
app.use(requestIp.mw());

// Modified registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const locationAndDeviceInfo = getLocationAndDeviceInfo(req);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }

    // Create new user using Mongoose model
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      location: locationAndDeviceInfo.location,
      deviceInfo: locationAndDeviceInfo.deviceInfo,
      networkInfo: locationAndDeviceInfo.networkInfo,
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

    const savedUser = await newUser.save();
    res.status(201).json({
      message: "User registered successfully",
      locationInfo: locationAndDeviceInfo,
      userId: savedUser._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ error: "Registration failed. Please try again later." });
  }
});

// Modified login endpoint
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
      await User.updateOne(
        { _id: user._id },
        {
          $push: {
            loginHistory: {
              timestamp: new Date(),
              location: locationAndDeviceInfo.location.current,
              ip: locationAndDeviceInfo.networkInfo.ip,
              deviceInfo: locationAndDeviceInfo.deviceInfo,
              success: false,
            },
          },
        }
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          location: locationAndDeviceInfo.location,
          deviceInfo: locationAndDeviceInfo.deviceInfo,
          networkInfo: locationAndDeviceInfo.networkInfo,
          lastLogin: new Date(),
        },
        $push: {
          loginHistory: {
            timestamp: new Date(),
            location: locationAndDeviceInfo.location.current,
            ip: locationAndDeviceInfo.networkInfo.ip,
            deviceInfo: locationAndDeviceInfo.deviceInfo,
            success: true,
          },
        },
      }
    );

    res.json({
      message: "Login successful",
      user,
      locationInfo: locationAndDeviceInfo,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again later." });
  }
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectToMongoDb();
    app.listen(PORT, () => {
      console.clear();
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();
