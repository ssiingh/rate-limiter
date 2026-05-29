export interface ConfigurationResponse {
  defaultAlgorithm: string;
  defaultLimit: number;
  defaultWindowMs: number;
  adaptiveEnabled: boolean;
  geoEnabled: boolean;
  circuitBreakerEnabled: boolean;
  metricsEnabled: boolean;
}
