'use restrict';

require('./common/winstonConfig')

const axios = require('axios');
const config = require('../../config.js');
const konkerDataMongo = require('../konker/data/KonkerDataMongo');
var dotenv = require('dotenv');
dotenv.load();

const plataformTokenMap = new Map();

// **************** INIT ****************
const createToken = (email, passord) => {
    LOGGER.debug(`[${email}] Getting access token`);

    let authHost = `${process.env.KONKER_API_HOST}/v1/oauth/token`;
    let authUrl = `?grant_type=client_credentials&client_id=${email}&client_secret=${passord}`;

    return axios
        .get(authHost + authUrl)
        .then(res => {
            try {
                let token = res.data.access_token;
                return token;
            } catch (e) {
                throw e;
            }
        });
}

const requestToken = (ownerUUID) => {
    if (plataformTokenMap.get(ownerUUID)) {
        return Promise.resolve(plataformTokenMap.get(ownerUUID));
    } else {
        LOGGER.debug(`[${ownerUUID}] Getting access token`);
        
        return konkerDataMongo.getUserCredentialsByUuidPromise(ownerUUID)
            .then(res => {
                plataformTokenMap.set(ownerUUID, res);
                return res;
            })
    }
}

// **************** SUPPORT FUNCTIONS ****************
const getGetPromise = (ownerUUID, path, application) => {

    LOGGER.debug(`[${ownerUUID}] GET ${path}`);

    return requestToken(ownerUUID)
        .then(result => {
            return axios.get(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result}`
                    }
                })
                .then(
                res => res.data.result
                );
        });

}

const getPutPromise = (ownerUUID, path, body, application) => {

    LOGGER.debug(`[${ownerUUID}] PUT ${path}`);

    return requestToken(ownerUUID)
        .then(result => {
            return axios.put(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result}`
                    }
                });
        });

}

const getPostPromise = (ownerUUID, path, body, application) => {

    LOGGER.debug(`[${ownerUUID}] POST ${path}`);

    let completePath
    if (application) {
        completePath = `${application}${path}`
    } else {
        completePath = `${path}`
    }

    return requestToken(ownerUUID)
        .then(result => {
            return axios.post(`${process.env.KONKER_API_HOST}/v1/${completePath}`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result}`
                    }
                });
        });

}

const getNoTokenPostPromise = (path, body) => {
    LOGGER.debug(`[${body.email}] Create user POST ${path}`);

    return axios.post(`${process.env.KONKER_API_HOST}/v1${path}`,
        body,
        {
            headers: {
                'Content-Type': 'application/json',
            }
        });
}

const getDeletePromise = (ownerUUID, path, application) => {

    LOGGER.debug(`[${ownerUUID}] DELETE ${path}`);

    return requestToken(ownerUUID)
        .then(result => {
            return axios.delete(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result}`
                    }
                });
        });
}

const getSendDataPromise = (apiKey, password, body) => {

    LOGGER.debug(`[${ownerUUID}] POST /pub/${apiKey}`);

    return axios.post(`${process.env.KONKER_API_DATA}/pub/${apiKey}/${body.sensor_id}`,
        body,
        {
            headers: {
                'Content-Type': 'text/plain'
            },
            auth: {
                username: apiKey,
                password: password
            }
        });


}


// **************** DEVICES ****************
const removeInvalidChars = (UUID) => {
    return UUID.replace(/\-/g, '')
}

const createDevicePromise = (ownerUUID, application, deviceId) => {
    let path = `/devices`;
    let clearedDeviceId = removeInvalidChars(deviceId);
    let body = {
        "id": clearedDeviceId.substring(clearedDeviceId.length - 16),
        "name": "knotthing",
        "description": "knot thing",
        "active": true
    }
    return getPostPromise(ownerUUID, path, body, removeInvalidChars(application));
}

const getDeviceCredentialsPromise = (ownerUUID, application, deviceGuid) => {
    return getPostPromise(ownerUUID, `/deviceCredentials/${deviceGuid}`, null, removeInvalidChars(application));
}

const getUserCredentialsPromise = (email, passord) => {
    return createToken(email, passord);
}

// **************** APLICATION ****************
const createApplicationPromise = (gatewayUUID, ownerUUID) => {
    let path = '/applications';
    let body = {
        "name": removeInvalidChars(gatewayUUID),
        "friendlyName": "knotgateway",
        "description": "knot gateway"
    }

    return getPostPromise(ownerUUID, path, body);
}

// **************** USER ****************

const createUserPromise = (name, company, email, password) => {
    let path = `/userSubscription`;
    let body = {
        "name": name,
        "email": email,
        "password": password,
        "passwordType": "PASSWORD"
    }
    if (company) {
        body["company"] = company;
    }
    return getNoTokenPostPromise(path, body);
}


//*************** SEND DATA *******************
const sendDataPromise = (apiKey, password, data) => {
    return getSendDataPromise(apiKey, password, data);
}

// **************** EXPORTS ****************
module.exports = {
    createDevicePromise,
    getDeviceCredentialsPromise,
    getUserCredentialsPromise,
    createApplicationPromise,
    sendDataPromise,
    createUserPromise
};