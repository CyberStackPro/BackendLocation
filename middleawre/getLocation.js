// const geoip = require("geoip-lite");
// const axios = require("axios");

// const getLocationAndDeviceInfo = async (req) => {
//   const ip = req.clientIp;
//   const geo = geoip.lookup(ip === "::1" ? "8.8.8.8" : ip) || {};

//   // Use HTTPS and add timeout
//   let preciseLocation;
//   try {
//     const response = await axios.get(`https://ip-api.com/json/${ip}`, {
//       timeout: 5000, // Lower timeout to 5 seconds
//       headers: {
//         "User-Agent": "Mozilla/5.0", // Add user agent to prevent some blocks
//       },
//     });
//     if (response.data.status === "success") {
//       preciseLocation = response.data;
//     }
//   } catch (error) {
//     console.error("IP-API fallback failed:", error);
//     // Fallback to basic geo information
//     preciseLocation = null;
//   }

//   // Provide default coordinates for localhost
//   const coordinates =
//     ip === "::1" || ip === "127.0.0.1"
//       ? [0, 0] // Default coordinates for localhost
//       : preciseLocation
//       ? [preciseLocation.lon, preciseLocation.lat]
//       : geo.ll
//       ? [geo.ll[1], geo.ll[0]]
//       : [0, 0];

//   return {
//     location: {
//       current: {
//         type: "Point",
//         coordinates: coordinates,
//       },
//       city: preciseLocation?.city || geo.city || "Unknown",
//       region: preciseLocation?.regionName || geo.region || "Unknown",
//       country: preciseLocation?.country || geo.country || "Unknown",
//       timezone: preciseLocation?.timezone || geo.timezone || "Unknown",
//     },
//     deviceInfo: {
//       browser: req.useragent.browser || "Unknown",
//       os: req.useragent.os || "Unknown",
//       platform: req.useragent.platform || "Unknown",
//       userAgent: req.useragent.source || "Unknown",
//       isMobile: req.useragent.isMobile,
//       isDesktop: req.useragent.isDesktop,
//       isBot: req.useragent.isBot,
//     },
//     networkInfo: {
//       ip: ip,
//       range: geo.range || [],
//       country: preciseLocation?.country || geo.country || "Unknown",
//       region: preciseLocation?.regionName || geo.region || "Unknown",
//       timezone: preciseLocation?.timezone || geo.timezone || "Unknown",
//       isp: preciseLocation?.isp || "Unknown",
//       org: preciseLocation?.org || "Unknown",
//     },
//   };
// };

// module.exports = getLocationAndDeviceInfo;

const geoip = require("geoip-lite");
const axios = require("axios");

const getLocationAndDeviceInfo = async (req) => {
  const ip = req.clientIp;
  // For development/testing, use a fallback IP
  const ipToCheck = ip === "::1" || ip === "127.0.0.1" ? "8.8.8.8" : ip;

  try {
    // Try IP-API first with increased timeout
    const response = await axios.get(`https://ip-api.com/json/${ipToCheck}`, {
      timeout: 10000, // Increased timeout to 10 seconds
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (response.data.status === "success") {
      return {
        location: {
          current: {
            type: "Point",
            coordinates: [response.data.lon, response.data.lat],
          },
          city: response.data.city || "Unknown",
          region: response.data.regionName || "Unknown",
          country: response.data.country || "Unknown",
          timezone: response.data.timezone || "Unknown",
        },
        deviceInfo: {
          browser: req.useragent?.browser || "Unknown",
          os: req.useragent?.os || "Unknown",
          platform: req.useragent?.platform || "Unknown",
          userAgent: req.useragent?.source || "Unknown",
          isMobile: req.useragent?.isMobile || false,
          isDesktop: req.useragent?.isDesktop || false,
          isBot: req.useragent?.isBot || false,
        },
        networkInfo: {
          ip: ipToCheck,
          isp: response.data.isp || "Unknown",
          org: response.data.org || "Unknown",
          country: response.data.country || "Unknown",
          region: response.data.regionName || "Unknown",
          timezone: response.data.timezone || "Unknown",
        },
      };
    }
  } catch (error) {
    // If IP-API fails, fallback to geoip-lite
    // console.log("Falling back to geoip-lite");
    const geo = geoip.lookup(ipToCheck);

    if (geo) {
      return {
        location: {
          current: {
            type: "Point",
            coordinates: [geo.ll[1], geo.ll[0]], // [longitude, latitude]
          },
          city: geo.city || "Unknown",
          region: geo.region || "Unknown",
          country: geo.country || "Unknown",
          timezone: geo.timezone || "Unknown",
        },
        deviceInfo: {
          browser: req.useragent?.browser || "Unknown",
          os: req.useragent?.os || "Unknown",
          platform: req.useragent?.platform || "Unknown",
          userAgent: req.useragent?.source || "Unknown",
          isMobile: req.useragent?.isMobile || false,
          isDesktop: req.useragent?.isDesktop || false,
          isBot: req.useragent?.isBot || false,
        },
        networkInfo: {
          ip: ipToCheck,
          range: geo.range || [],
          country: geo.country || "Unknown",
          region: geo.region || "Unknown",
          timezone: geo.timezone || "Unknown",
          isp: "Unknown",
          org: "Unknown",
        },
      };
    }
  }

  // Return default values if both methods fail
  return {
    location: {
      current: {
        type: "Point",
        coordinates: [0, 0],
      },
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
      timezone: "Unknown",
    },
    deviceInfo: {
      browser: req.useragent?.browser || "Unknown",
      os: req.useragent?.os || "Unknown",
      platform: req.useragent?.platform || "Unknown",
      userAgent: req.useragent?.source || "Unknown",
      isMobile: req.useragent?.isMobile || false,
      isDesktop: req.useragent?.isDesktop || false,
      isBot: req.useragent?.isBot || false,
    },
    networkInfo: {
      ip: ipToCheck,
      range: [],
      country: "Unknown",
      region: "Unknown",
      timezone: "Unknown",
      isp: "Unknown",
      org: "Unknown",
    },
  };
};

module.exports = getLocationAndDeviceInfo;
