// app.config.js
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}), // conserva eas, router, etc.
    apiBase: "https://script.google.com/macros/s/AKfycbxggPgr4AH5Dope6izIGSEksdwxOqfwm1U8zgb1noCqLICD6_EclLYpuF2eTZqtUhU/exec",
    apiKey:  "KENLLY-INV-2025",
  },
});
