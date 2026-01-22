// const axios = require("axios");

// /**
//  * Reverse geocode coordinates to get address details using OpenStreetMap Nominatim
//  * @param {number} lat - Latitude
//  * @param {number} lng - Longitude
//  * @returns {Promise<{city: string, state: string, country: string, address: string}>}
//  */
// const reverseGeocode = async (lat, lng) => {
//   try {
//     const response = await axios.get(
//       `https://nominatim.openstreetmap.org/reverse`,
//       {
//         params: {
//           lat,
//           lon: lng,
//           format: "json",
//           addressdetails: 1,
//         },
//         headers: {
//           "User-Agent": "FoodDeliveryApp/1.0", // Required by Nominatim
//         },
//       }
//     );

//     const data = response.data;
//     const address = data.address || {};
//     console.log("Address object:", address);
    
//     // Extract suburb - use first available value or undefined
//     const suburb = address.suburb || address.neighbourhood || address.suburb_district || undefined;
    
//     const result = {
//       city: address.city || address.town || address.village || address.county || "Unknown",
//       state: address.state || address.region || "Unknown",
//       country: address.country || "Unknown",
//       address: data.display_name || `${lat}, ${lng}`,
//     };
    
//     // Only include suburb if it exists and is not empty
//     if (suburb && suburb.trim()) {
//       result.suburb = suburb.trim();
//     }
    
//     console.log("Returning geocode data:", result);
//     return result;
    
//   } catch (error) {
//     console.error("Reverse geocoding error:", error.message);
    
//     // Return fallback values on error (suburb will be undefined)
//     return {
//       suburb: undefined,
//       city: "Unknown",
//       state: "Unknown",
//       country: "Unknown",
//       address: `${lat}, ${lng}`,
//     };
//   }
// };

// module.exports = reverseGeocode;
const axios = require("axios");

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
      {
        params: {
          access_token: process.env.MAPBOX_ACCESS_TOKEN,
          language: "en",
          limit: 1, // MOST precise result
        },
      }
    );

    const feature = response.data.features?.[0];

    if (!feature) {
      throw new Error("No address found");
    }

    const context = feature.context || [];

    const find = (type) =>
      context.find((c) => c.id.startsWith(type))?.text;

    return {
      suburb: find("neighborhood") || find("locality"),
      city: find("place") || "Unknown",
      state: find("region") || "Unknown",
      country: find("country") || "Unknown",
      address: feature.place_name,
    };
  } catch (error) {
    console.error("Mapbox reverse geocode error:", error.message);
    return {
      city: "Unknown",
      state: "Unknown",
      country: "Unknown",
      address: `${lat}, ${lng}`,
    };
  }
};

module.exports = reverseGeocode;
