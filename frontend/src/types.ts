export interface WeatherReading {
  id: number;
  temperature: number;
  humidity: number;
  pressure?: number;
  recorded_at: string;
}
