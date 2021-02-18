module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('BACKEND_URL', '/waasabi'),
  proxy: true,
  admin: {
    url: env('ADMIN_URL', '/admin'),
    serveAdminPanel: true,
    auth: {
      secret: env('ADMIN_JWT_SECRET', ''),
    },
  },
});
