const { Video, Webhooks } = require('@mux/mux-node');

// Required for getting the unparsed body (for signature check)
const unparsed = require('koa-body/unparsed');

const webhookSecret = process.env.MUX_WEBHOOK_SECRET;


module.exports = {
  // Determine incoming webhook type/source
  async receive(ctx) {
    return receiveMuxWebhook(ctx);
  },

  // Some services probe the endpoint before allowing webhooks to be sent
  // HEAD /_integrations/mux
  //async head(ctx) {
  //  ctx.send(200);
  //},

};

/* POST coming from Mux.com's webhook integration */
async function receiveMuxWebhook(ctx) {
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

  } catch (err) {
    // On error, return the error message
    console.error(err);
    return err;
  }
}

async function processMuxWebhook(h) {
  const { type } = h;

  switch (type) {

    case 'video.live_stream.active':
    {
      const stream_id = h.object.id
      const playback_id = h.data.playback_ids[0].id;
      console.log(`[integrations|mux] Live stream started: ${stream_id}`);

      const session = await findSessionForStream(stream_id);

      // Unknown session
      if (!session) {
        console.log(`Session not found for livestream ${stream_id}!`);
        break;
      }

      const message = `The session "${session.title}" is now live!`;

      signal({
        type: 'livestream',
        event: 'live-now',
        message,
        livestream: {
          stream_id,
          playback_id,
        },
        session,
      });
    }
    return;
    
    case 'video.live_stream.disconnected':
    {
      const stream_id = h.object.id
      console.log(`[integrations|mux] Live stream has ended: ${stream_id}`);

      const session = await findSessionForStream(stream_id);

      // Unknown session
      if (!session) {
        console.log(`Session not found for livestream ${stream_id}!`);
        break;
      }

      const message = `The session "${session.title}" livestream has ended!`;

      signal({
        type: 'livestream',
        event: 'ended',
        message,
        livestream: {
          stream_id,
        },
        session,
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

      // Unknown session
      if (!session) {
        console.log(`Session not found for livestream ${stream_id}!`);
        break;
      }

      const message = `The session "${session.title}" is now available for Replay!`;

      signal({
        type: 'livestream',
        event: 'replay-available',
        message,
        livestream: {
          asset_id,
          length,
          stream_id,
          playback_id,
        },
        session,
      });
    }
    return;

  }
}

async function signal(data) {
  const event = [data.type, data.event].join('.');

  console.log('[integrations|mux] PUSH '+event);

  return await strapi.plugins['event-manager'].services['signal'].create(
    { event, data }
  );
}

async function findSessionForStream(stream_id) {
  let ses = await strapi.services['livestream'].findOne({stream_id});

  if (ses) {
    return { id: ses.session.id, title: ses.session.title };
  }

  return null;
}
