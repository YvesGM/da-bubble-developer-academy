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
 * Whitespace is excluded from the length check so a single-letter name padded
 * with spaces cannot pass the minimum of three visible characters.
 */
export const AUTH_NAME_VALIDATORS = [
  Validators.required,
  Validators.minLength(3),
  trimmedNameLength,
];

/**
 * Validates the length of a name after surrounding whitespace is removed.
 *
 * @param control - Angular form control containing the entered display name.
 * @returns A minlength validation error below three characters, otherwise null.
 */
function trimmedNameLength(control: AbstractControl): ValidationErrors | null {
  const length = typeof control.value === 'string' ? control.value.trim().length : 0;
  return length >= 3 ? null : { minlength: { requiredLength: 3, actualLength: length } };
}
