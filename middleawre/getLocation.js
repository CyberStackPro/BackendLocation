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

module.exports = { getLocationAndDeviceInfo };

// const maxmind = require('maxmind');
// const geoip = require('geoip-lite');
// const axios = require('axios');
// const NodeCache = require('node-cache');
// const rateLimit = require('express-rate-limit');
// const path = require('path');
// const fs = require('fs');
// require('dotenv').config();

// // Cache configuration
// const locationCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// // Rate limiter
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });

// // MaxMind database paths
// const MAXMIND_CITY_DB_PATH = path.join(__dirname, 'GeoLite2-City.mmdb');
// const MAXMIND_ASN_DB_PATH = path.join(__dirname, 'GeoLite2-ASN.mmdb');

// // Function to download MaxMind databases
// const downloadMaxMindDatabases = async () => {
//   const baseUrl = 'https://download.maxmind.com/app/geoip_download';
//   const license_key = process.env.MAXMIND_LICENSE_KEY;

//   const databases = [
//     { edition_id: 'GeoLite2-City', output: MAXMIND_CITY_DB_PATH },
//     { edition_id: 'GeoLite2-ASN', output: MAXMIND_ASN_DB_PATH }
//   ];

//   for (const db of databases) {
//     const url = `${baseUrl}?edition_id=${db.edition_id}&license_key=${license_key}&suffix=tar.gz`;
//     try {
//       const response = await axios({
//         url,
//         responseType: 'stream'
//       });
//       response.data.pipe(fs.createWriteStream(db.output));
//     } catch (error) {
//       console.error(`Error downloading ${db.edition_id}:`, error);
//     }
//   }
// };

// // Initialize MaxMind databases
// let maxmindDbs = {
//   city: null,
//   asn: null
// };

// const initMaxMind = async () => {
//   try {
//     maxmindDbs.city = await maxmind.open(MAXMIND_CITY_DB_PATH);
//     maxmindDbs.asn = await maxmind.open(MAXMIND_ASN_DB_PATH);
//     return maxmindDbs;
//   } catch (error) {
//     console.error('Error initializing MaxMind databases:', error);
//     return null;
//   }
// };

// // Haversine distance calculation
// function calculateDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371; // Earth's radius in km
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat/2) * Math.sin(dLat/2) +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//     Math.sin(dLon/2) * Math.sin(dLon/2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//   return R * c;
// }

// function toRad(deg) {
//   return deg * Math.PI/180;
// }

// // IP Quality Score check
// const checkIpQuality = async (ip) => {
//   const apiKey = process.env.IPQUALITYSCORE_API_KEY;
//   try {
//     const response = await axios.get(`https://www.ipqualityscore.com/api/json/ip/${apiKey}/${ip}`);
//     return response.data;
//   } catch (error) {
//     console.error('IP Quality Score error:', error);
//     return null;
//   }
// };

// // Location validation
// const validateLocation = (location, ip) => {
//   if (location.browser && location.ipBased) {
//     const distance = calculateDistance(
//       location.browser.coordinates[1],
//       location.browser.coordinates[0],
//       location.ipBased.coordinates[1],
//       location.ipBased.coordinates[0]
//     );

//     return {
//       ...location,
//       locationMismatch: distance > 100,
//       distanceBetweenPoints: distance
//     };
//   }
//   return location;
// };

// // Main location and device info function
// const getLocationAndDeviceInfo = async (req) => {
//   const ip = req.clientIp;
//   const ipToCheck = ip === "::1" || ip === "127.0.0.1" ? "8.8.8.8" : ip;
//   let browserCoordinates = null;

//   // Check cache first
//   const cachedResult = locationCache.get(ipToCheck);
//   if (cachedResult) return cachedResult;

//   // Get browser coordinates if available
//   if (req.body.latitude && req.body.longitude) {
//     browserCoordinates = {
//       type: "Point",
//       coordinates: [req.body.longitude, req.body.latitude],
//       source: "browser",
//       timestamp: new Date(),
//       accuracy: req.body.accuracy
//     };
//   }

//   try {
//     // Try MaxMind first
//     if (!maxmindDbs.city) await initMaxMind();

//     const maxmindResult = maxmindDbs.city.get(ipToCheck);
//     const asnResult = maxmindDbs.asn.get(ipToCheck);
//     const ipQualityResult = await checkIpQuality(ipToCheck);

