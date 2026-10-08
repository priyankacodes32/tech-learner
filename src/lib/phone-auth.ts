import { type CountryCode, parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(phone: string, country?: CountryCode) {
  const parsed = parsePhoneNumberFromString(phone, country);
  if (parsed?.isValid()) return parsed.number;
  return phone.replace(/[^\d+]/g, "");
}

export function isValidPhone(phone: string, country?: CountryCode) {
  return parsePhoneNumberFromString(phone, country)?.isValid() ?? false;
}

export function phoneToLoginEmail(phone: string) {
  return `${normalizePhone(phone).slice(1)}@phone.aster.local`;
}
