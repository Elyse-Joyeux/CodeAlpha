const { local } = require("../utils/dates");

// mongoose option: expose `id`, hide internals, show dates as local "YYYY-MM-DD HH:MM[:SS]".
module.exports = (dates = {}) => ({
  toJSON: {
    transform: (_, r) => {
      r.id = String(r._id);
      delete r._id;
      delete r.__v;
      delete r.used;
      for (const [k, n] of Object.entries(dates))
        if (r[k]) r[k] = local(r[k]).slice(0, n);
      return r;
    },
  },
});
