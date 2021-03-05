'use strict';

module.exports = {
  lifecycles: {
    async afterCreate(r) {
      console.log(`[push|attendees] ${r.event}`);
      return r;
    },
  },
};
