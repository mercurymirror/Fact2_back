// ./scripts/generateDataJson.js (CommonJS + import dynamique)
const fs = require("fs");

async function fetchPodcasts() {
  const fetch = (await import("node-fetch")).default; // <- import dynamique
  const response = await fetch("https://ciefact.herokuapp.com/podcasts");
  const json = await response.json();

  return json.map((podcast) => {
    const image = podcast.image
      ? {
          ...podcast.image,
          formats: podcast.image.formats || {},
          url: podcast.image.url || null,
        }
      : null;

    return {
      title: podcast.title || null,
      text: podcast.text || null,
      mediaplayer: podcast.mediaplayer || null,
      author: podcast.author || null,
      date: podcast.date || null,
      image,
    };
  });
}

async function generateDataJson() {
  const podcasts = await fetchPodcasts();
  const dataJson = { data: podcasts };
  fs.writeFileSync("./scripts/data.json", JSON.stringify(dataJson, null, 2));
  console.log("Fichier data.json généré avec succès !");
}

generateDataJson().catch((err) => {
  console.error(err);
  process.exit(1);
});
