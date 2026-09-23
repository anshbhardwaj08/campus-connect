// Is this string a key at all?
//
// The only job here is telling a real credential apart from a placeholder,
// so that an unset provider falls back to the keyword matcher instead of
// calling an API with "your-key-here" and failing. It is NOT validation —
// whether the key actually works is the API's answer to give, and a wrong
// key must produce a clear API error rather than a silent "not configured".
//
// Written this way after getting it wrong once: the first version required
// Gemini keys to start with `AIza` and be 39 characters, which is the old
// format. Google now issues 53-character keys beginning `AQ.`, so a
// perfectly good key read as "no provider configured" and the matcher
// quietly fell back with nothing to explain why. Guessing at prefixes a
// vendor is free to change is the mistake; a placeholder, on the other
// hand, always looks like a placeholder.

// Anything a person types when they mean "fill this in later".
//
// Matched on word boundaries, not anywhere in the string. A real key is
// random, so "here" or "todo" WILL eventually turn up inside one by chance —
// roughly one key in five thousand — and rejecting it would look exactly
// like the bug above: a silent fallback with no reason given. As a
// delimited word ("paste-key-here", "your-openai-key") it is a placeholder;
// buried in noise it is noise.
const PLACEHOLDER = /(^|[^a-z0-9])(your|paste|here|todo|placeholder|changeme|example|dummy|key)([^a-z0-9]|$)/i;

// Template markers. Nothing issues a key containing these.
const TEMPLATE = /[<>{}"'\s]/;

// xxxxxxxx, 00000000 — the other way people write "not filled in". Six in a
// row rather than three: three identical characters in a random 40-character
// key happens, six essentially never does.
const RUN = /(.)\1{5,}/;

/**
 * @param {string} raw
 * @param {object} opts
 * @param {number} opts.minLength   shortest a real key could be
 * @param {string} [opts.prefix]    required prefix, only where the vendor
 *                                  has actually committed to one
 */
const isPlausibleKey = (raw, { minLength = 30, prefix = null } = {}) => {
  const key = String(raw || '');

  if (key.length < minLength) return false;
  // Whitespace or brackets in a key is a paste accident, not a key.
  if (TEMPLATE.test(key)) return false;
  if (PLACEHOLDER.test(key)) return false;
  if (RUN.test(key)) return false;
  if (prefix && !key.startsWith(prefix)) return false;

  return true;
};

/**
 * Why a key was rejected, for the log. "No provider configured" when you
 * have plainly just pasted a key is the confusing case; this says which of
 * the two it is without printing the key.
 */
const describeRejection = (raw, opts = {}) => {
  const key = String(raw || '');
  if (!key) return 'not set';
  if (isPlausibleKey(key, opts)) return null;
  if (key.length < (opts.minLength || 30)) return `too short (${key.length} characters)`;
  if (TEMPLATE.test(key)) return 'contains whitespace or brackets — check what was pasted';
  if (PLACEHOLDER.test(key) || RUN.test(key)) return 'looks like a placeholder, not a key';
  if (opts.prefix) return `does not start with "${opts.prefix}"`;
  return 'unrecognised shape';
};

module.exports = { isPlausibleKey, describeRejection };
