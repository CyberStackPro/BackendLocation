// getLocation.js
const axios = require("axios");
const geoip = require("geoip-lite");

const getLocationAndDeviceInfo = async (req) => {
  const ip = req.clientIp;
  const geo = geoip.lookup(ip) || {};
  const userCoordinates = req.body.coordinates;

  try {
    // Get detailed location from IP-API
    const ipApiResponse = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 5000,
    });

    // If user provided browser coordinates, get detailed address
    let detailedLocation = {};
    if (userCoordinates) {
      try {
        const nominatimResponse = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCoordinates.latitude}&lon=${userCoordinates.longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              "User-Agent": "LocationDetect/1.0",
            },
            timeout: 5000,
          }
        );

        if (nominatimResponse.data.address) {
          detailedLocation = {
            street: nominatimResponse.data.address.road,
            house_number: nominatimResponse.data.address.house_number,
            postcode: nominatimResponse.data.address.postcode,
            city:
              nominatimResponse.data.address.city ||
              nominatimResponse.data.address.town,
            state: nominatimResponse.data.address.state,
            country: nominatimResponse.data.address.country,
          };
        }
      } catch (error) {
        console.error("Nominatim API error:", error);
      }
    }

    const coordinates = userCoordinates
      ? [userCoordinates.longitude, userCoordinates.latitude]
      : [
          ipApiResponse.data.lon || geo.ll?.[1] || 0,
          ipApiResponse.data.lat || geo.ll?.[0] || 0,
        ];

    return {
      location: {
        current: {
          type: "Point",
          coordinates: coordinates,
        },
        street: detailedLocation.street || "Unknown",
        city:
          detailedLocation.city ||
          ipApiResponse.data.city ||
          geo.city ||
          "Unknown",
        region:
          detailedLocation.state ||
          ipApiResponse.data.regionName ||
          geo.region ||
          "Unknown",
        country:
          detailedLocation.country ||
          ipApiResponse.data.country ||
          geo.country ||
          "Unknown",
        timezone: ipApiResponse.data.timezone || geo.timezone || "Unknown",
        postcode:
          detailedLocation.postcode || ipApiResponse.data.zip || "Unknown",
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
        country: ipApiResponse.data.country || geo.country || "Unknown",
        region: ipApiResponse.data.regionName || geo.region || "Unknown",
        timezone: ipApiResponse.data.timezone || geo.timezone || "Unknown",
        isp: ipApiResponse.data.isp || "Unknown",
        org: ipApiResponse.data.org || "Unknown",
        as: ipApiResponse.data.as || "Unknown",
      },
    };
  } catch (error) {
    console.error("Location services error:", error);

    // Fallback to basic GeoIP data
    return {
      location: {
        current: {
          type: "Point",
          coordinates: userCoordinates
            ? [userCoordinates.longitude, userCoordinates.latitude]
            : [geo.ll?.[1] || 0, geo.ll?.[0] || 0],
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
  }
};

module.exports = getLocationAndDeviceInfo;
