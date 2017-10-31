var config = require('./../../../config');
var devicesCredentials = require('./../../../lib/database').devicesCredentials;
var usersCredentials = require('./../../../lib/database').usersCredentials;


function processResults(error, results, callback) {
  if (error || results.length === 0) {
    return handleError(error, callback);
  }

  logEvent(403, { devices: results });
  callback(null, { devices: results });
}

const getDeviceCredentialsByUuidPromise = (uuid) => {
  return new Promise((resolve, reject) => {
    if (!uuid) {
      return reject("uuid undefined")
    }

    var fetch = {};

    fetch["$or"] = [
      {
        uuid: uuid
      }
    ];

    devicesCredentials.find(fetch, {})
      .maxTimeMS(10000)
      .limit(1000)
      .sort({ _id: -1 }, function (err, devicedata) {
        if (err) {
          return reject(err)
        } else {
          return resolve(devicedata)
        }
      });
  });
}

const saveDeviceCredentials = (uuid, apiKey, password) => {
  let newDeviceCredentials = {
    uuid: uuid,
    apiKey: apiKey,
    password: password
  };

  devicesCredentials.insert(newDeviceCredentials, (function(res) { 
    console.log("Device credentials created: " + uuid)
  }));
}

const saveUserCredentials = (uuid, email, password, tokenKonker) => {
  let newUserCredentials = {
    uuid: uuid,
    email: email,
    password: password,
    tokenKonker: tokenKonker
  };

  usersCredentials.insert(newUserCredentials, (function(res) { 
    console.log("User credentials created: " + email)
  }));
}

const getUserCredentialsByUuidPromise = (uuid) => {
  return new Promise((resolve, reject) => {
    if (!uuid) {
      return reject("uuid undefined")
    }

    var fetch = {};

    fetch["$or"] = [
      {
        uuid: uuid
      }
    ];

    usersCredentials.find(fetch, {})
      .maxTimeMS(10000)
      .limit(1000)
      .sort({ _id: -1 }, function (err, userdata) {
        if (err) {
          return reject(err)
        } else {
          return resolve(userdata[0].tokenKonker)
        }
      });
  });
}

// **************** EXPORTS ****************
module.exports = {
  getDeviceCredentialsByUuidPromise,
  saveDeviceCredentials,
  getUserCredentialsByUuidPromise,
  saveUserCredentials
}