/**
 * membre controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::membre.membre", () => ({
  async find(ctx) {
    // Populate participations avec uniquement le titre et slug du spectacle
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

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    // Populate participations avec uniquement le titre et slug du spectacle
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
