import {frontField} from './weather-front.js';
export function weatherState(settings = {}, time = 0, position = {x: 0, z: 0}) {
  const hour = ((settings.hour ?? 12) + (settings.dayCycle ? Math.max(0, time) / ((settings.cycleMinutes ?? 20) * 60) * 24 : 0)) % 24;
  const elevation = Math.sin((hour - 6) / 24 * Math.PI * 2);
  const daylight = Math.max(0, Math.min(1, (elevation + 0.12) / 0.4));
  let rain = settings.weather === 'rain' ? 1 : 0;
  let cloud = settings.weather === 'sunny' || !settings.weather ? 0.15 : rain ? 1 : 0.85;
  const wind = Math.max(0, Math.min(100, settings.wind ?? 20)) / 100;
  const angle = (settings.windAngle ?? 45) * Math.PI / 180;
  const frontEnabled = settings.movingFronts === true && settings.livingWeather !== false;
  const front = frontField(position.x, position.z, time, wind, angle, frontEnabled);
  rain = Math.max(rain, front.strength * 0.95); cloud = Math.max(cloud, 0.15 + front.strength * 0.85);
  const gust = settings.livingWeather === false ? 0 : Math.sin(time * 0.19) * 0.6 + Math.sin(time * 0.071) * 0.4;
  return {hour, daylight, night: 1 - daylight, rain, cloud,
    wind: Math.max(0, Math.min(1, wind * (1 + gust * 0.3) + front.strength * 0.15)), waveFactor: Math.min(1.3, 1 + gust * wind * 0.2 + front.strength * wind * 0.1),
    windAngle: angle, frontEnabled: Number(frontEnabled), frontX: front.x, frontZ: front.z, frontDistance: front.distance, frontSpeed: front.speed, frontStrength: front.strength,
    elevation, sun: daylight * (1 - cloud * 0.72),
    glow: settings.glow === false ? 0 : 1 - daylight};
}
