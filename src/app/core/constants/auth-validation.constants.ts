import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/**
 * E-mail rules shared by account creation, login, and password-reset forms.
 *
 * Angular's built-in e-mail validator accepts domains without a dot. The
 * additional pattern requires a top-level domain with at least two letters,
 * while permitting valid TLDs longer than four characters.
 */
export const AUTH_EMAIL_VALIDATORS = [
  Validators.required,
  Validators.email,
  Validators.pattern(/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/),
];

/**
 * Name rules shared by account forms.
 *
 * Unicode letters are counted separately so spaces or digits cannot satisfy
 * the minimum of three letters in a display name.
 */
export const AUTH_NAME_VALIDATORS = [
  Validators.required,
  Validators.minLength(3),
  trimmedNameLength,
];

/**
 * Validates the number of Unicode letters in a display name.
 *
 * @param control - Angular form control containing the entered display name.
 * @returns A minlength validation error below three letters, otherwise null.
 */
function trimmedNameLength(control: AbstractControl): ValidationErrors | null {
  const length = typeof control.value === 'string'
    ? (control.value.match(/\p{L}/gu)?.length ?? 0) : 0;
  return length >= 3 ? null : { minlength: { requiredLength: 3, actualLength: length } };
}

/**
 * Registration passwords need six non-padding characters and may not consist
 * solely of whitespace. Significant internal spaces remain unchanged.
 */
export const AUTH_PASSWORD_VALIDATORS = [Validators.required, validPasswordContent];

/**
 * Validates meaningful password length without silently changing credentials.
 *
 * @param control - Password control supplied by the registration form.
 * @returns An actionable password error or null when the input is valid.
 */
function validPasswordContent(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  if (!value) return null;
  const trimmedLength = value.trim().length;
  if (!trimmedLength) return { whitespaceOnly: true };
  return trimmedLength >= 6 ? null : { minlength: { requiredLength: 6, actualLength: trimmedLength } };
}
