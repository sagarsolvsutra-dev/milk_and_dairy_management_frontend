export const MOBILE_REGEX = /^\d{10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const LOGIN_ID_REGEX = /^[a-zA-Z0-9._-]+$/;

export function validateMobile(value: string, { required = true } = {}): string | undefined {
  if (!value) return required ? "Mobile number is required" : undefined;
  if (!MOBILE_REGEX.test(value)) return "Mobile number must be exactly 10 digits";
  return undefined;
}

export function validateEmail(value: string, { required = true } = {}): string | undefined {
  if (!value) return required ? "Email is required" : undefined;
  if (!EMAIL_REGEX.test(value)) return "Please enter a valid email address";
  return undefined;
}

export function validateIfsc(value: string, { required = true } = {}): string | undefined {
  if (!value) return required ? "IFSC code is required" : undefined;
  if (!IFSC_REGEX.test(value.toUpperCase())) return "Please enter a valid IFSC code (e.g. SBIN0001234)";
  return undefined;
}

export function validateLoginId(value: string): string | undefined {
  if (!value) return "Login ID is required";
  if (value.length < 3) return "Login ID must be at least 3 characters";
  if (!LOGIN_ID_REGEX.test(value)) return "Login ID can only contain letters, numbers, dots, underscores and hyphens";
  return undefined;
}

export function validateRequired(value: string | number | undefined | null, label = "This field"): string | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return `${label} is required`;
  return undefined;
}

export function validateMinLength(value: string, min: number, label = "This field"): string | undefined {
  if (value && value.length < min) return `${label} must be at least ${min} characters`;
  return undefined;
}

export function validatePositiveNumber(value: string | number, label = "This field"): string | undefined {
  const num = Number(value);
  if (value === "" || value === undefined || value === null) return `${label} is required`;
  if (Number.isNaN(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return undefined;
}

export function validateNonNegativeNumber(value: string | number, label = "This field"): string | undefined {
  const num = Number(value);
  if (value === "" || value === undefined || value === null) return undefined;
  if (Number.isNaN(num)) return `${label} must be a number`;
  if (num < 0) return `${label} cannot be negative`;
  return undefined;
}

export function validatePercent(value: string | number, label = "Percent"): string | undefined {
  const num = Number(value);
  if (value === "" || value === undefined || value === null) return `${label} is required`;
  if (Number.isNaN(num)) return `${label} must be a number`;
  if (num < 0 || num > 100) return `${label} must be between 0 and 100`;
  return undefined;
}

/** Collects the first truthy error per field from a set of {field: () => error} checks. */
export function runValidation<T extends string>(
  checks: Record<T, () => string | undefined>
): { errors: Partial<Record<T, string>>; isValid: boolean } {
  const errors = {} as Partial<Record<T, string>>;
  (Object.keys(checks) as T[]).forEach((field) => {
    const error = checks[field]();
    if (error) errors[field] = error;
  });
  return { errors, isValid: Object.keys(errors).length === 0 };
}
