const express = require('express')

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const portNum = 3000

const messages = {
    'invalidURL': 'Invalid URL!',
    'invalidUser': 'No user found with that username!',
    'invalidPassword': 'The user-password combination does not match!',
    'userTaken': 'The username given is already in use. Select a different one',
    'signupClientOK': 'User registered!',
    'signupAdminOK': 'Admin registered!',
    'invalidAuth': 'Invalid auth_token!',
    'missingAuth': 'No auth token provided! Obtain an auth_token via `/authenticate`',
    'genError': 'Whoops something went wrong!',
    'loginOK': 'Signed in!',
    'logoutOK': 'Logged out successfully!',
    'authOK': 'This user is logged in. Authentication works!'
}

const endpointsList = [
    '/', '/registerClient', '/registerAdmin', '/authenticate', '/logout', '/test'
]

var user_details = {}

var sessions = {}

function generateAuthToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.get('/', (req, res) => {
    res.send(endpointsList)
})

app.post('/', (req, res) => {
    res.send(endpointsList)
})

app.post('/registerClient', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const name = req.body.name

    var response_body = {}
    if (username in user_details) {
        response_body['message'] = messages['userTaken']
        response_body['status'] = 'userTaken'
    } else {
        user_details[username] = {
            'password': password,
            'name': name,
            'role': 'client'
        }
        
        response_body['message'] = messages['signupOK']
        response_body['status'] = 'signupOK'
    }
    res.send(response_body)
})

app.post('/registerAdmin', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const name = req.body.name

    var response_body = {}
    if (username in user_details) {
        response_body['message'] = messages['userTaken']
        response_body['status'] = 'userTaken'
    } else {
        user_details[username] = {
            'password': password,
            'name': name,
            'role': 'admin'
        }
        
        response_body['message'] = messages['signupOK']
        response_body['status'] = 'signupOK'
    }
    res.send(response_body)
})

app.post('/authenticate', (req, res) => {
    const username = req.body.username
    const password = req.body.password

    var response_body = {}
    if (username in user_details) {
        if (user_details[username].password === password) {
            response_body['message'] = 
            response_body['username'] = username
            response_body['auth_token'] = generateAuthToken()
            response_body['status'] = 'loginOK'
            response_body['user_role'] = user_details[username]['role']
            sessions[response_body['auth_token']] = username
        } else {
            response_body['message'] = messages['invalidUser']
            response_body['status'] = 'invalidUser'
        }
     } else {
        response_body['message'] = messages['invalidUser']
        response_body['status'] = 'invalidUser'
    }
    res.send(response_body)
        
})

app.post('/logout', (req, res) => {
    const auth_token = req.body.auth_token
    var response_body = {}
    if (auth_token in sessions) {
        delete sessions[auth_token]
        response_body['message'] = messages['logoutOK']
        response_body['status'] = 'logoutOK'
    } else {
        response_body['message'] = messages['invalidAuth']
        response_body['status'] = 'invalidAuth'
    }
    res.send(response_body)
})

app.post('/test', (req, res) => {
    var response_body = {}
    if (req.body.auth_token !== undefined) {
        const auth_token = req.body.auth_token
        if (auth_token in sessions) {
            response_body['message'] = messages['authOK']
            response_body['status'] = 'authOK'

            response_body['username'] = sessions[auth_token]
        } else {
            response_body['message'] = messages['invalidAuth']
            response_body['status'] = 'invalidAuth'
        }
    } else {
        response_body['message'] = messages['missingAuth']
        response_body['status'] = 'missingAuth'
    }
    res.send(response_body)
})

app.get('*', (req, res) => {
    var res_body = {
        'msg': messages['invalidURL']
    }
    res.send(res_body)
})

app.post('*', (req, res) => {
    var res_body = {
        'msg': messages['invalidURL']
    }
    res.send(res_body)
})

app.listen(portNum)
console.log("Server is up at", portNum)