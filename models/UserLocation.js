const mongoose = require("mongoose");

const UserLocationSchema = mongoose.Schema(
  {
    browserCoordinates: {
      type: [Number],
      required: true,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserLocation", UserLocationSchema);
