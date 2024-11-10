const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    location: {
      current: locationSchema,
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

userSchema.index({ "location.current": "2dsphere" });

module.exports = mongoose.model("User", userSchema);
