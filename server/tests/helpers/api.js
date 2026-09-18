// The real Express app over real HTTP, on a random port.
//
// Deliberately not a mock and not supertest: the auth this product uses is
// httpOnly cookies, and the thing most likely to break is a cookie not
// being set, not being sent back, or not being cleared. That only shows up
// over a real request/response with a real cookie jar.

require('./env');

const http = require('http');
const app = require('../../src/app');

let server;
let base;

const startApi = async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  return base;
};

const stopApi = () => new Promise((resolve) => (server ? server.close(resolve) : resolve()));

// One client is one browser: it keeps its own cookies, so two clients in the
// same test are two signed-in people who cannot see each other's session.
const client = () => {
  const jar = new Map();

  const request = async (method, path, body) => {
    const headers = {};
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

    let payload;
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const res = await fetch(base + path, { method, headers, body: payload });

    const setCookies = res.headers.getSetCookie();
    for (const raw of setCookies) {
      const pair = raw.split(';')[0];
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1);
      // An empty value is a clear — logout sends one for each cookie.
      if (value) jar.set(name, value);
      else jar.delete(name);
    }

    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }

    // The raw Set-Cookie lines as well as the jar: two JWTs minted for the
    // same user in the same second are byte-identical, so "did this response
    // set a new cookie?" cannot be answered by comparing values.
    return { status: res.status, body: json, setCookies };
  };

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
    cookies: jar,
  };
};

module.exports = { startApi, stopApi, client };
