import { NextResponse } from "next/server";

const OMAHA_LAT = 41.2565;
const OMAHA_LON = -95.9345;

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENWEATHER_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${OMAHA_LAT}&lon=${OMAHA_LON}&appid=${apiKey}&units=imperial`;
    const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch weather data" },
        { status: 502 }
      );
    }

    const data = await res.json();

    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const condition = data.weather?.[0]?.main || "Unknown";
    const description = data.weather?.[0]?.description || "";
    const icon = data.weather?.[0]?.icon || "01d";
    const windSpeed = Math.round(data.wind?.speed || 0);
    const humidity = data.main?.humidity || 0;

    // Determine work safety indicator
    const warnings: string[] = [];
    if (temp > 100) warnings.push("Extreme heat");
    if (temp < 15) warnings.push("Extreme cold");
    if (windSpeed > 30) warnings.push("High winds");
    if (["Thunderstorm"].includes(condition)) warnings.push("Thunderstorm");
    if (["Tornado"].includes(condition)) warnings.push("Tornado warning");
    if (condition === "Snow" && temp < 20) warnings.push("Heavy snow/ice");

    const safeToWork = warnings.length === 0;

    return NextResponse.json({
      temp,
      feelsLike,
      condition,
      description,
      icon,
      windSpeed,
      humidity,
      safeToWork,
      warnings,
      location: "Omaha, NE",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Weather service unavailable" },
      { status: 502 }
    );
  }
}
