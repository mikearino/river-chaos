const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { isIP } = require("node:net");
const { X509Certificate } = require("node:crypto");

function getConnectionOptions(env = process.env) {
  const host = env.DB_HOST;
  if (typeof host !== "string" || !host || host !== host.trim()) {
    throw new Error("DB_HOST is required and must not contain surrounding whitespace");
  }
  // Only non-production loopback connections may use plaintext local MySQL.
  const local = ["localhost", "127.0.0.1", "::1"].includes(host);
  let ssl;
  if (env.NODE_ENV === "production" || !local) {
    // mysql2 skips hostname verification for IP literals; require a DNS endpoint.
    if (isIP(host) || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)) {
      throw new Error("Verified database TLS requires a DNS hostname in DB_HOST");
    }
    const ca = readFileSync(join(__dirname, "../certs/global-bundle.pem"), "utf8");
    const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    if (!certificates || !certificates.every((pem) => new X509Certificate(pem).ca)) {
      throw new Error("Invalid AWS RDS CA bundle");
    }
    ssl = { ca, rejectUnauthorized: true, verifyIdentity: true, minVersion: "TLSv1.2" };
  }
  return {
    host,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    ...(ssl ? { ssl } : {}),
  };
}

module.exports = { getConnectionOptions };
