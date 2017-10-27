'use restrict';

require('./common/winstonConfig')

const axios   = require('axios');
const config  = require('../../config.js');
var dotenv = require('dotenv');
dotenv.load();

const plataformTokenMap = new Map();

// **************** INIT ****************
const getToken = () => {
    return plataformTokenMap.get(process.env.KONKER_USER);
}

const requestToken = () => {

    // check in cache first
    if (process.env.KONKER_USER === null || process.env.KONKER_PASS === null ) {
        return Promise.reject('user or password invalid');
    } else if (plataformTokenMap.get(process.env.KONKER_USER)) {
        return Promise.resolve(plataformTokenMap.get(process.env.KONKER_USER));
    } else {
        LOGGER.debug(`[${process.env.KONKER_USER}] Getting access token`);

        let authHost  = `${process.env.KONKER_API_HOST}/v1/oauth/token`;
        let authUrl   = `?grant_type=client_credentials&client_id=${process.env.KONKER_USER}&client_secret=${process.env.KONKER_PASS}`;

        return axios
            .get(authHost + authUrl)
            .then(res => {
                try {
                    let token = res.data.access_token;
                    plataformTokenMap.set(process.env.KONKER_USER, token);
                    return token;
                } catch(e) {
                    throw e;
                }
            });
    }

}

// **************** SUPPORT FUNCTIONS ****************
const getGetPromise = (path, application) => {

    LOGGER.debug(`[${process.env.KONKER_USER}] GET ${path}`);

    return requestToken()
        .then(() => {
            return axios.get(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
            {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            })
            .then(
                res =>  res.data.result
            );
        });

}

const getPutPromise = (path, body, application) => {

    LOGGER.debug(`[${process.env.KONKER_USER}] PUT ${path}`);

    return requestToken()
        .then(() => {
            return axios.put(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
            body,
            {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
        });

}

const getPostPromise = (path, body, application) => {

    LOGGER.debug(`[${process.env.KONKER_USER}] POST ${path}`);

    let completePath
    if (application) {
        completePath = `${application}${path}`
    } else {
        completePath = `${path}`
    }

    return requestToken()
        .then(() => {
            return axios.post(`${process.env.KONKER_API_HOST}/v1/${completePath}`,
            body,
            {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
        });

}


const getNoTokenPostPromise = (path, body) => {
    
    //LOGGER.debug(`[${process.env.KONKER_USER}] POST ${path}`);
    
    //return axios.post(`${process.env.KONKER_API_HOST}/v1${path}`,
    return axios.post("http://localhost:8080/v1/userSubscription",
    body,
    {
        headers: { 
            'Content-Type': 'application/json',
        }
    });

}


const getDeletePromise = (path, application) => {
    
    LOGGER.debug(`[${process.env.KONKER_USER}] DELETE ${path}`);
    
    return requestToken()
        .then(() => {
            return axios.delete(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
        });
}

const getSendDataPromise = (apiKey, password, body) => {
    
        LOGGER.debug(`[${process.env.KONKER_USER}] POST /pub/${apiKey}`);
    
        return axios.post(`${process.env.KONKER_API_DATA}}/pub/${apiKey}/${body.sensor_id}`,
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
    return UUID.replace(/\-/g,'')
}
    
const createDevicePromise = (application, deviceId) => {
    let path = `/devices`;
    let clearedDeviceId=removeInvalidChars(deviceId);
    let body = {
        "id": clearedDeviceId.substring(clearedDeviceId.length - 16),
        "name": "knotthing",
        "description": "knot thing",
        "active": true
    }
    return getPostPromise(path, body, removeInvalidChars(application));
}


const createUserPromise = (name, company, email, password) => {
    let path = `/userSubscription`;
    let body = {
        "name": name, 
        "company":company,
        "email": email, 
        "password": password, 
        "passwordType": "PASSWORD"           
    }
    return getNoTokenPostPromise(path, body);
}


const getDeviceCredentialsPromise = (application, deviceGuid) => {
    return getPostPromise(`/deviceCredentials/${deviceGuid}`, null, removeInvalidChars(application));
}

// **************** APLICATION ****************
const createApplicationPromise = (gatewayUUID) => {
    let path = '/applications';
    let body = {
        "name": removeInvalidChars(gatewayUUID),
        "friendlyName": "knotgateway",
        "description": "knot gateway"
      }
    
    
    return getPostPromise(path, body);
}

//*************** SEND DATA *******************
const sendDataPromise = (apiKey, password, data) => {
    return getSendDataPromise(apiKey, password, data);
}

// **************** EXPORTS ****************
module.exports = {
    createDevicePromise,
    getDeviceCredentialsPromise,
    createApplicationPromise,
    sendDataPromise,
    createUserPromise
};