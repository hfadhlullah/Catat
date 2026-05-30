import fs from "node:fs";
import { ConvexHttpClient } from "convex/browser";

function loadLocalEnv() {
  const file = ".env.local";
  if (!fs.existsSync(file)) return;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readLocalAdminKey() {
  const file = ".convex/local/default/config.json";
  if (!fs.existsSync(file)) return null;
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  return config.adminKey ?? null;
}

loadLocalEnv();

const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? readLocalAdminKey();
const statusOnly = process.argv.includes("--status");

if (!deploymentUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

if (!adminKey) {
  throw new Error("CONVEX_SELF_HOSTED_ADMIN_KEY is required");
}

const client = new ConvexHttpClient(deploymentUrl);
client.setAdminAuth(adminKey);

const before = await client.query("adminMigrations:getTransactionBackfillStatus", {});

if (statusOnly) {
  console.log(JSON.stringify({ before }, null, 2));
  process.exit(0);
}

const migration = await client.mutation("adminMigrations:runTransactionBackfill", {});
const after = await client.query("adminMigrations:getTransactionBackfillStatus", {});

console.log(JSON.stringify({ before, migration, after }, null, 2));
