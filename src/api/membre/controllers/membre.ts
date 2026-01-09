/**
 * membre controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::membre.membre", () => ({
  async find(ctx) {
    // Pour la liste : uniquement l'illustration
    // Utilisé dans : home, infos, generateStaticParams
    // Aucun de ces usages n'a besoin des participations
    ctx.query = {
      ...ctx.query,
      populate: {
        illustration: true,
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    // Pour le détail : tout avec les participations
    ctx.query = {
      ...ctx.query,
      populate: {
        illustration: true,
        participations: {
          populate: {
            spectacle: {
              fields: ["title", "styledTitle", "slug"],
            },
          },
        },
      },
    };

    const { data, meta } = await super.findOne(ctx);
    return { data, meta };
  },
}));
