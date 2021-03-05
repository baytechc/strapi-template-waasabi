'use strict';

const { sanitizeEntity } = require('strapi-utils');


module.exports = {

  async find(ctx) {
    let entities = await strapi.plugins['event-manager'].services['signal'].find(ctx.query);

    return entities.map(entity => sanitizeEntity(entity, { model: signalModel() }));
  },

  async create(ctx) {
    let entity = await strapi.plugins['event-manager'].services['signal'].create(ctx.request.body);

    return sanitizeEntity(entity, { model: signalModel() });
  },
};
