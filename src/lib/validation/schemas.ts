import { z } from "zod";

// Normalize Kenyan phone numbers to Safaricom's 2547XXXXXXXX / 2541XXXXXXXX format.
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s+-]/g, "");
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export function formatPhoneDisplay(phone: string): string {
  // 254712345678 -> +254 712 345 678
  if (/^254\d{9}$/.test(phone)) {
    return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  return phone;
}

export const phoneSchema = z
  .string()
  .min(9, "Enter a valid phone number")
  .transform((val) => normalizeKenyanPhone(val))
  .refine((val): val is string => val !== null, "Enter a valid Kenyan phone number e.g. 0712 345 678");

export const nationalIdSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, "National ID should be 6–10 digits");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

export const nameSchema = z
  .string()
  .trim()
  .min(3, "Enter your full name")
  .max(80, "Name is too long");

export const dobSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid date")
  .refine((val) => {
    const age = (Date.now() - Date.parse(val)) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  }, "You must be at least 18 years old")
  .refine((val) => {
    const age = (Date.now() - Date.parse(val)) / (365.25 * 24 * 3600 * 1000);
    return age <= 100;
  }, "Enter a valid date of birth");
