/**
 * legende controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::legende.legende', () => ({
  async find(ctx) {
    // Force le populate profond pour récupérer le glossaire avec les illustrations
    // Pour les dynamic zones, on doit utiliser '*' car elles sont polymorphiques
    ctx.query = {
      ...ctx.query,
      populate: {
        layout: {
          populate: '*',
        },
      },
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
