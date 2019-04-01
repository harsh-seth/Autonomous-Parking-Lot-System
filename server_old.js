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
        'password': joi.string().required().min(6).max(14),
        'name': joi.string().required(),
        'phone_no': joi.string().length(10).required()
    },
    'createAdmin': {
        'auth_token': auth_token_authenticator,
        'username': joi.string().required(),
        'password': joi.string().required().min(6).max(14),
        'name': joi.string().required(),
    },
    'changePassword': {
        'auth_token': auth_token_authenticator,
        'newPassword': joi.string().required().min(6).max(14)
    },
    'lotRequest': {
        'auth_token': auth_token_authenticator,
        'client_username': joi.string().required(),
        'lotID': joi.number().integer().required()
    }
}

const messages = {
    'invalidURL': 'Invalid URL!',
    'invalidUser': 'No user found with that username!',
    'invalidPassword': 'The user-password combination does not match!',
    'invalidParams': 'Invalid or missing parameters!',
    'userTaken': 'The username given is already in use. Select a different one',
    'signupClientOK': 'User registered!',
    'signupAdminOK': 'Admin registered!',
    'invalidAuth': 'Invalid auth_token!',
    'missingAuth': 'No auth token provided! Obtain an auth_token via `/authenticate`',
    'privError': 'Insufficient privileges to perform that action!',
    'genError': 'Whoops something went wrong!',
    'loginOK': 'Signed in!',
    'logoutOK': 'Logged out successfully!',
    'authOK': 'This user is logged in. Authentication works!',
    'pwChangedOK': 'Password changed successfully',
    'deregisterOK': 'User removed from database. Past records will be maintained, but this action cannot be reverted.',
    'opOK': 'The operation was successful.'
}

const authClientEndpointsList = [
    '/logout', 
    '/test',
    '/changePassword',
    '/deregisterClient',
    '/getBookingDetails'
]

const authAdminEndpointsList = [
    '/registerAdmin',
    '/logout',
    '/test',
    '/changePassword'
]

const nonAuthEndpointsList = [
    '/', 
    '/registerClient',
    '/authenticate'
]

var user_details = {
    'admin': {
        'password': 'admin1234',
        'isAdmin': true,
        'phone_no': "98765443210"
    },
    'client': {
        'password': 'client1234',
        'isAdmin': false,
        'phone_no': "9876543210" 
    }
}

var sessions = {}

var lot_details = {
    1: {
        'name': "ACME Parking Lot 1",
        'location': 'VIT',
        'spots': {
            1: {
                'size': 'small',
            }
        }
    }
}

/*
    {
        bookingID {
            username: USERNAME,
            lotID: LOTID,
            placeID: PLACEID,
            dateTimeOfBooking: DATE,
            dateTimeOfExit: DATE
        }
    }
*/
var bookings = {
    1: {
        'username': "client",
        'lotID': 1,
        'slotID': 1,
        'placeID': 1,
        'dateTimeOfBooking': new Date()
    },
    2: {
        'username': "client",
        'lotID': 1,
        'slotID': 2,
        'dateTimeOfBooking': new Date()
    }
}

/*
    {
        username: [
            bookingID: {
                amount: AMOUNT,
                resolved: BOOLEAN,
                resolutionDetails: undefined / {
                    transactionID: TRANSACTIONID,
                    vendor: VENDOR,
                    mode: MODE,
                    dateOfResolution: DATE
                }
            }
        ]
    }
*/
var payments = {}

function generateAuthToken() {
    return Math.random().toString(36).padEnd(15, '0').substring(2, 15) + Math.random().toString(36).padEnd(15, '0').substring(2, 15);
}

function getCurrentBookings(username) {
    var currentBookings = []
    for (var bookingID in bookings) {
        if(bookings[bookingID]['username'] === username && bookings[bookingID]['dateTimeOfExit'] === undefined) {
            currentBookings.push({
                'bookingID': bookingID,
                'booking_details': bookings[bookingID],
                'lotID': bookings[bookingID]['lotID'],
                'lot_details': lot_details[bookings[bookingID]['lotID']],
                'slotID': bookings[bookingID]['slotID'],
                'slot_details': lot_details[bookings[bookingID]['lotID']][bookings[bookingID]['slotID']]
            })
        }
    }
    return currentBookings
}

app.use((req, res, next) => {
    var auth_validator = joi.object(validators['authorized']).unknown() 
    const result = auth_validator.validate(req.body)
    
    if(req.url === '/') {
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
            if(req.body.auth_token) {
                response_body = {
                    'message': messages['invalidAuth'],
                    'status': 'invalidAuth'
                }
            } else {

                response_body = {
                    'message': messages['missingAuth'],
                    'status': 'missingAuth'
                }
                return res.send(response_body)
            }
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
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        const username = result.value.username
        const password = result.value.password
        const name = result.value.name
        const phone_no = result.value.phone_no

        var response_body = {}
        if (username in user_details) {
            response_body['message'] = messages['userTaken']
            response_body['status'] = 'userTaken'
        } else {
            user_details[username] = {
                'password': password,
                'name': name,
                'isAdmin': false,
                'phone_no': phone_no
            }
            response_body['message'] = messages['signupClientOK']
            response_body['status'] = 'signupClientOK'
        }
        res.send(response_body)
    }
})

