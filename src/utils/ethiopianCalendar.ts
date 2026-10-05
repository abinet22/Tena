/**
 * Ethiopian Calendar (Ge'ez / Bahire Hasab) conversion utilities.
 * The Ethiopian calendar has 12 months of 30 days plus 1 month of 5 or 6 days (Pagume).
 * It is approximately 7 to 8 years behind the Gregorian calendar.
 * Ethiopian New Year (Meskerem 1) corresponds to September 11 (or Sept 12 in Gregorian leap years).
 */

export interface EthiopianDate {
  year: number;
  month: number; // 1 to 13
  date: number; // 1 to 30 (or 1 to 6 for Pagume)
  monthNameEn: string;
  monthNameAm: string;
}

export const ETHIOPIAN_MONTHS = [
  { id: 1, en: 'Meskerem', am: 'መስከረም' },
  { id: 2, en: 'Tikimt', am: 'ጥቅምት' },
  { id: 3, en: 'Hidar', am: 'ኅዳር' },
  { id: 4, en: 'Tahsas', am: 'ታኅሣሥ' },
  { id: 5, en: 'Tir', am: 'ጥር' },
  { id: 6, en: 'Yakatit', am: 'የካቲት' },
  { id: 7, en: 'Megabit', am: 'መጋቢት' },
  { id: 8, en: 'Miyazya', am: 'ሚያዝያ' },
  { id: 9, en: 'Ginbot', am: 'ግንቦት' },
  { id: 10, en: 'Sene', am: 'ሰኔ' },
  { id: 11, en: 'Hamle', am: 'ሐምሌ' },
  { id: 12, en: 'Nehase', am: 'ነሐሴ' },
  { id: 13, en: 'Pagume', am: 'ጳጉሜ' },
];

/**
 * Converts a Gregorian Date to an Ethiopian Date
 */
export function gregorianToEthiopian(inputDate: Date | string): EthiopianDate {
  const gDate = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  if (isNaN(gDate.getTime())) {
    return {
      year: 2019,
      month: 1,
      date: 1,
      monthNameEn: 'Meskerem',
      monthNameAm: 'መስከረም',
    };
  }

  const gYear = gDate.getFullYear();
  const gMonth = gDate.getMonth() + 1; // 1-12
  const gDay = gDate.getDate();

  // Reference epoch offset algorithm
  // September 11 of Gregorian year Y is Meskerem 1 of Ethiopian year (Y - 8) if before Sept 11, or (Y - 7) after.
  // In the year before a Gregorian leap year, Ethiopian New Year is Sept 12.
  const isLeapGregorian = (gYear % 4 === 0 && gYear % 100 !== 0) || gYear % 400 === 0;
  const newYearDay = isLeapGregorian ? 12 : 11;

  let ethYear: number;
  let ethMonth: number;
  let ethDay: number;

  const sept11 = new Date(gYear, 8, newYearDay); // month index 8 is September
  const diffTime = gDate.getTime() - sept11.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    // Current Ethiopian year started this September
    ethYear = gYear - 7;
    ethMonth = Math.floor(diffDays / 30) + 1;
    ethDay = (diffDays % 30) + 1;
  } else {
    // Before Ethiopian New Year, still in previous Ethiopian year
    ethYear = gYear - 8;
    const prevYearSept11 = new Date(gYear - 1, 8, isLeapGregorian ? 11 : 11);
    const daysSincePrevSept11 = Math.floor((gDate.getTime() - prevYearSept11.getTime()) / (1000 * 60 * 60 * 24));
    ethMonth = Math.floor(daysSincePrevSept11 / 30) + 1;
    ethDay = (daysSincePrevSept11 % 30) + 1;
  }

  if (ethMonth > 13) {
    ethMonth = 13;
  }
  if (ethMonth === 13 && ethDay > 6) {
    ethDay = 6;
  }

  const monthObj = ETHIOPIAN_MONTHS[ethMonth - 1] || ETHIOPIAN_MONTHS[0];

  return {
    year: ethYear,
    month: ethMonth,
    date: ethDay,
    monthNameEn: monthObj.en,
    monthNameAm: monthObj.am,
  };
}

/**
 * Formats a date with dual calendar display (Ethiopian + Gregorian)
 */
export function formatDualDate(inputDate: Date | string, language: 'en' | 'am' = 'en'): string {
  const gDate = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  if (isNaN(gDate.getTime())) return '';

  const eth = gregorianToEthiopian(gDate);
  const gcFormatted = gDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (language === 'am') {
    return `${eth.monthNameAm} ${eth.date}፣ ${eth.year} ዓ.ም (${gcFormatted} ፈ)`;
  }
  return `${eth.monthNameEn} ${eth.date}, ${eth.year} EC (${gcFormatted} GC)`;
}

/**
 * Returns just the Ethiopian date string
 */
export function formatEthiopianDate(inputDate: Date | string, language: 'en' | 'am' = 'en'): string {
  const eth = gregorianToEthiopian(inputDate);
  if (language === 'am') {
    return `${eth.monthNameAm} ${eth.date}፣ ${eth.year} ዓ.ም`;
  }
  return `${eth.monthNameEn} ${eth.date}, ${eth.year} EC`;
}
