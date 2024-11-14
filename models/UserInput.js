const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  source: {
    type: String,
    enum: ["ip", "browser", "manual", "combined"],
    default: "ip",
  },
  accuracy: {
    type: Number,
    default: null,
  },
  confidence: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
});

const userInputSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    inputNumber: {
      type: Number,
      required: true,
    },
    browserCoordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    location: {
      current: locationSchema,
      browser: locationSchema,
      city: String,
      region: String,
      country: String,
      timezone: String,
    },
    deviceInfo: {
      browser: String,
      os: String,
      platform: String,
      userAgent: String,
      isMobile: Boolean,
      isDesktop: Boolean,
      isBot: Boolean,
    },
    networkInfo: {
      ip: String,
      range: [Number],
      country: String,
      region: String,
      timezone: String,
    },
    loginHistory: [
      {
        timestamp: Date,
        location: locationSchema,
        ip: String,
        deviceInfo: {
          browser: String,
          os: String,
          platform: String,
        },
        success: Boolean,
      },
    ],
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

userInputSchema.index({ "location.current": "2dsphere" });

module.exports = mongoose.model("UserInput", userInputSchema);
