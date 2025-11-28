import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye, Gauge, MapPin, Search } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  icon: string;
}

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  icon: string;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  feature_code: string;
  country_code: string;
  admin1_id?: number;
  admin2_id?: number;
  timezone: string;
  population?: number;
  country_id: number;
  country: string;
  admin1?: string;
  admin2?: string;
}

interface GeocodingResponse {
  results: GeocodingResult[];
  generationtime_ms: number;
}

interface WeatherCurrent {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  surface_pressure: number;
}

interface WeatherDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface WeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    weather_code: string;
    wind_speed_10m: string;
    surface_pressure: string;
  };
  current: WeatherCurrent;
  daily_units: {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
  };
  daily: WeatherDaily;
}

const WeatherDashboard: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [city, setCity] = useState('London');
  const [searchInput, setSearchInput] = useState('');

  const fetchWeather = async (cityName: string) => {
    setLoading(true);
    setError('');
    
    try {
      // Using Open-Meteo API with geocoding - free and reliable
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      );
      
      if (!geoResponse.ok) {
        throw new Error('City not found');
      }
      
      const geoData: GeocodingResponse = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
      }
      
      const location: GeocodingResult = geoData.results[0];
      const { latitude, longitude, name, country } = location;
      
      // Fetch current weather and forecast
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
      );
      
      if (!weatherResponse.ok) {
        throw new Error('Weather data not available');
      }
      
      const weatherData: WeatherResponse = await weatherResponse.json();
      const current: WeatherCurrent = weatherData.current;
      
      // Map WMO weather codes to our icon system
      const mapWeatherCode = (code: number): string => {
        if (code === 0) return '113'; // Clear
        if (code === 1 || code === 2) return '116'; // Partly cloudy
        if (code === 3) return '119'; // Cloudy
        if (code === 45 || code === 48) return '143'; // Fog
        if (code >= 51 && code <= 55) return '263'; // Drizzle
        if (code >= 61 && code <= 65) return '296'; // Rain
        if (code >= 71 && code <= 77) return '323'; // Snow
        if (code >= 80 && code <= 82) return '305'; // Rain showers
        if (code >= 85 && code <= 86) return '335'; // Snow showers
        if (code >= 95 && code <= 99) return '386'; // Thunderstorm
        return '116'; // Default
      };
      
      const getConditionText = (code: number): string => {
        if (code === 0) return 'Clear';
        if (code === 1) return 'Mainly Clear';
        if (code === 2) return 'Partly Cloudy';
        if (code === 3) return 'Cloudy';
        if (code === 45 || code === 48) return 'Foggy';
        if (code >= 51 && code <= 55) return 'Drizzle';
        if (code >= 61 && code <= 65) return 'Rainy';
        if (code >= 71 && code <= 77) return 'Snowy';
        if (code >= 80 && code <= 82) return 'Rain Showers';
        if (code >= 85 && code <= 86) return 'Snow Showers';
        if (code >= 95 && code <= 99) return 'Thunderstorm';
        return 'Partly Cloudy';
      };
      
      setWeather({
        location: `${name}, ${country}`,
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        condition: getConditionText(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        visibility: 10, // Open-Meteo doesn't provide visibility, using default
        pressure: Math.round(current.surface_pressure),
        icon: mapWeatherCode(current.weather_code)
      });
      const forecastData: ForecastDay[] = weatherData.daily.time.map((date: string, index: number) => ({
        date: date,
        maxTemp: Math.round(weatherData.daily.temperature_2m_max[index]),
        minTemp: Math.round(weatherData.daily.temperature_2m_min[index]),
        condition: getConditionText(weatherData.daily.weather_code[index]),
        icon: mapWeatherCode(weatherData.daily.weather_code[index])
      }));
      setForecast(forecastData);
    } catch (err: unknown) {
      setError('Unable to fetch weather data. Please try another city.');
      setWeather(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  const handleSearch = () => {
    if (searchInput.trim()) {
      setCity(searchInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getWeatherIcon = (code: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      '113': <Sun className="w-16 h-16 text-yellow-400" />,
      '116': <Cloud className="w-16 h-16 text-gray-400" />,
      '119': <Cloud className="w-16 h-16 text-gray-500" />,
      '122': <Cloud className="w-16 h-16 text-gray-600" />,
      '143': <Cloud className="w-16 h-16 text-gray-400" />,
      '176': <CloudRain className="w-16 h-16 text-blue-400" />,
      '179': <CloudRain className="w-16 h-16 text-blue-300" />,
      '182': <CloudRain className="w-16 h-16 text-blue-500" />,
      '185': <CloudRain className="w-16 h-16 text-blue-500" />,
      '200': <CloudRain className="w-16 h-16 text-purple-400" />,
      '227': <Cloud className="w-16 h-16 text-blue-200" />,
      '230': <Cloud className="w-16 h-16 text-blue-300" />,
      '248': <Cloud className="w-16 h-16 text-gray-500" />,
      '260': <Cloud className="w-16 h-16 text-gray-500" />,
      '263': <CloudRain className="w-16 h-16 text-blue-400" />,
      '266': <CloudRain className="w-16 h-16 text-blue-400" />,
      '281': <CloudRain className="w-16 h-16 text-blue-500" />,
      '284': <CloudRain className="w-16 h-16 text-blue-500" />,
      '293': <CloudRain className="w-16 h-16 text-blue-500" />,
      '296': <CloudRain className="w-16 h-16 text-blue-500" />,
      '299': <CloudRain className="w-16 h-16 text-blue-600" />,
      '302': <CloudRain className="w-16 h-16 text-blue-600" />,
      '305': <CloudRain className="w-16 h-16 text-blue-700" />,
      '308': <CloudRain className="w-16 h-16 text-blue-700" />,
      '311': <CloudRain className="w-16 h-16 text-blue-400" />,
      '314': <CloudRain className="w-16 h-16 text-blue-500" />,
      '317': <CloudRain className="w-16 h-16 text-blue-500" />,
      '320': <CloudRain className="w-16 h-16 text-blue-300" />,
      '323': <Cloud className="w-16 h-16 text-blue-200" />,
      '326': <Cloud className="w-16 h-16 text-blue-300" />,
      '329': <Cloud className="w-16 h-16 text-blue-300" />,
      '332': <Cloud className="w-16 h-16 text-blue-400" />,
      '335': <Cloud className="w-16 h-16 text-blue-400" />,
      '338': <Cloud className="w-16 h-16 text-blue-500" />,
      '350': <CloudRain className="w-16 h-16 text-blue-400" />,
      '353': <CloudRain className="w-16 h-16 text-blue-400" />,
      '356': <CloudRain className="w-16 h-16 text-blue-600" />,
      '359': <CloudRain className="w-16 h-16 text-blue-600" />,
      '362': <CloudRain className="w-16 h-16 text-blue-500" />,
      '365': <CloudRain className="w-16 h-16 text-blue-600" />,
      '368': <Cloud className="w-16 h-16 text-blue-300" />,
      '371': <Cloud className="w-16 h-16 text-blue-400" />,
      '374': <CloudRain className="w-16 h-16 text-blue-400" />,
      '377': <CloudRain className="w-16 h-16 text-blue-500" />,
      '386': <CloudRain className="w-16 h-16 text-purple-500" />,
      '389': <CloudRain className="w-16 h-16 text-purple-600" />,
      '392': <CloudRain className="w-16 h-16 text-purple-500" />,
      '395': <CloudRain className="w-16 h-16 text-purple-600" />
    };
    
    return iconMap[code] || <Cloud className="w-16 h-16 text-gray-400" />;
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string (YYYY-MM-DD) and create a date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Weather Dashboard</h1>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search for a city..."
                className="w-full px-4 py-3 pr-12 rounded-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-white text-xl">Loading weather data...</div>
        )}

        {!loading && weather && (
          <>
            {/* Current Weather Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-5 h-5" />
                  <span className="text-2xl font-semibold">{weather.location}</span>
                </div>
                <div className="text-gray-600">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  {getWeatherIcon(weather.icon)}
                  <div>
                    <div className="text-7xl font-bold text-gray-800">
                      {weather.temperature}°C
                    </div>
                    <div className="text-xl text-gray-600 mt-2">
                      Feels like {weather.feelsLike}°C
                    </div>
                    <div className="text-lg text-gray-700 mt-1 font-medium">
                      {weather.condition}
                    </div>
                  </div>
                </div>

                {/* Weather Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                    <Wind className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-sm text-gray-600">Wind Speed</div>
                      <div className="text-xl font-semibold text-gray-800">
                        {weather.windSpeed} km/h
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                    <Droplets className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-sm text-gray-600">Humidity</div>
                      <div className="text-xl font-semibold text-gray-800">
                        {weather.humidity}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                    <Eye className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-sm text-gray-600">Visibility</div>
                      <div className="text-xl font-semibold text-gray-800">
                        {weather.visibility} km
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                    <Gauge className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-sm text-gray-600">Pressure</div>
                      <div className="text-xl font-semibold text-gray-800">
                        {weather.pressure} mb
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Day Forecast */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">5-Day Forecast</h2>
              <div className="grid grid-cols-5 gap-4">
                {forecast.map((day, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="font-semibold text-gray-700 mb-3">
                      {index === 0 ? 'Today' : formatDate(day.date)}
                    </div>
                    <div className="flex justify-center mb-3">
                      {getWeatherIcon(day.icon)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{day.condition}</div>
                    <div className="flex justify-center gap-2 text-lg font-semibold">
                      <span className="text-gray-800">{day.maxTemp}°</span>
                      <span className="text-gray-500">{day.minTemp}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeatherDashboard;

