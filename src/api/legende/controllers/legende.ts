/**
 * legende controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::legende.legende', () => ({
  async find(ctx) {
    // Force le populate profond pour récupérer le glossaire avec les illustrations
    ctx.query = {
      ...ctx.query,
      populate: {
        layout: {
          populate: {
            dico: {
              populate: {
                illustration: true,
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
