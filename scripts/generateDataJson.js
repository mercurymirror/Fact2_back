// ./scripts/generateDataJson.js (CommonJS + import dynamique)
const fs = require("fs");

async function fetchSpectacles() {
  const fetch = (await import("node-fetch")).default; // <- import dynamique
  const response = await fetch("https://ciefact.herokuapp.com/spectacles");
  const json = await response.json();

  return json.map((spectacle) => {
    const image = spectacle.image
      ? {
          ...spectacle.image,
          formats: spectacle.image.formats || {},
          url: spectacle.image.url || null,
        }
      : null;

    const galery = Array.isArray(spectacle.galery)
      ? spectacle.galery.map((img) => ({
          ...img,
          formats: img.formats || {},
          url: img.url || null,
        }))
      : null;

    return {
      title: spectacle.title || null,
      description: spectacle.description || null,
      slug:
        spectacle.slug ||
        (spectacle.title
          ? spectacle.title.toLowerCase().replace(/\s+/g, "-")
          : null),
      image,
      galery,
    };
  });
}

async function generateDataJson() {
  const spectacles = await fetchSpectacles();
  const dataJson = { data: spectacles };
  fs.writeFileSync("./scripts/data.json", JSON.stringify(dataJson, null, 2));
  console.log("Fichier data.json généré avec succès !");
}

generateDataJson().catch((err) => {
  console.error(err);
  process.exit(1);
});
