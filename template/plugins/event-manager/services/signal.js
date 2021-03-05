'use strict';

const signalModel = () => strapi.plugins['event-manager'].models['signal'];


module.exports = {
  find(params) {
    return strapi.query('event-manager_signal').find(params);
  },

  findOne(params) {
    return strapi.query('event-manager_signal').findOne(params);
  },

  async create(data) {
    const validData = await strapi.entityValidator.validateEntityCreation(
      signalModel(), 
      data,
      {}
    );
    
    const entry = await strapi.query('event-manager_signal').create(validData);

    return entry;
  },
};
