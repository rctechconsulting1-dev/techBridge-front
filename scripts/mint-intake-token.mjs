import { createHmac } from "node:crypto";

const secret = process.env.EMAIL_INTAKE_SECRET || "change-me-in-production-intake";
const [email, tenantIdArg] = process.argv.slice(2);
const tenantId = Number(tenantIdArg);

if (!email || !Number.isFinite(tenantId)) {
  console.log("Usage: node scripts/mint-intake-token.mjs <email> <tenantId>");
  process.exit(1);
}

const payload = Buffer.from(
  JSON.stringify({
    email,
    tenantId,
    businessType: "universal",
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
).toString("base64url");

const sig = createHmac("sha256", secret).update(payload).digest("base64url");
console.log(`${payload}.${sig}`);
