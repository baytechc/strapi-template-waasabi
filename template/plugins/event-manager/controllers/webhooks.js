const { Video, Webhooks } = require('@mux/mux-node');

// Required for getting the unparsed body (for signature check)
const unparsed = require('koa-body/unparsed');

const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

const crypto = require('crypto');

function computeSignature(payload, secret, buffer = false) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest(buffer ? undefined : 'hex');
}

function verifySignature(payload, signature, secret) {
  const sharedSig = signature instanceof Buffer ? signature : Buffer.from(signature, 'hex');
  const payloadSig = computeSignature(payload, secret, true);

  return sharedSig.byteLength === payloadSig.byteLength && crypto.timingSafeEqual(sharedSig, payloadSig);
}

module.exports = {
  // Determine incoming webhook type/source
  async receive(ctx) {
    // Mux signed webhook
    if (ctx.header['mux-signature']) {
      return receiveMuxWebhook(ctx);
    }

    // HMAC-SHA256-based webhook
    if (ctx.header['hmac-sha256']) {
      return receiveWebhook(ctx);
    }

    // None of the above? Bad Request
    ctx.send(400);
  },

  // Some services probe the endpoint before allowing webhooks to be sent
  // HEAD /_integrations/mux
  //async head(ctx) {
  //  ctx.send(200);
  //},
};

/* POST from any HMAC-SHA256-compatible webhook integration */
async function receiveWebhook(ctx) {
  const payload = ctx.request.body[unparsed];
  const signature = ctx.header['hmac-sha256'];
  const secret = process.env.WEBHOOKS_HMAC_SECRET;

  if (!secret) {
    console.log('[webhooks] Warning! Shared Webhook signature secret is undefined!');
  }

  const verified = verifySignature(payload, signature, secret);

  // Webhook signature accepted
  if (verified) {
    ctx.send(200);

    return processWebhook(ctx)

  // Webhook signature invalid
  } else {
    throw new Error('Invalid webhook signature!');
  }
}

/* POST coming from Mux.com's webhook integration */
async function processWebhook(ctx) {
  const { body } = ctx.request;
  const { sender, event, type, video } = body.data;

  console.log(`[webhooks] Incoming: ${sender}/${event}`);
  console.log(body);

  const stream_id = video.uuid;
  const playback_id = video.uuid;

  const session = await findSessionForStream(stream_id);

  // Unknown session
  // TODO: probably we can safely ignore these with Peertube
  if (!session) {
    return console.log(`Session not found for livestream ${stream_id}!`);
  }

  let message;
  if (event == 'live-now') {
    message = `The session "${session.title}" is now live!`;
  } else if (event == 'ended') {
    message = `The session "${session.title}" livestream has ended!`;
  }

  console.log(`[webhooks] ${sender}/${type}.${event}`);
  console.log(`[webhooks] ${message}`);

  await signal({
    type: 'livestream',
    event,
    message,
    livestream: {
      type: sender,
      stream_id,
      playback_id,
    },
    session,
    video: {
      id: video.id,
      uuid: video.uuid,
      url: video.url,
      name: video.name,
      channelId: video.channelId,
      state: video.state,
      updatedAt: video.updatedAt,
    },
  });
}

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
          type: 'hls',
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
          type: 'hls',
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
          type: 'hls',
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

  console.log('[webhooks] SIGNAL: '+event);

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
