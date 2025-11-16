export function isValidEmail(email: string): boolean {
  if (!email) return false;
  // Simple RFC 5322-ish email check; sufficient for client-side UX
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(String(email).toLowerCase());
}

export function emailError(email: string): string | null {
  if (!email || email.trim().length === 0) return 'Email is required';
  if (!isValidEmail(email)) return 'Enter a valid email address';
  return null;
}

export function passwordError(password: string, min: number = 8): string | null {
  if (!password || password.length === 0) return 'Password is required';
  if (password.length < min) return `Password must be at least ${min} characters`;
  return null;
}

export function confirmPasswordError(password: string, confirm: string): string | null {
  if (!confirm || confirm.length === 0) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}
