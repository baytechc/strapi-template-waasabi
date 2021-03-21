'use strict';

const strapiContentTypes = require('strapi-utils').contentTypes;


module.exports = {
  async create(data) {
    const plugin = 'event-manager',
      model = 'chat-channel',
      modelObject = strapi.plugins[plugin].models[model];

    const isDraft = strapiContentTypes.isDraft(data, modelObject);
    const validData = await strapi.entityValidator.validateEntityCreation(
      modelObject,
      data,
      { isDraft }
    );
    
    const entry = await strapi.query(model, plugin).create(validData);

    return entry;
  },

  async update(params, data) {
    const plugin = 'event-manager',
      model = 'chat-channel',
      modelObject = strapi.plugins[plugin].models[model];

    const existingEntry = await strapi.query(model, plugin).findOne(params);

    const isDraft = strapiContentTypes.isDraft(existingEntry, modelObject);
    const validData = await strapi.entityValidator.validateEntityCreation(
      modelObject,
      data,
      { isDraft }
    );
    
    const entry = await strapi.query(model, plugin).update(params, validData);

    return entry;
  },

};
