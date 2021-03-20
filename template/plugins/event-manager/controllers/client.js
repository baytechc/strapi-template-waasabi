'use strict';

const { sanitizeEntity } = require('strapi-utils');


module.exports = {

  async livestream(ctx) {
    let entities = await strapi.plugins['event-manager'].services['signal'].find({
      event_in: [ 'livestream.live-now','livestream.ended' ],
      _limit: 1,
      _sort: 'created_at:desc'
    });

    return entities.map(
      entity => sanitizeEntity(entity, { model: strapi.plugins['event-manager'].models['signal'] })
    );
  },

  async replays(ctx) {
    let entities = await strapi.plugins['event-manager'].services['signal'].find({
      event_in: [ 'livestream.replay-available' ],
      _limit: 100,
      _sort: 'created_at:desc'
    });

    return entities.map(
      entity => sanitizeEntity(entity, { model: strapi.plugins['event-manager'].models['signal'] })
    ).map(e => Object.assign({ date: e.created_at }, e.data));
  },

};
