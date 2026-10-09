/**
 * Ethiopian Calendar (Ge'ez / Bahire Hasab) conversion utilities.
 * Uses exact Julian Day Number (JDN) astronomical epoch conversions.
 * The Ethiopian calendar has 12 months of 30 days plus 1 month of 5 or 6 days (Pagume).
 * It is approximately 7 to 8 years behind the Gregorian calendar.
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

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToEthiopian(jdn: number) {
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

/**
 * Converts a Gregorian Date to an Ethiopian Date
 */
export function gregorianToEthiopian(inputDate: Date | string): EthiopianDate {
  let gDate: Date;
  if (typeof inputDate === 'string') {
    // Handle string inputs like "2024-09-11"
    const parts = inputDate.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const jdn = gregorianToJdn(y, m, d);
        const eth = jdnToEthiopian(jdn);
        const mObj = ETHIOPIAN_MONTHS[eth.month - 1] || ETHIOPIAN_MONTHS[0];
        return {
          year: eth.year,
          month: eth.month,
          date: eth.day,
          monthNameEn: mObj.en,
          monthNameAm: mObj.am,
        };
      }
    }
    gDate = new Date(inputDate);
  } else {
    gDate = inputDate;
  }

  if (isNaN(gDate.getTime())) {
    return {
      year: 2017,
      month: 1,
      date: 1,
      monthNameEn: 'Meskerem',
      monthNameAm: 'መስከረም',
    };
  }

  const y = gDate.getFullYear();
  const m = gDate.getMonth() + 1;
  const d = gDate.getDate();

  const jdn = gregorianToJdn(y, m, d);
  const eth = jdnToEthiopian(jdn);
  const monthObj = ETHIOPIAN_MONTHS[eth.month - 1] || ETHIOPIAN_MONTHS[0];

  return {
    year: eth.year,
    month: eth.month,
    date: eth.day,
    monthNameEn: monthObj.en,
    monthNameAm: monthObj.am,
  };
}

/**
 * Formats a date with dual calendar display (Ethiopian + Gregorian)
 */
export function formatDualDate(
  inputDate: Date | string,
  language: 'en' | 'am' = 'en',
  preferEthiopian: boolean = true
): string {
  const gDate = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  if (isNaN(gDate.getTime())) return '';

  const eth = gregorianToEthiopian(inputDate);
  const gcFormatted = gDate.toLocaleDateString(language === 'am' ? 'en-GB' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (preferEthiopian) {
    if (language === 'am') {
      return `${eth.monthNameAm} ${eth.date}፣ ${eth.year} ዓ.ም (${gcFormatted} ፈ)`;
    }
    return `${eth.date} ${eth.monthNameEn} ${eth.year} EC (${gcFormatted} GC)`;
  } else {
    if (language === 'am') {
      return `${gcFormatted} ፈ (${eth.monthNameAm} ${eth.date}፣ ${eth.year} ዓ.ም)`;
    }
    return `${gcFormatted} GC (${eth.date} ${eth.monthNameEn} ${eth.year} EC)`;
  }
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
