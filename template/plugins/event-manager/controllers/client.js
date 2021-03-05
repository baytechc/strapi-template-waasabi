'use strict';

const { sanitizeEntity } = require('strapi-utils');


module.exports = {

  async livestream(ctx) {
    let entities = await strapi.plugins['event-manager'].services['signal'].find({
      event_in: [ 'livestream.live-now','livestream.ended' ],
      _limit: 1,
      _sort: 'created_at:desc'
    });

    console.log(entities);

    return entities.map(
      entity => sanitizeEntity(entity, { model: strapi.plugins['event-manager'].models['signal'] })
    );
  },

  async replays(ctx) {
    return ctx.send(200);
  },

};
