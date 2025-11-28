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
const STRAPI_API_URL =
  "https://fearless-boot-f25ab4f58d.strapiapp.com/api/podcasts";

// Charge le fichier JSON à importer
const raw = fs.readFileSync(path.join("./scripts/podcasts.json"), "utf-8");
const json = JSON.parse(raw);

// Prépare les données (sans les images pour le moment)
const podcasts = json.data.map((item) => ({
  title: item.title,
  text: item.text,
  mediaplayer: item.mediaplayer,
  author: item.author,
  date: item.date,
  // image: item.image, // Temporairement désactivé - nécessite upload séparé
}));

console.log(`📥 ${podcasts.length} podcasts prêts à l’import`);

for (const podcast of podcasts) {
  try {
    // Vérifie si le spectacle existe déjà
    const resCheck = await fetch(
      `${STRAPI_API_URL}?filters[title][$eq]=${encodeURIComponent(podcast.title)}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    const existing = await resCheck.json();

    if (existing.data && existing.data.length > 0) {
      console.log(`⚠️ Déjà présent : ${podcast.title}`);
      continue;
    }

    // Crée le spectacle
    const resCreate = await fetch(STRAPI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: podcast }),
    });

    if (!resCreate.ok) {
      const errText = await resCreate.text();
      throw new Error(`HTTP ${resCreate.status}: ${errText}`);
    }

    console.log(`✅ Importé : ${podcast.title}`);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
  }
}

console.log("🎉 Import terminé !");
