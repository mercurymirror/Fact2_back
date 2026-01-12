/**
 * agenda controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::agenda.agenda", () => ({
  async find(ctx) {
    // Populate les relations nécessaires pour l'affichage de l'agenda
    ctx.query = {
      ...ctx.query,
      populate: {
        spectacle: {
          fields: ["id", "title", "slug", "color", "styledTitle"],
          populate: {
            image: {
              fields: ["id", "url", "alternativeText"],
            },
          },
        },
        plus_qu_une_piece: {
          fields: ["id", "title", "slug", "color", "styledTitle"],
          populate: {
            spectacle: {
              fields: ["id", "title", "slug", "color"],
              populate: {
                image: {
                  fields: ["id", "url", "alternativeText"],
                },
              },
            },
          },
        },
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
