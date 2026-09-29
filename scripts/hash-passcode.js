// Run with: npm run hash-passcode -- "your-passcode-here"
// Prints a value in the same "salt:hash" format src/lib/auth.ts expects,
// for pasting into app_settings.passcode_hash (see README "First deploy").
const crypto = require("crypto");

const passcode = process.argv[2];
if (!passcode) {
  console.error('Usage: npm run hash-passcode -- "your-passcode-here"');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const derivedKey = crypto.scryptSync(passcode, salt, 64);
console.log(`${salt.toString("hex")}:${derivedKey.toString("hex")}`);