app.post('/registerAdmin', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['createAdmin'])

    // check if validation fails 
    if (result.error) {
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
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
                
                response_body['message'] = messages['signupAdminOK']
                response_body['status'] = 'signupAdminOK'
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
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        const username = result.value.username
        const password = result.value.password

        var response_body = {}
        if (username in user_details) {
            if (user_details[username].password === password) {
                response_body['message'] = messages['loginOK']
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

app.post('/changePassword', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['changePassword'])
    
    // check if validation fails 
    if (result.error) {
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        const auth_token = result.value.auth_token
        const newPassword = result.value.newPassword

        user_details[sessions[auth_token]]['password'] = newPassword

        var response_body = {}
        response_body['message'] = messages['pwChangedOK']
        response_body['status'] = 'pwChangedOK'
        res.send(response_body)
    }
})

app.post('/deregisterClient', (req, res) => {
    const auth_token = req.body.auth_token
    var response_body = {}

    const username = sessions[username]

    if (user_details[username]['isAdmin']) {
        response_body['message'] = messages['privError']
        response_body['status'] = 'privError'
    } else {
        delete sessions[auth_token]
        // TODO: Deal with past bookings and payments
        delete user_details[user_details]
        
        response_body['message'] = messages['deregisterOK']
        response_body['status'] = 'deregisterOK'    
    }
    res.send(response_body)
})

// Client End

app.post('/getBookingDetails', (req, res) => {
    const auth_token = req.body.auth_token
    var response_body = {}

    const username = sessions[auth_token]

    if (user_details[username]['isAdmin']) {
        response_body['message'] = messages['privError']
        response_body['status'] = 'privError'
    } else {
        response_body['message'] = messages['opOK']
        response_body['status'] = 'opOK'
        
        
        const currentBookings = getCurrentBookings(username)
    
        response_body['currentBookings'] = currentBookings
    }
    res.send(response_body)
})

app.post('/getPastBookings', (req, res) => {
  const auth_token = req.body.auth_token
  var response_body= {}

  const username = sessions[auth_token]
  if (user_details[username]['isAdmin']) {
    response_body['message'] = messages['privError']
    response_body['status'] = 'privError'
  } else {
    response_body['message'] = messages['opOK']
    response_body['status'] = 'opOK'

    var pastBookings = []
    for (var bookingID in bookings) {
        // THIS WILL GET ALL BOOKINGS, INCLUDING CURRENT ONES
        if(bookings[bookingID]['username'] === username) {
            pastBookings.push({
                'bookingID': bookingID,
                'booking_details': bookings[bookingID],
                'lotID': bookings[bookingID]['lotID'],
                'lot_details': lot_details[bookings[bookingID]['lotID']],
                'slotID': bookings[bookingID]['slotID'],
                'slot_details': lot_details[bookings[bookingID]['lotID']][bookings[bookingID]['slotID']]
            })
        }
    }
    response_body['pastBookings'] = pastBookings
  }
  res.send(response_body)
})

// Operations End
// getCurrentStatus
app.post('/getCurrentStatus', (req, res) => {
    
    var result = joi.validate(req.body, validators['lotRequest'])
    
    if(result.error) {
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        var auth_token = req.body.auth_token
        var client_username = req.body.client_username
        var lotID = req.body.lotID
        
        if (user_details[sessions[auth_token]]['isAdmin']) {
            if (client_username in user_details) {
                // Check if user has any active bookings
                const currentBookings = getCurrentBookings(client_username)
                var currentSpots = []
                for (var i =0 ; i<currentBookings.length; i++) {
                    if (currentBookings[i]['lotID'] === lotID) {
                        currentSpots.push(bookings[currentBookings[i]])
                    }
                }
                res.send({
                    'currentSpots': currentSpots,
                    'status': 'opOK',
                    'message': messages['opOK']
                })
            } else {
                res.send({
                    'message': messages['invalidUser'],
                    'status': 'invalidUser'
                })
            }
        } else {
            res.send({
                'message': messages['privError'],
                'status': 'privError'
            })
        }
    }
})

// allocateParking


// freeParking

// Admin End
// registerBuilding
// registerLots
// getBuildings
// getLots
// getCurrentBuildingStatus
// getBuildingLogs

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

app.listen(portNum, () => console.log("Server is up at", portNum))
