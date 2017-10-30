'use restrict';

require('./common/winstonConfig')

const axios = require('axios');
const config = require('../../config.js');
var dotenv = require('dotenv');
dotenv.load();

const plataformTokenMap = new Map();

// **************** INIT ****************
const createToken = (email, passord) => {
    LOGGER.debug(`[${process.env.KONKER_USER}] Getting access token`);

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
const requestToken = () => {

    //konker
    knotUser.getUserByUuid(req.merged_params['owner'], function (getUserErr, user) {
        if (getUserErr) {
            meshbluEventEmitter.emit('user-error', { request: req.merged_params, error: getUserErr });
            return res.status(500).json({ message: getUserErr.message });
        } else if (user) {
            let uuid = user[0]['user']['uuid'];
            let email = user[0]['user']['email'];
            let passord = user[0]['user']['password'];


            // check in cache first
            if (process.env.KONKER_USER === null || process.env.KONKER_PASS === null) {
                return Promise.reject('user or password invalid');
            } else if (plataformTokenMap.get(process.env.KONKER_USER)) {
                return Promise.resolve(plataformTokenMap.get(process.env.KONKER_USER));
            } else {
                LOGGER.debug(`[${process.env.KONKER_USER}] Getting access token`);

                let authHost = `${process.env.KONKER_API_HOST}/v1/oauth/token`;
                let authUrl = `?grant_type=client_credentials&client_id=${process.env.KONKER_USER}&client_secret=${process.env.KONKER_PASS}`;

                return axios
                    .get(authHost + authUrl)
                    .then(res => {
                        try {
                            let token = res.data.access_token;
                            //plataformTokenMap.set(process.env.KONKER_USER, token);
                            return token;
                        } catch (e) {
                            throw e;
                        }
                    });
            }


        } else {
            meshbluEventEmitter.emit('existent-user-error', { request: req.merged_params });
            return res.status(409).json({ message: 'User does not exists' });
        }
    });

}

// **************** SUPPORT FUNCTIONS ****************
const getGetPromise = (path, application) => {

    LOGGER.debug(`[${process.env.KONKER_USER}] GET ${path}`);

    return requestToken()
        .then(result => {
            return axios.get(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.token}`
                    }
                })
                .then(
                res => res.data.result
                );
        });

}

const getPutPromise = (path, body, application) => {

    LOGGER.debug(`[${process.env.KONKER_USER}] PUT ${path}`);

    return requestToken()
        .then(result => {
            return axios.put(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.token}`
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
        .then(result => {
            return axios.post(`${process.env.KONKER_API_HOST}/v1/${completePath}`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.token}`
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

const getDeletePromise = (path, application) => {

    LOGGER.debug(`[${process.env.KONKER_USER}] DELETE ${path}`);

    return requestToken()
        .then(result => {
            return axios.delete(`${process.env.KONKER_API_HOST}/v1/${application}${path}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.token}`
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
    return UUID.replace(/\-/g, '')
}

const createDevicePromise = (application, deviceId) => {
    let path = `/devices`;
    let clearedDeviceId = removeInvalidChars(deviceId);
    let body = {
        "id": clearedDeviceId.substring(clearedDeviceId.length - 16),
        "name": "knotthing",
        "description": "knot thing",
        "active": true
    }
    return getPostPromise(path, body, removeInvalidChars(application));
}

const getDeviceCredentialsPromise = (application, deviceGuid) => {
    return getPostPromise(`/deviceCredentials/${deviceGuid}`, null, removeInvalidChars(application));
}

const getUserCredentialsPromise = (email, passord) => {
    return createToken(email, passord);
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