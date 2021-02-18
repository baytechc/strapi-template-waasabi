// Custom midlleware config to enable unparsed POST bodies (for verifying webhook signatures)
// https://strapi.io/documentation/v3.x/concepts/middlewares.html#core-middleware-configurations

module.exports = {
  settings: {
    parser: {
      // default from /strapi/lib/configuration/hooks/core/bodyParser/index.js
      multipart: true,
      // custom, via https://www.npmjs.com/package/koa-body#a-note-about-unparsed-request-bodies
      includeUnparsed: true,
    }
  }
};
