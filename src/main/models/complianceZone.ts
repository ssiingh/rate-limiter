export interface ComplianceZone {
  name: string;
  countries: string[];
  regions?: string[];
  limitMultiplier: number;
  blocked: boolean;
  description: string;
}
