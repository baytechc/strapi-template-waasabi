'use strict';

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: "type",
    name: "setup",
  });
  const initHasRun = await pluginStore.get({ key: "initHasRun" });
  await pluginStore.set({ key: "initHasRun", value: true });
  return !initHasRun;
};


async function setPublicPermissions(newPermissions, permissionType = 'application') {
  // Find the ID of the public role
  const publicRole = await strapi
    .query("role", "users-permissions")
    .findOne({ type: "public" });

  // List all available permissions
  const publicPermissions = await strapi
    .query("permission", "users-permissions")
    .find({
      type: [permissionType],
      role: publicRole.id,
    });

  // Update permission to match new config
  const controllersToUpdate = Object.keys(newPermissions);
  const updatePromises = publicPermissions
    .filter((permission) => {
      // Only update permissions included in newConfig
      if (!controllersToUpdate.includes(permission.controller)) {
        return false;
      }
      if (!newPermissions[permission.controller].includes(permission.action)) {
        return false;
      }
      return true;
    })
    .map((permission) => {
      // Enable the selected permissions
      return strapi
        .query("permission", "users-permissions")
        .update({ id: permission.id }, { enabled: true })
    });
  await Promise.all(updatePromises);
}

module.exports = async () => {
  const initialSetup = await isFirstRun();

  if (initialSetup) {
    try {
      console.log('Setting up API permissions...');

      // Set the livestream/replays endpoints and the integration webhooks public
      await setPublicPermissions({
        'client': ['livestream', 'replays'],
        'webhooks': ['receive'],
      }, 'event-manager');

      console.log('Ready to go');
    } catch (error) {
      console.log('Could not finish database configuration!');
      console.error(error);
    }
  }
};
