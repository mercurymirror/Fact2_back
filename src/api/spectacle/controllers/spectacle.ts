/**
 * spectacle controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::spectacle.spectacle', ({ strapi }) => ({
  async find(ctx) {
    // Populate profond automatique pour plus_qu_une_pieces
    ctx.query = {
      ...ctx.query,
      populate: {
        cast: true,
        image: true,
        gallery: true,
        plus_qu_une_pieces: {
          populate: {
            cast: true,
            gallery: true,
          },
        },
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    // Populate profond automatique pour plus_qu_une_pieces
    ctx.query = {
      ...ctx.query,
      populate: {
        cast: true,
        image: true,
        gallery: true,
        plus_qu_une_pieces: {
          populate: {
            cast: true,
            gallery: true,
          },
        },
      },
    };

    const { data, meta } = await super.findOne(ctx);
    return { data, meta };
  },
}));
