const crypto = require("crypto");
const { tokenSecret, tokenTtlMs } = require("../config");

// Stateless signed admin token: base64url(expiry).HMAC — survives restarts if TOKEN_SECRET is set.
const sign = (p) =>
  crypto.createHmac("sha256", tokenSecret).update(p).digest("base64url");

exports.issue = () => {
  const p = Buffer.from(String(Date.now() + tokenTtlMs)).toString("base64url");
  return `${p}.${sign(p)}`;
};

exports.verify = (token) => {
  const [p, sig] = String(token || "").split(".");
  if (!p || !sig) return false;
  const a = Buffer.from(sig),
    b = Buffer.from(sign(p));
  return (
    a.length === b.length &&
    crypto.timingSafeEqual(a, b) &&
    Number(Buffer.from(p, "base64url").toString()) > Date.now()
  );
};
