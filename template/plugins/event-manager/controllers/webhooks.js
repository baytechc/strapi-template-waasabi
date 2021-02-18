const { Video, Webhooks } = require('@mux/mux-node');

// Required for getting the unparsed body (for signature check)
const unparsed = require('koa-body/unparsed');

const webhookSecret = process.env.MUX_WEBHOOK_SECRET;


module.exports = {
  // Determine incoming webhook type/source
  async index(ctx) {
    return strapi.plugins['event-manager'].controllers['webhooks'].post(ctx);
  },

  // HEAD /_integrations/mux
  async head(ctx) {
    ctx.send(200);
  },

  /* POST coming from Mux.com's webhook integration */
  // GET /_integrations/mux
  async post(ctx) {
    const { method, url, body } = ctx.request;
    const rawBody = ctx.request.body[unparsed];

    const webhookData = {
      method,
      url,
      signature: ctx.header['mux-signature'],
      event: body.event,
      object: body.object,
      data: body.data,
    };

    // Send early response
    ctx.send(200);


    try {
      const validBody = Webhooks.verifyHeader(rawBody, webhookData.signature, webhookSecret);
      if (!validBody) throw new Error('Invalid webhook signature!');

      console.log(`[integrations|mux] Incoming: ${body.type}`);

      try {
        await processMuxWebhook(body);
      }
      catch(e) {
        console.error(new Date().toISOString() + ' Failed to process Mux webhook: ', e);
      }

      // Add contents to inbound-webhooks
//      await strapi.query('inbound-webhooks').create({
//        source: 'mux.'+body.type,
//        contents: webhookData
//      });

    } catch (err) {
      // On error, return the error message
      console.error(err);
      return;
    }
  }

};


async function processMuxWebhook(h) {
  const { type } = h;

  switch (type) {

    case 'video.live_stream.active':
    {
      const stream_id = h.object.id
      const playback_id = h.data.playback_ids[0].id;
      console.log(`[integrations|mux] Live stream started: ${stream_id}`);

      const session = await findSessionForStream(stream_id);
      const message = `The session "${session.title}" is now live!`;

      pushMessage('stream', {
        event: 'live-now',
        message,
        data: {
          stream_id,
          playback_id,
          session
        }
      });
    }
    return;
    
    case 'video.live_stream.disconnected':
    {
      const stream_id = h.object.id
      console.log(`[integrations|mux] Live stream has ended: ${stream_id}`);

      const session = await findSessionForStream(stream_id);
      const message = `The session "${session.title}" livestream has ended!`;

      pushMessage('stream', {
        event: 'livestream-ended',
        message,
        data: {
          stream_id,
          session
        }
      });
    }
    return;

    case 'video.asset.live_stream_completed':
    {
      const asset_id = h.data.id;
      const stream_id = h.data.live_stream_id;
      const length = Math.round(h.data.duration);
      const playback_id = h.data.playback_ids[0].id;
      console.log(`[integrations|mux] Video asset from #${stream_id} now ready: ${length}s`);

      const session = await findSessionForStream(stream_id);
      const message = `The session "${session.title}" is now available for Replay!`;

      pushMessage('stream', {
        event: 'now-on-replay',
        message,
        data: {
          asset_id,
          length,
          stream_id,
          playback_id,
          session
        }
      });
    }
    return;

  }
}

async function pushMessage(type, message) {
  console.log('[integrations|mux] PUSH '+message.message);

  // TODO: PUBLISH to non-attendees too

  return await strapi.services['attendee-push'].create(
    { type, message, event: message.event }
  );
}

async function findSessionForStream(stream_id) {
  let ses = await strapi.services['livestream'].findOne({stream_id});

  if (ses) {
    return { id: ses.session.id, title: ses.session.title };
  }

  return null;
}
