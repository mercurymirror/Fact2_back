/**
 * spectacle controller
 */

import { factories } from "@strapi/strapi";

const IMAGE_FIELDS = ["url", "alternativeText", "width", "height"];

// Configuration centralisée du populate
const DEFAULT_POPULATE = {
  cast: true,
  image: { fields: IMAGE_FIELDS },
  gallery: { fields: IMAGE_FIELDS },
  dossier_de_diffusion: true,
  plus_qu_une_pieces: {
    populate: {
      cast: true,
      gallery: { fields: IMAGE_FIELDS },
    },
  },
};

export default factories.createCoreController(
  "api::spectacle.spectacle",
  () => ({
    async find(ctx) {
      // Appliquer le populate par défaut seulement si aucun populate n'est spécifié
      if (!ctx.query.populate) {
        ctx.query.populate = DEFAULT_POPULATE;
      }

      const { data, meta } = await super.find(ctx);
      return { data, meta };
    },

    async findOne(ctx) {
      // Appliquer le populate par défaut seulement si aucun populate n'est spécifié
      if (!ctx.query.populate) {
        ctx.query.populate = DEFAULT_POPULATE;
      }

      const { data, meta } = await super.findOne(ctx);
      return { data, meta };
    },
  }),
);
