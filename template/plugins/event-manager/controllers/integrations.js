const processChatIntegration = require('./integrations/chat.js').process;

module.exports = {
  async index(ctx) {
    ctx.send(200);

    // TODO: source (integration type) detection
    if (ctx.request.body.type === 'chat') processChatIntegration(ctx.request.body);
  }
};
