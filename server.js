import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import geminiRouter from "./gemini-route.js";

const app = express();
const dir = path.dirname(fileURLToPath(import.meta.url));

const RESOURCES = [
  { title: "Hypertension (high blood pressure) fact sheet", source: "WHO", description: "Global overview of causes, risks and prevention.", url: "https://www.who.int/news-room/fact-sheets/detail/hypertension" },
  { title: "High blood pressure", source: "CDC", description: "Facts, risk factors and prevention tips.", url: "https://www.cdc.gov/high-blood-pressure/" },
  { title: "High blood pressure (hypertension)", source: "NHS", description: "Symptoms, tests and treatment explained simply.", url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/" },
  { title: "High blood pressure", source: "MedlinePlus", description: "Plain-language health topic summary.", url: "https://medlineplus.gov/highbloodpressure.html" },
  { title: "Diabetes fact sheet", source: "WHO", description: "Types of diabetes, blood glucose and prevention.", url: "https://www.who.int/news-room/fact-sheets/detail/diabetes" },
  { title: "Diabetes", source: "CDC", description: "Understanding blood sugar and managing risk.", url: "https://www.cdc.gov/diabetes/" },
  { title: "Diabetes", source: "NHS", description: "Symptoms, diagnosis and living with diabetes.", url: "https://www.nhs.uk/conditions/diabetes/" },
  { title: "Physical activity fact sheet", source: "WHO", description: "Recommended activity levels for adults and children.", url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity" },
  { title: "Healthy diet fact sheet", source: "WHO", description: "What a balanced, healthy diet looks like.", url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet" },
  { title: "About sleep", source: "CDC", description: "Why sleep matters and how much you need.", url: "https://www.cdc.gov/sleep/" }
];

app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/resources", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  const results = q
    ? RESOURCES.filter((r) => `${r.title} ${r.description} ${r.source}`.toLowerCase().includes(q))
    : RESOURCES;
  res.json({ query: q, count: results.length, results });
});

app.use("/api", geminiRouter);                                   // POST /api/chat
app.use("/api", (req, res) => res.status(404).json({ error: "API route not found" }));
const pub = path.join(dir, "public");
app.use(express.static(pub));
app.get("/", (req, res) => {
  const a = path.join(pub, "index.html");
  const b = path.join(dir, "index.html");
  const file = fs.existsSync(a) ? a : fs.existsSync(b) ? b : null;
  if (!file) return res.status(500).send("index.html is missing. Put it at public/index.html in your repo.");
  res.sendFile(file);
});

app.listen(process.env.PORT || 3000, () => console.log("TwinCare AI running"));
