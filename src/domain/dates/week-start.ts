import type { Weekday } from './calendar-date';

/**
 * First day of the week by region, from Unicode CLDR 48 week data.
 * Regions not listed start the week on Monday.
 */
const friday = ['MV'];
const saturday = [
  'AF',
  'BH',
  'DJ',
  'DZ',
  'EG',
  'IQ',
  'IR',
  'JO',
  'KW',
  'LY',
  'OM',
  'QA',
  'SD',
  'SY',
];
// prettier-ignore
const sunday = [
  'AG', 'AS', 'BD', 'BR', 'BS', 'BT', 'BW', 'BZ', 'CA', 'CO', 'DM', 'DO', 'ET', 'GT', 'GU', 'HK',
  'HN', 'ID', 'IL', 'IN', 'IS', 'JM', 'JP', 'KE', 'KH', 'KR', 'LA', 'MH', 'MM', 'MO', 'MT', 'MX',
  'MZ', 'NI', 'NP', 'PA', 'PE', 'PH', 'PK', 'PR', 'PT', 'PY', 'SA', 'SG', 'SV', 'TH', 'TT', 'TW',
  'UM', 'US', 'VE', 'VI', 'WS', 'YE', 'ZA', 'ZW',
];

const byRegion = new Map<string, Weekday>([
  ...friday.map((region) => [region, 5] as const),
  ...saturday.map((region) => [region, 6] as const),
  ...sunday.map((region) => [region, 7] as const),
]);

/**
 * First day of the week for a two-letter region code such as "US" or "BD".
 * Unknown or missing regions use Monday, the ISO 8601 default.
 */
export function weekStartForRegion(region: string | null | undefined): Weekday {
  return (typeof region === 'string' && byRegion.get(region.toUpperCase())) || 1;
}
