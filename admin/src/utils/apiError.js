// Turns an axios error into something worth showing a student.
//
// The important case is the one that used to lie: when the request never
// reaches the server there is no `err.response` at all, and falling back to
// "That did not go through, try again" reads as "your details were wrong"
// when in fact nothing was ever checked. Say what actually happened instead.
//
// In dev it also names the likely cause, because the usual answer is that the
// API on port 5000 is not running.

const NO_RESPONSE =
  'No answer from the server. Check your connection and try again.';

const NO_RESPONSE_DEV =
  'No answer from the server. Is the API running on port 5000? (cd server && npm run dev)';

export function apiErrorMessage(err, fallback = 'Something went wrong. Try again.') {
  // The server spoke and told us why.
  const message = err?.response?.data?.message;
  if (message) return message;

  // The request never landed: server down, wrong URL, CORS, offline.
  if (!err?.response) {
    return import.meta.env.DEV ? NO_RESPONSE_DEV : NO_RESPONSE;
  }

  // The server answered, but with nothing we can quote.
  if (err.response.status >= 500) {
    return 'The server broke on that one. Try again in a minute.';
  }

  return fallback;
}

export default apiErrorMessage;
