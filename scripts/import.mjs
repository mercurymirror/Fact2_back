// ./scripts/import.mjs
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// Récupère le token depuis la variable d'environnement
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
if (!STRAPI_API_TOKEN) {
  console.error(
    "❌ Veuillez définir STRAPI_API_TOKEN avant d'exécuter le script"
  );
  process.exit(1);
}

// URL de l'API distante Strapi
const STRAPI_API_URL = "https://fact2-back.onrender.com/api/spectacles";

// Charge le fichier JSON à importer
const raw = fs.readFileSync(path.join("./scripts/spectacles.json"), "utf-8");
const json = JSON.parse(raw);

// Prépare les données
const spectacles = json.data.map((item) => ({
  title: item.title,
  description: item.description,
  slug: item.slug,
}));

console.log(`📥 ${spectacles.length} spectacles prêts à l’import`);

for (const spectacle of spectacles) {
  try {
    // Vérifie si le spectacle existe déjà
    const resCheck = await fetch(
      `${STRAPI_API_URL}?filters[title][$eq]=${encodeURIComponent(spectacle.title)}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    const existing = await resCheck.json();

    if (existing.data && existing.data.length > 0) {
      console.log(`⚠️ Déjà présent : ${spectacle.title}`);
      continue;
    }

    // Crée le spectacle
    const resCreate = await fetch(STRAPI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: spectacle }),
    });

    if (!resCreate.ok) {
      const errText = await resCreate.text();
      throw new Error(`HTTP ${resCreate.status}: ${errText}`);
    }

    console.log(`✅ Importé : ${spectacle.title}`);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
  }
}

console.log("🎉 Import terminé !");
