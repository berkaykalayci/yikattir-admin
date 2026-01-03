const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'openstreetmap', // Ücretsiz OpenStreetMap kullanıyoruz
  httpAdapter: 'https',
  formatter: null
};

const geocoder = NodeGeocoder(options);

// Adres bilgisinden koordinat hesapla
const getCoordinatesFromAddress = async (address, city, district) => {
  try {
    const fullAddress = `${address}, ${district}, ${city}, Turkey`;
    console.log('Geocoding için adres:', fullAddress);
    
    const results = await geocoder.geocode(fullAddress);
    
    if (results && results.length > 0) {
      const result = results[0];
      return {
        lat: result.latitude,
        lng: result.longitude,
        formattedAddress: result.formattedAddress
      };
    }
    
    // Eğer tam adres bulunamazsa, sadece ilçe ve il ile dene
    const fallbackAddress = `${district}, ${city}, Turkey`;
    console.log('Fallback geocoding için adres:', fallbackAddress);
    
    const fallbackResults = await geocoder.geocode(fallbackAddress);
    
    if (fallbackResults && fallbackResults.length > 0) {
      const result = fallbackResults[0];
      return {
        lat: result.latitude,
        lng: result.longitude,
        formattedAddress: result.formattedAddress
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding hatası:', error);
    return null;
  }
};

// İki koordinat arasındaki mesafeyi hesapla (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Dünya'nın yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // km cinsinden mesafe
};

module.exports = {
  getCoordinatesFromAddress,
  calculateDistance
};
