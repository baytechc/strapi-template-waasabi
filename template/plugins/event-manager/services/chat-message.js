'use strict';

module.exports = {
  async create(data) {
    const plugin = 'event-manager',
      model = 'chat-message',
      modelObject = strapi.plugins[plugin].models[model];

    // TODO: maybe ditch validation for extra perf?
    const validData = await strapi.entityValidator.validateEntityCreation(
      modelObject,
      data,
      {}
    );
    
    const entry = await strapi.query(model, plugin).create(validData);

    return entry;
  },

  async update(params, data) {
    const plugin = 'event-manager',
      model = 'chat-message',
      modelObject = strapi.plugins[plugin].models[model];

    // TODO: maybe ditch validation for extra perf?
    const validData = await strapi.entityValidator.validateEntityCreation(
      modelObject,
      data,
      {}
    );
    
    const entry = await strapi.query(model, plugin).update(params, validData);

    return entry;
  },

};
