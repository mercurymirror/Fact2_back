/**
 * membre controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::membre.membre", () => ({
  async find(ctx) {
    // Si un filtre par slug est présent (page détail), on inclut les participations.
    // Sinon (liste), on ne peuple que l'illustration.
    const filters = ctx.query?.filters as Record<string, unknown> | undefined;
    const hasSlugFilter = !!(filters && "slug" in filters);

    ctx.query = {
      ...ctx.query,
      populate: {
        illustration: true,
        ...(hasSlugFilter
          ? {
              participations: {
                populate: {
                  spectacle: {
                    fields: ["title", "styledTitle", "slug"],
                  },
                },
              },
            }
          : {}),
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
