const { sanitizeEntity } = require('strapi-utils');

module.exports = { process };


async function process(body) {
  const { event, data } = body;

  try {
    // Incoming message
    if (event === 'new-message') {
      return newMessage(data);
    }
    
    // Incoming channel information
    if (event === 'channel-info') {
      return channelInfo(data);
    }
  }
  catch(e) {
    console.log(`matrix ${type} hook processing failed`);
    console.error(new Date().toISOString(), e);
  }
}

async function newMessage(data) {
  console.log(`Incoming message:`, data);
  await strapi.plugins['event-manager'].services['chat-message'].create(data);
}

async function channelInfo(data) {

  for (c of data) {
    const channel = {
      type: 'matrix',
      name: c.name,
      alias: c.alias,
      topic: c.topic,
    };


    // Don't bother with rooms with 'null' names
    if (typeof c.name !== 'string') {
      console.log(`[matrix] WARNING ${c.alias||c.id}: name is NULL`);
    }

    let res;
    try {
      res = await strapi.plugins['event-manager'].services['chat-channel'].update(
        { channel_id: c.id },
        { channel_id: c.id, ...channel }
      );
      console.log(`[matrix] Updated ${res.alias||res.channel_id} (${res.name})`);
    }
    catch (e) {
      if (e.message !== 'entry.notFound') {
        console.error(`[matrix] Failed updating ${c.alias||c.id} (${e.message})`);
      }
    }

    // No room was updated, probably because it doesnt exist & we need to create it
    if (!res) {
      try {
        const newChannel  = {
          channel_id: c.id,
          published_at: null, // Create unpublished
          ...channel
        };

        res = await strapi.plugins['event-manager'].services['chat-channel'].create(
          newChannel
        );
        console.log(`[matrix] Created ${res.alias||res.channel_id} (${res.name})`);
      }
      catch (e) {
        console.error(`[matrix] Failed creating ${c.alias||c.id} (${e.message})`);
      }
    }

  }//endfor


}