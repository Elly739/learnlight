function asString(value) {
  if (value == null) return '';
  return String(value);
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return null;
}

function coerceNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const rule of schema) {
      const key = rule.key;
      const required = Boolean(rule.required);
      const allowNull = Boolean(rule.allowNull);
      const maxLen = rule.maxLen;
      const min = rule.min;
      const max = rule.max;
      const type = rule.type;
      const isArray = Boolean(rule.isArray);

      let value = body[key];

      if (value == null) {
        if (required) {
          errors.push(`${key} is required`);
        }
        continue;
      }

      if (allowNull && value === null) continue;

      if (isArray) {
        if (!Array.isArray(value)) {
          errors.push(`${key} must be an array`);
          continue;
        }
        continue;
      }

      if (type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`${key} must be a string`);
          continue;
        }
        if (maxLen != null && value.length > maxLen) {
          errors.push(`${key} is too long`);
          continue;
        }
        if (min != null && value.length < min) {
          errors.push(`${key} is too short`);
          continue;
        }
        continue;
      }

      if (type === 'number') {
        const n = coerceNumber(value);
        if (n == null) {
          errors.push(`${key} must be a number`);
          continue;
        }
        if (min != null && n < min) {
          errors.push(`${key} must be >= ${min}`);
          continue;
        }
        if (max != null && n > max) {
          errors.push(`${key} must be <= ${max}`);
          continue;
        }
        body[key] = n;
        continue;
      }

      if (type === 'boolean') {
        const b = coerceBoolean(value);
        if (b == null) {
          errors.push(`${key} must be a boolean`);
          continue;
        }
        body[key] = b;
        continue;
      }
    }

    if (errors.length) {
      return res.status(400).json({ error: 'Invalid payload', details: errors });
    }

    req.body = body;
    return next();
  };
}

module.exports = {
  validateBody
};
