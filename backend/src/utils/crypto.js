const crypto = require("crypto");
const { cryptoSecret } = require("../config").app;

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const KEY = crypto.scryptSync(cryptoSecret, "salt", 32);


function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(text) {
  const [ivHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { sha256, encrypt, decrypt };