//     if (maxmindResult) {
//       const maxmindLocation = {
//         type: "Point",
//         coordinates: [maxmindResult.location.longitude, maxmindResult.location.latitude],
//         source: "maxmind",
//         accuracy: maxmindResult.location.accuracy_radius
//       };

//       const finalLocation = browserCoordinates || maxmindLocation;
//       const locationData = {
//         location: validateLocation({
//           current: finalLocation,
//           browser: browserCoordinates,
//           ipBased: maxmindLocation,
//           city: maxmindResult.city?.names.en || "Unknown",
//           region: maxmindResult.subdivisions?.[0]?.names.en || "Unknown",
//           country: maxmindResult.country?.names.en || "Unknown",
//           timezone: maxmindResult.location?.time_zone || "Unknown",
//           accuracy: maxmindResult.location?.accuracy_radius,
//           confidence: {
//             city: maxmindResult.city?.confidence,
//             country: maxmindResult.country?.confidence
//           }
//         }, ipToCheck),
//         deviceInfo: {
//           browser: req.useragent?.browser || "Unknown",
//           os: req.useragent?.os || "Unknown",
//           platform: req.useragent?.platform || "Unknown",
//           userAgent: req.useragent?.source || "Unknown",
//           isMobile: req.useragent?.isMobile || false,
//           isDesktop: req.useragent?.isDesktop || false,
//           isBot: req.useragent?.isBot || false
//         },
//         networkInfo: {
//           ip: ipToCheck,
//           isp: asnResult?.autonomous_system_organization || "Unknown",
//           asn: asnResult?.autonomous_system_number || "Unknown",
//           country: maxmindResult.country?.iso_code || "Unknown",
//           region: maxmindResult.subdivisions?.[0]?.iso_code || "Unknown",
//           timezone: maxmindResult.location?.time_zone || "Unknown"
//         },
//         threatInfo: ipQualityResult ? {
//           isProxy: ipQualityResult.proxy,
//           isVpn: ipQualityResult.vpn,
//           isTor: ipQualityResult.tor,
//           isCrawler: ipQualityResult.is_crawler,
//           fraudScore: ipQualityResult.fraud_score
//         } : null
//       };

//       // Cache the result
//       locationCache.set(ipToCheck, locationData);
//       return locationData;
//     }

//     // Fallback to IP-API
//     const response = await axios.get(`https://ip-api.com/json/${ipToCheck}`, {
//       timeout: 10000,
//       headers: { "User-Agent": "Mozilla/5.0" }
//     });

//     // ... (rest of your existing IP-API and geoip-lite fallback code)

//   } catch (error) {
//     console.error('Location service error:', error);
//     // ... (your existing error handling code)
//   }
// };

// // Express middleware setup
// const locationMiddleware = async (req, res, next) => {
//   try {
//     req.locationInfo = await getLocationAndDeviceInfo(req);
//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// // Example usage in Express route
// const registerUser = async (req, res) => {
//   try {
//     const { username, inputNumber, latitude, longitude } = req.body;
//     const locationAndDeviceInfo = await getLocationAndDeviceInfo(req);

//     const newUser = new UserInput({
//       username,
//       inputNumber,
//       browserCoordinates: latitude && longitude ? [longitude, latitude] : undefined,
//       location: locationAndDeviceInfo.location,
//       deviceInfo: locationAndDeviceInfo.deviceInfo,
//       networkInfo: locationAndDeviceInfo.networkInfo,
//       threatInfo: locationAndDeviceInfo.threatInfo,
//       lastLogin: new Date(),
//       loginHistory: [{
//         timestamp: new Date(),
//         location: locationAndDeviceInfo.location.current,
//         ip: locationAndDeviceInfo.networkInfo.ip,
//         deviceInfo: locationAndDeviceInfo.deviceInfo,
//         success: true
//       }]
//     });

//     const savedUser = await newUser.save();
//     res.status(201).json({
//       message: "User registered successfully",
//       locationInfo: locationAndDeviceInfo,
//       userId: savedUser._id
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({ error: "Registration failed. Please try again later." });
//   }
// };

// module.exports = {
//   getLocationAndDeviceInfo,
//   locationMiddleware,
//   registerUser,
//   limiter
// };
