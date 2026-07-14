"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;
  windSpeed: number;
  humidity: number;
  safeToWork: boolean;
  warnings: string[];
  location: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setWeather(data);
      } catch {
        setError("Weather unavailable");
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: "16px 20px", minHeight: 90 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>Loading weather...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>⛅ Weather unavailable</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
            {weather.location}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt={weather.description}
              style={{ width: 48, height: 48, marginLeft: -8 }}
            />
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                {weather.temp}°F
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, textTransform: "capitalize" }}>
                {weather.description}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
            Feels like {weather.feelsLike}°F • Wind {weather.windSpeed} mph • Humidity {weather.humidity}%
          </div>
        </div>

        {/* Safety indicator */}
        <div style={{
          padding: "6px 12px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          background: weather.safeToWork ? "#dcfce7" : "#fee2e2",
          color: weather.safeToWork ? "#166534" : "#991b1b",
          whiteSpace: "nowrap",
        }}>
          {weather.safeToWork ? "✓ Good to work" : "⚠ Weather warning"}
        </div>
      </div>

      {!weather.safeToWork && weather.warnings.length > 0 && (
        <div style={{
          marginTop: 10,
          padding: "8px 12px",
          background: "#fef2f2",
          borderRadius: 6,
          fontSize: 12,
          color: "#991b1b",
        }}>
          <strong>Warnings:</strong> {weather.warnings.join(", ")}
        </div>
      )}
    </div>
  );
}
