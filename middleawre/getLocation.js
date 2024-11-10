const geoip = require("geoip-lite");

const getLocationAndDeviceInfo = (req) => {
  const ip = req.clientIp;
  const geo = geoip.lookup(ip) || {};

  // Fallback coordinates to [0, 0] if `geo.ll` is not available
  const coordinates = geo.ll || [0, 0];

  return {
    location: {
      current: {
        type: "Point",
        coordinates: [coordinates[1], coordinates[0]], // [longitude, latitude]
      },
      city: geo.city || "Unknown",
      region: geo.region || "Unknown",
      country: geo.country || "Unknown",
      timezone: geo.timezone || "Unknown",
    },
    deviceInfo: {
      browser: req.useragent.browser || "Unknown",
      os: req.useragent.os || "Unknown",
      platform: req.useragent.platform || "Unknown",
      userAgent: req.useragent.source || "Unknown",
      isMobile: req.useragent.isMobile,
      isDesktop: req.useragent.isDesktop,
      isBot: req.useragent.isBot,
    },
    networkInfo: {
      ip: ip,
      range: geo.range || [],
      country: geo.country || "Unknown",
      region: geo.region || "Unknown",
      timezone: geo.timezone || "Unknown",
    },
  };
};

module.exports = getLocationAndDeviceInfo;
