let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = import("../src/backend/index.js").then((m) => m.default);
  }
  const app = await appPromise;
  return app(req, res);
};