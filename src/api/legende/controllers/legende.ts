/**
 * legende controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::legende.legende', () => ({
  async find(ctx) {
    // Force le populate profond pour récupérer le glossaire avec les illustrations
    // On utilise 'on' pour cibler spécifiquement le composant glossaire dans la dynamic zone
    ctx.query = {
      ...ctx.query,
      populate: {
        layout: {
          on: {
            'shared.glossaire': {
              populate: {
                dico: {
                  populate: ['illustration'],
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
