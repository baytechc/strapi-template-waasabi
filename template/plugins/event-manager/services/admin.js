'use strict';

const API_URL = 'http://localhost:1337';

const fetch = require('node-fetch');
const FormData = require('formdata-node');

const getRole = (role) => {
  if (role === 'speaker') return strapi.admin.services.constants.AUTHOR_CODE;
  if (role === 'organizer') return strapi.admin.services.constants.EDITOR_CODE;
}


/**
 * event-manager.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  getRole,

  initializeCmsUser: async (role, config) => {
    const SPEAKER_ROLE = getRole('speaker');
    const ORGANIZER_ROLE = getRole('organizer');

    // Invalid role
    if ([ SPEAKER_ROLE, ORGANIZER_ROLE ].includes(role) === false) {
      // Fail
      return false;
    }

    // Split name into first/lastname
    let { name, firstname, lastname, email, password, bio, session } = config;
  
    if (name) {
      const [ first, last ] = name.split(' ', 2);
      firstname = first || '';
      lastname = last || ' ';
    }

    // Get the the selected role
    const roleData = await strapi.admin.services.role.findOne(
      { code: role }
    );

    // Create a new activated user with a random password
    const newUser = await strapi.admin.services.user.create({
      firstname, lastname, password, email,
      isActive: true,
      roles: [ roleData.id ]
    });

    // Organizers can see/edit everything, Speaker roles need people/session stubs
    if (role === ORGANIZER_ROLE) return newUser;

    // Create a JWT to be able to act like this user
    const newUserJWT = strapi.admin.services.token.createJwtToken({
      id: newUser.id
    });

    const fetchConfig = { method: 'POST', headers: {
      'Authorization': `Bearer ${newUserJWT}`,
      'Content-Type': 'application/json',
    }};

    // Create new "people" and "session" objects
    newUser.person = await fetch(
      API_URL+`/content-manager/explorer/application::people.people`, {
      ...fetchConfig,
      body: JSON.stringify({ name, email, bio })
    }).then(r => r.status === 200 ? r.json() : null);

    // Only create if "session" is set (currently only one of multiple
    // co-presenters can have access to the Session)
    if (session && session.title) {
      session.Title = session.title // fix model capitalization

      newUser.session = await fetch(
        API_URL+`/content-manager/explorer/application::session.session`, {
        ...fetchConfig,
        body: JSON.stringify(session)
      }).then(r => r.status === 200 ? r.json() : null);
    }
  
    return newUser;
  }

};
