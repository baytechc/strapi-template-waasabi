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


async function setRolePermissions(newPermissions, permissionType = 'application', roleType = 'public') {
  // Find the ID of the public role
  const role = await strapi
    .query("role", "users-permissions")
    .findOne({ type: roleType });

  // List all available permissions
  const permissions = await strapi
    .query("permission", "users-permissions")
    .find({
      type: [permissionType],
      role: role.id,
    });

  // Update permission to match new config
  const controllersToUpdate = Object.keys(newPermissions);
  const updatePromises = permissions
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

      // Set the livestream/replays endpoints and the integration webhooks
      await setRolePermissions({
        'client': ['livestream', 'replays'],
        'webhooks': ['receive'],
      }, 'event-manager', 'public');

      // Create a new role for password-protected integrations accounts
      const roleType = "integrations";

      await await strapi
        .query("role", "users-permissions")
        .create({
          type: roleType,
          name: "Integrations",
          description: "Used by Waasabi integrations."
        });

        // We need to create the permissions for the new role
      const role = await strapi
        .query("role", "users-permissions")
        .findOne({ type: roleType });
  
      // Create & grant permissions for accessing the integrations endpoint
      await strapi.query("permission", "users-permissions").create({
        type: "event-manager",
        controller: "integrations",
        action: "index",
        enabled: true,
        role,
      })
  
      console.log('Ready to go');
    } catch (error) {
      console.log('Could not finish database configuration!');
      console.error(error);
    }
  }
};
