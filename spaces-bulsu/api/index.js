let appPromise;

module.exports = async (req, res) => {
  try {
    if (!appPromise) {
      appPromise = import("../src/backend/index.js").then((m) => m.default);
    }
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    console.error("❌ Function handler crashed:", err);
    res.status(500).json({
      success: false,
      message: "Server error: " + (err.message || "unknown"),
    });
  }
};