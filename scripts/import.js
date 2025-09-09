// ./scripts/importSpectacles.js
const path = require("path");
const { createStrapi } = require("@strapi/strapi");
const fs = require("fs");

async function run() {
  const app = createStrapi({ distDir: path.join(__dirname, "..", "dist") });
  await app.load();

  // Charger le fichier export JSON
  const raw = fs.readFileSync(path.join(__dirname, "spectacles.json"), "utf8");
  const json = JSON.parse(raw);

  // Extraire uniquement les données utiles
  const spectacles = json.data.map((item) => ({
    title: item.title,
    description: item.description,
    slug: item.slug,
  }));

  console.log(`📥 ${spectacles.length} spectacles prêts à l’import`);

  for (const spectacle of spectacles) {
    try {
      // Vérifie si un spectacle avec le même titre existe déjà
      const existing = await app
        .documents("api::spectacle.spectacle")
        .findMany({
          filters: { title: spectacle.title },
        });

      if (existing.length > 0) {
        console.log(`⚠️ Déjà présent : ${spectacle.title}`);
        continue;
      }

      // Crée le spectacle
      await app
        .documents("api::spectacle.spectacle")
        .create({ data: spectacle });
      console.log(`✅ Importé : ${spectacle.title}`);
    } catch (err) {
      console.error("❌ Erreur:", err.message);
    }
  }

  await app.destroy();
  console.log("🎉 Import terminé !");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
