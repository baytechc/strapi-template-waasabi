'use strict';

module.exports = {
  lifecycles: {
    async afterCreate(r) {
      console.log(`[signal] ${r.event}`);
      return r;
    },
  },
};
