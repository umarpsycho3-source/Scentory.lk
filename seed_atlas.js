require('dotenv').config();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("FAIL: MONGODB_URI environment variable is required.");
  process.exit(1);
}
const DB_PATH = path.join(__dirname, "server", "data", "database.json");

async function seed() {
  console.log("Seeding SCENTORY.LK data into MongoDB Atlas...");
  if (!fs.existsSync(DB_PATH)) { console.error("database.json not found"); process.exit(1); }
  const localData = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log("Connected to Atlas!");
  const db = client.db("scentory");
  const col = db.collection("store_data");
  const existing = await col.countDocuments();
  if (existing > 0) { console.log("Clearing existing data..."); await col.deleteMany({}); }
  await col.insertOne({ ...localData, _type: "store_data", updatedAt: new Date() });
  console.log("Seeded! Products:", (localData.products||[]).length, "Users:", (localData.users||[]).length, "Orders:", (localData.orders||[]).length);
  await client.close();
  console.log("DONE - Ready for Vercel!");
}
seed().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
