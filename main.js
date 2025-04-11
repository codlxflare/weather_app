// API 
const API_KEY = 'c77d30a835c84c55807172509251104'; 
const BASE_URL = 'https://api.weatherapi.com/v1';


const elements = {
  cityInput: document.getElementById('cityInput'),
  searchButton: document.getElementById('searchButton'),
  currentWeather: document.getElementById('currentWeather'),
  forecastContainer: document.getElementById('forecastContainer'),
  themeButton: document.getElementById('themeButton'),
  locationButton: document.getElementById('locationButton'),
  feelsLikeTemp: document.getElementById('feelsLikeTemp'),
  humidity: document.getElementById('humidity'),
  pressure: document.getElementById('pressure'),
  wind: document.getElementById('wind'),
  aqiValue: document.getElementById('aqiValue'),
  aqiLevel: document.getElementById('aqiLevel'),
  aqiDescription: document.getElementById('aqiDescription'),
  lastUpdated: document.getElementById('lastUpdated')
};


function initApp() {

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  
  fetchWeather('Москва');
  

  setupEventListeners();
}


function setupEventListeners() {
  elements.searchButton.addEventListener('click', handleSearch);
  elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  elements.themeButton.addEventListener('click', toggleTheme);
  elements.locationButton.addEventListener('click', handleLocation);
}

// Обработка поиска
function handleSearch() {
  const city = elements.cityInput.value.trim();
  if (city) {
    fetchWeather(city);
  }
}

// Обработка определения местоположения
function handleLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather(`${latitude},${longitude}`);
      },
      (error) => {
        console.error('Ошибка геолокации:', error);
        alert('Не удалось определить местоположение. Разрешите доступ к геолокации.');
      }
    );
  } else {
    alert('Геолокация не поддерживается вашим браузером');
  }
}

// Получение данных 
async function fetchWeather(query) {
  try {
    showLoading(true);
    
    // Запрос погоды и прогноза
    const [currentData, forecastData, airQualityData] = await Promise.all([
      fetchData(`${BASE_URL}/current.json?key=${API_KEY}&q=${query}&lang=ru`),
      fetchData(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${query}&days=3&lang=ru`),
      fetchData(`${BASE_URL}/current.json?key=${API_KEY}&q=${query}&aqi=yes`)
    ]);
    
    displayWeather(currentData, forecastData, airQualityData);
    updateLastUpdated();
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    elements.currentWeather.innerHTML = `
      <div class="error-message">
        <p>Ошибка: ${error.message}</p>
        <p>Попробуйте другой город</p>
      </div>
    `;
    elements.forecastContainer.innerHTML = '';
  } finally {
    showLoading(false);
  }
}


async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Город не найден' : 'Ошибка сервера');
  }
  return await response.json();
}

// Отображение данных
function displayWeather(currentData, forecastData, airQualityData) {
  displayCurrentWeather(currentData);
  displayForecast(forecastData);
  displayAirQuality(airQualityData);
}

// Отображение погоды
function displayCurrentWeather(data) {
  const { current, location } = data;
  const iconUrl = getWeatherIconUrl(current.condition.icon);
  
  elements.currentWeather.innerHTML = `
    <div class="current-weather-content">
      <h2>${location.name}, ${location.country}</h2>
      <div class="current-main">
        <img src="${iconUrl}" alt="${current.condition.text}" class="weather-icon">
        <div class="current-temp">
          <span class="temperature">${current.temp_c}°C</span>
          <p>${current.condition.text}</p>
        </div>
      </div>
    </div>
  `;
  
  // Детали погоды
  elements.feelsLikeTemp.textContent = `${current.feelslike_c}°C`;
  elements.humidity.textContent = `${current.humidity}%`;
  elements.pressure.textContent = `${current.pressure_mb} hPa`;
  elements.wind.textContent = `${current.wind_kph} км/ч, ${current.wind_dir}`;
}


function displayForecast(data) {
  elements.forecastContainer.innerHTML = '';
  
  data.forecast.forecastday.forEach(day => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
    const iconUrl = getWeatherIconUrl(day.day.condition.icon);
    
    const forecastDay = document.createElement('div');
    forecastDay.className = 'forecast-day';
    forecastDay.innerHTML = `
      <h3>${dayName}</h3>
      <img src="${iconUrl}" alt="${day.day.condition.text}" class="weather-icon">
      <p class="temperature">${day.day.avgtemp_c}°C</p>
      <p>${day.day.condition.text}</p>
      <div class="forecast-details">
        <p>↑ ${day.day.maxtemp_c}°C</p>
        <p>↓ ${day.day.mintemp_c}°C</p>
      </div>
    `;
    
    elements.forecastContainer.appendChild(forecastDay);
  });
}


function displayAirQuality(data) {
  const aqi = data.current.air_quality['us-epa-index'];
  
  if (aqi) {
    elements.aqiValue.textContent = aqi;
    const { level, description } = getAirQualityInfo(aqi);
    elements.aqiLevel.textContent = level;
    elements.aqiDescription.textContent = description;
    
    // Цвет в зависимости от качества воздуха
    const aqiColor = getAqiColor(aqi);
    elements.aqiValue.style.backgroundColor = aqiColor;
  } else {
    elements.aqiValue.textContent = '--';
    elements.aqiLevel.textContent = 'Нет данных';
    elements.aqiDescription.textContent = 'Информация о качестве воздуха недоступна';
  }
}

// Информация о качестве воздуха
function getAirQualityInfo(aqi) {
  const levels = [
    { min: 0, max: 50, level: 'Хорошо', description: 'Качество воздуха удовлетворительное' },
    { min: 51, max: 100, level: 'Умеренно', description: 'Качество воздуха приемлемое' },
    { min: 101, max: 150, level: 'Плохо', description: 'Может влиять на чувствительных людей' },
    { min: 151, max: 200, level: 'Очень плохо', description: 'Может влиять на всех' },
    { min: 201, max: 300, level: 'Опасно', description: 'Серьезный риск для здоровья' },
    { min: 301, max: 500, level: 'Очень опасно', description: 'Чрезвычайные условия' }
  ];
  
  const info = levels.find(l => aqi >= l.min && aqi <= l.max);
  return info || { level: 'Неизвестно', description: 'Нет данных' };
}

// Цвет для качества воздуха
function getAqiColor(aqi) {
  if (aqi <= 50) return '#4CAF50'; // Зеленый
  if (aqi <= 100) return '#FFEB3B'; // Желтый
  if (aqi <= 150) return '#FF9800'; // Оранжевый
  if (aqi <= 200) return '#F44336'; // Красный
  if (aqi <= 300) return '#9C27B0'; // Фиолетовый
  return '#795548'; // Коричневый
}

// Получение URL картинок погоды
function getWeatherIconUrl(iconPath) {
  if (!iconPath) return '';
  if (iconPath.startsWith('http')) return iconPath;
  if (iconPath.startsWith('//')) return `https:${iconPath}`;
  return `https://${iconPath}`;
}

// Время послед обновления
function updateLastUpdated() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  elements.lastUpdated.textContent = timeString;
}

// Тема
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Показать/скрыть индикатор загрузки
function showLoading(show) {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) {
    spinner.style.display = show ? 'flex' : 'none';
  }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);