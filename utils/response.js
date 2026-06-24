// Standardised API response helpers

export const ok = (data = null, meta = {}) => ({
  success: true,
  data,
  ...meta,
});

export const created = (data = null) => ({
  success: true,
  created: true,
  data,
});

export const unauthorized = (message = 'Unauthorized') => ({
  success: false,
  error: message,
});

export const badRequest = (message = 'Bad request') => ({
  success: false,
  error: message,
});

export const notFound = (resource = 'Resource') => ({
  success: false,
  error: `${resource} not found`,
});

export const serverError = (message = 'Internal server error') => ({
  success: false,
  error: message,
});
