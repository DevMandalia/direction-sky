const functions = require('@google-cloud/functions-framework');

// Import only the polygon function handler
const { polygonOptionsDataFetcher } = require('./polygonOptionsDataFetcher');

// Export the function with the name that matches the entry point
module.exports = {
  polygonOptionsDataFetcher
};

// Also register it as an HTTP function (this is optional for Cloud Functions)
functions.http('polygon-options-fetcher', polygonOptionsDataFetcher); 