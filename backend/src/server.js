// Polyfill for Fetch API globals, required by google-auth-library in older Node.js environments.
// This ensures that objects like Headers, Request, Response, and Blob are available globally.
if (typeof global.fetch === "undefined") {
  const fetch = require("node-fetch");
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}
// The `Blob` object is not available in all Node.js versions and is needed by gaxios for `instanceof` checks.
if (typeof global.Blob === "undefined") {
  global.Blob = require("blob-polyfill").Blob;
}
// The `FormData` object is not available in all Node.js versions and is needed by gaxios.
if (typeof global.FormData === "undefined") {
  global.FormData = require("form-data");
}
// The `ReadableStream` object is not available in all Node.js versions and is needed by gaxios.
if (typeof global.ReadableStream === "undefined") {
  global.ReadableStream = require("web-streams-polyfill").ReadableStream;
}

const app = require("./app");
const { app: appCfg } = require("./config");
const { sequelize } = require("./db/sequelize");
const cronJobManager = require("./services/CronJobManager");
(async () => {
  await sequelize.authenticate();
  console.log("DB connected.");
  
  // Start cron jobs
  cronJobManager.start();
  
  app.listen(appCfg.port, () =>
    console.log(`ManAIger API running on ${appCfg.url}`)
  );
})();
