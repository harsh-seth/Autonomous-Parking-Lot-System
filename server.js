const express = require('express')
const joi = require('joi')

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const portNum = 3000

const auth_token_authenticator = joi.string().length(26).required()

const validators = {
    'authorized': {
        'auth_token': auth_token_authenticator
    },
    'login': {
        'username': joi.string().required(),
        'password': joi.string().required()
    },
    'signup': {
        'username': joi.string().required(),
        'password': joi.string().required().length(4),
        'name': joi.string().required(),
    },
    'createAdmin': {
        'auth_token': auth_token_authenticator,
        'username': joi.string().required(),
        'password': joi.string().required().length(4),
        'name': joi.string().required(),
    }
}

const messages = {
    'invalidURL': 'Invalid URL!',
    'invalidUser': 'No user found with that username!',
    'invalidPassword': 'The user-password combination does not match!',
    'userTaken': 'The username given is already in use. Select a different one',
    'signupClientOK': 'User registered!',
    'signupAdminOK': 'Admin registered!',
    'invalidAuth': 'Invalid auth_token!',
    'missingAuth': 'No auth token provided! Obtain an auth_token via `/authenticate`',
    'privError': 'Insufficient privileges to perform that action!',
    'genError': 'Whoops something went wrong!',
    'loginOK': 'Signed in!',
    'logoutOK': 'Logged out successfully!',
    'authOK': 'This user is logged in. Authentication works!'
}

const authClientEndpointsList = [
    '/registerAdmin', 
    '/logout', 
    '/test'
]

const authAdminEndpointsList = [
    '/registerAdmin',
    '/logout',
    '/test'
]

const nonAuthEndpointsList = [
    '/', 
    '/registerClient',
    '/authenticate'
]

var user_details = {
    'admin': {
        'password': '1234',
        'isAdmin': true
    }
}

var sessions = {}

function generateAuthToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.use((req, res, next) => {
    var auth_validator = joi.object(validators['authorized']).unknown() 
    const result = auth_validator.validate(req.body)
    
    if(req.url === '/' || req.url === '/home') {
        // not needing authentication (or to provide help text to unauthorized users)
        if (result.error) {
            // help text
            return res.send({'allowedEndpoints': nonAuthEndpointsList})
        }
        else {
            return next();
        }
    } else if (req.url === '/registerClient' || req.url === '/authenticate') {
        // if seeking authentication, then allow access without token
        return next()
    } else {
        // every endpoint which requires authentication
        var response_body = {}
        if(result.error) {
            // if unauthorized
            response_body = {
                'message': messages['missingAuth'],
                'status': 'missingAuth'
            }
            return res.send(response_body)
        } else {
            // if trying to authenticate
            if (!(result.value.auth_token in sessions)) {
                // if using invalid auth token
                response_body = {
                    'message': messages['invalidAuth'],
                    'status': 'invalidAuth'
                }
                return res.send(response_body)
            } else {
                // allow access
                return next()
            }
        }
    }        
})

app.get('/', (req, res) => {
    if (user_details[sessions[req.body.auth_token]]['isAdmin'])
        res.send({'allowedEndpoints': authAdminEndpointsList})
    else
        res.send({'allowedEndpoints': authClientEndpointsList})
})

app.post('/', (req, res) => {
    if (user_details[sessions[req.body.auth_token]]['isAdmin'])
        res.send({'allowedEndpoints': authAdminEndpointsList})
    else
        res.send({'allowedEndpoints': authClientEndpointsList})
})

app.post('/registerClient', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['signup'])

    // check if validation fails 
    if (result.error) {
        res.status(400).send({'message': result.error.details[0].message})
    } else {
        const username = result.value.username
        const password = result.value.password
        const name = result.value.name

        var response_body = {}
        if (username in user_details) {
            response_body['message'] = messages['userTaken']
            response_body['status'] = 'userTaken'
        } else {
            user_details[username] = {
                'password': password,
                'name': name,
                'isAdmin': false
            }
            
            response_body['message'] = messages['signupOK']
            response_body['status'] = 'signupOK'
        }
        res.send(response_body)
    }
})

app.post('/registerAdmin', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['createAdmin'])

    // check if validation fails 
    if (result.error) {
        res.status(400).send({'message': result.error.details[0].message})
    } else {
        var response_body = {}
        if (!user_details[sessions[result.value.auth_token]]['isAdmin']) {
            response_body['message'] = messages['privError']
            response_body['status'] = 'privError'
        } else {
            const username = result.value.username
            const password = result.value.password
            const name = result.value.name
            
            if (username in user_details) {
                response_body['message'] = messages['userTaken']
                response_body['status'] = 'userTaken'
            } else {
                user_details[username] = {
                    'password': password,
                    'name': name,
                    'isAdmin': true
                }
                
                response_body['message'] = messages['signupOK']
                response_body['status'] = 'signupOK'
            }
        }
        res.send(response_body)
    }
})

app.post('/authenticate', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['login'])
    
    // check if validation fails 
    if (result.error) {
        res.status(400).send({'message': result.error.details[0].message})
    } else {
        const username = result.value.username
        const password = result.value.password

        var response_body = {}
        if (username in user_details) {
            if (user_details[username].password === password) {
                response_body['message'] = 
                response_body['username'] = username
                response_body['auth_token'] = generateAuthToken()
                response_body['status'] = 'loginOK'
                response_body['isAdmin'] = user_details[username]['isAdmin']
                sessions[response_body['auth_token']] = username
            } else {
                response_body['message'] = messages['invalidPassword']
                response_body['status'] = 'invalidPassword'
            }
        } else {
            response_body['message'] = messages['invalidUser']
            response_body['status'] = 'invalidUser'
        }
        res.send(response_body)
    }
})

app.post('/logout', (req, res) => {
    const auth_token = req.body.auth_token
    var response_body = {}

    delete sessions[auth_token]
    
    response_body['message'] = messages['logoutOK']
    response_body['status'] = 'logoutOK'
    
    res.send(response_body)
})

app.post('/test', (req, res) => {
    var response_body = {}
    const auth_token = req.body.auth_token
    
    response_body['message'] = messages['authOK']
    response_body['status'] = 'authOK'
    response_body['username'] = sessions[auth_token]
    
    res.send(response_body)
})

app.get('*', (req, res) => {
    var res_body = {
        'message': messages['invalidURL']
    }
    res.send(res_body)
})

app.post('*', (req, res) => {
    var res_body = {
        'message': messages['invalidURL']
    }
    res.send(res_body)
})

app.listen(portNum)
console.log("Server is up at", portNum)
