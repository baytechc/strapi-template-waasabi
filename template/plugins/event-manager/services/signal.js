'use strict';


module.exports = {
  find(params) {
    return strapi.query('signal', 'event-manager').find(params);
  },

  findOne(params) {
    return strapi.query('signal', 'event-manager').findOne(params);
  },

  async create(data) {
    const validData = await strapi.entityValidator.validateEntityCreation(
      strapi.plugins['event-manager'].models['signal'], 
      data,
      {}
    );
    
    const entry = await strapi.query('signal', 'event-manager').create(validData);

    return entry;
  },
};
