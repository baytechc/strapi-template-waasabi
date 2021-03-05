'use strict';


/**
 * event-manager.js controller
 *
 * @description: A set of functions called "actions" of the `event-manager` plugin.
 */

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  // TODO: this doesn't do anything?
  index: async (ctx) => {
    // Add your own logic here.

    // Send 200 `ok`
    console.log(ctx.state);
    ctx.send({
      message: 'ok'
    });
  },

  adminCreateSpeaker: async (ctx) => {
    const eventManagerAdmin = strapi.plugins['event-manager'].services['admin'];
    const SPEAKER_ROLE = eventManagerAdmin.getRole('speaker');

    // TODO: only superadmins can do this
    let res = await eventManagerAdmin.initializeCmsUser(SPEAKER_ROLE, ctx.body);
  },

  adminCreateOrganizer: async (ctx) => {
    const eventManagerAdmin = strapi.plugins['event-manager'].services['admin'];
    const ORGANIZER_ROLE = eventManagerAdmin.getRole('organizer');

    // TODO: only superadmins can do this
    let res = await eventManagerAdmin.initializeCmsUser(ORGANIZER_ROLE, ctx.body);
  },
};

//created.user.with.pw@gmail.com
//pass1234