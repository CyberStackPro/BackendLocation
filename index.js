const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const useragent = require("express-useragent");
const requestIp = require("request-ip");
const {
  getLocationAndDeviceInfo,
  registerUser,
} = require("./middleawre/getLocation");
const User = require("./models/User");
const geoip = require("geoip-lite");

const dotenv = require("dotenv");
const connectToMongoDb = require("./config/db");
const UserInput = require("./models/UserInput");

dotenv.config();

const app = express();

const corsOptions = {
  origin: [
    "https://locationdetect.onrender.com",
    "http://localhost:5173",
    "https://locationdetect.onrender.com",
  ],
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
const errorHandler = (error, res) => {
  console.error(error);
  return res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

// Modified registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);
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
    const mergedLocation = {
      ...locationAndDeviceInfo.location,
      current: browserCoordinates || locationAndDeviceInfo.location.current,
    };

    // Create new user using Mongoose model
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      // location: locationAndDeviceInfo.location,
      location: mergedLocation,
      deviceInfo: locationAndDeviceInfo.deviceInfo,
      networkInfo: locationAndDeviceInfo.networkInfo,
      lastLogin: new Date(),
      loginHistory: [
        {
          timestamp: new Date(),
          // location: locationAndDeviceInfo.location.current,
          location: mergedLocation.current,
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
const verifyLocationMiddleware = async (req, res, next) => {
  try {
    if (!req.body.latitude || !req.body.longitude) {
      return next();
    }

    const location = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    };

    // Reverse geocoding
    const geocodeResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    if (geocodeResponse.data.results.length > 0) {
      req.verifiedLocation = {
        ...location,
        address: geocodeResponse.data.results[0],
        verified: true,
      };
    }

    next();
  } catch (error) {
    console.error("Location verification failed:", error);
    next();
  }
};

app.post("/api/user-input/register", async (req, res) => {
  try {
    const { username, inputNumber, latitude, longitude } = req.body;
    const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);

    const browserCoordinates = {
      type: "Point",
      source: "browser",
      coordinates: [longitude, latitude],
      timestamp: new Date(),
      accuracy: null,
    };

    const mergedLocation = {
      ...locationAndDeviceInfo.location,
      current: browserCoordinates,
      browser: browserCoordinates,
    };

    const newUser = new UserInput({
      username,
      inputNumber,
      browserCoordinates: [longitude, latitude],
      location: mergedLocation,
      deviceInfo: locationAndDeviceInfo.deviceInfo,
      networkInfo: locationAndDeviceInfo.networkInfo,
      lastLogin: new Date(),
      loginHistory: [
        {
          timestamp: new Date(),
          location: browserCoordinates,
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
    res.status(500).json({
      error: "Registration failed. Please try again later.",
    });
  }
});
// Add this new route to your Express app
app.get("/api/location/network-info", async (req, res) => {
  try {
    const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);
    res.json(locationAndDeviceInfo);
  } catch (error) {
    console.error("Network info fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch network information",
      details: error.message,
    });
  }
});
app.post("/api/location/update-coordinates", async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({ error: "Invalid coordinates format" });
    }

    const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);

    // Merge the precise coordinates with the location info
    const updatedLocationInfo = {
      ...locationAndDeviceInfo,
      location: {
        ...locationAndDeviceInfo.location,
        current: {
          type: "Point",
          coordinates,
          source: "browser",
          timestamp: new Date(),
        },
      },
    };

    res.json(updatedLocationInfo);
  } catch (error) {
    console.error("Update coordinates error:", error);
    res.status(500).json({
      error: "Failed to update coordinates",
      details: error.message,
    });
  }
});
// Modified login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);
    console.log(locationAndDeviceInfo);

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
  } // Add this new route to your Express app
  app.get("/api/location/network-info", async (req, res) => {
    try {
      const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);
      res.json({
        networkInfo: locationAndDeviceInfo.networkInfo,
        location: locationAndDeviceInfo.location,
        deviceInfo: locationAndDeviceInfo.deviceInfo,
      });
    } catch (error) {
      console.error("Network info fetch error:", error);
      res.status(500).json({ error: "Failed to fetch network information" });
    }
  });
});

app.post("/location/update-browser-coordinates", async (req, res) => {
  try {
    const { userId, coordinates, accuracy } = req.body;
    const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedLocationInfo = {
      ...locationAndDeviceInfo,
      location: {
        ...locationAndDeviceInfo.location,
        current: {
          type: "Point",
          coordinates: coordinates, // [longitude, latitude]
          source: "browser",
          accuracy: accuracy,
          timestamp: new Date(),
        },
        browser: {
          type: "Point",
          coordinates: coordinates,
          source: "browser",
          accuracy: accuracy,
          timestamp: new Date(),
        },
      },
    };
    // If this is during registration, you can store this information
    // If this is for an existing user, you can update their information
    if (req.body.userId) {
      await User.findByIdAndUpdate(req.body.userId, {
        $set: {
          "location.current": updatedLocationInfo.location.current,
          "location.browser": updatedLocationInfo.location.browser,
        },
      });
    }

    await user.save();
    res.json({ success: true, locationInfo: updatedLocationInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
