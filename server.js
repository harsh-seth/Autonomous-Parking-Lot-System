const express = require('express')
const joi = require('joi')
const async = require('async')
const db = require('./dbTools/db') 

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

var connection = db.mongoose.connection
connection.on('error', console.error.bind(console, "MongoDB Connection Error"))

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
    'signupAuth': {
        'auth_token': auth_token_authenticator,
        'username': joi.string().required(),
        'password': joi.string().required().min(6).max(14),
        'name': joi.string().required(),
        'role': joi.string().required().valid(['client', 'terminal', 'admin']),
        'phone_no': joi.string().length(10).required()
    },
    'changePassword': {
        'auth_token': auth_token_authenticator,
        'newPassword': joi.string().required().min(6).max(14)
    },
    'terminalRequest': {
        'auth_token': auth_token_authenticator,
        'client_auth_token': auth_token_authenticator,
        'size': joi.number().valid([0, 1, 2]).default(0)
    }
}

const messages = {
    'invalidURL': 'Invalid URL!',
    'invalidUser': 'No user found with that username!',
    'invalidPassword': 'The user-password combination does not match!',
    'invalidParams': 'Invalid or missing parameters!',
    'userTaken': 'The username given is already in use. Select a different one',
    'signupOK': 'User registered!',
    'invalidAuth': 'Invalid auth_token!',
    'missingAuth': 'No auth token provided! Obtain an auth_token via `/authenticate`',
    'privError': 'Insufficient privileges to perform that action!',
    'genError': 'Whoops something went wrong!',
    'loginOK': 'Signed in!',
    'logoutOK': 'Logged out successfully!',
    'authOK': 'This user is logged in. Authentication works!',
    'pwChangedOK': 'Password changed successfully',
    'deregisterOK': 'User removed from database. Past records will be maintained, but this action cannot be reverted.',
    'noParkingAvailable': 'There are no available parking spots matching your requirements!',
    'bookParkingOK': 'A parking spot was assigned to you!',
    'freeParkingOK': 'The parking spot was freed. Thank you for your time',
    'opOK': 'The operation was successful.'
}

const authClientEndpointsList = [
    '/logout', 
    '/test',
    '/changePassword',
    '/deregisterClient',
    '/getCurrentBookings',
    '/getPastBookings'
]

const authAdminEndpointsList = [
    '/registerAdmin',
    '/logout',
    '/test',
    '/changePassword'
]

const authTerminalEndpointsList = [
    '/logout',
    '/test',
    '/changePassword',
    '/getCurrentStatus',
    '/toggleBooking'
]

const nonAuthEndpointsList = [
    '/', 
    '/registerClient',
    '/authenticate'
]

var sessions = {}

// TODO: Add payments to db
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
// var payments = {}

function generateAuthToken() {
    return Math.random().toString(36).padEnd(15, '0').substring(2, 15) + Math.random().toString(36).padEnd(15, '0').substring(2, 15);
}

function getCurrentBookings(user) {
    var filters = {
        'user': user,
        'dateTimeOfExit': undefined
    }

    return new Promise((resolve, reject) => {
        db.Booking_Details.find(filters).populate('user')
        .populate('lot')
        .populate('spot')
        .then(currentBookings => {
            resolve(currentBookings)
        }).catch(err => reject(err))
    })
}

function getCurrentBookingAtLot(user, client) {
    return new Promise((resolve, reject) => {
        db.Lot_Details.find({user: user})
        .then(lots => {
            var lot = lots[0]
            return db.Booking_Details.find({
                'user': client,
                'dateTimeOfExit': undefined,
                'lot': lot._id
            }).populate('user')
            .populate('lot')
            .populate('spot')
            .then(currentBookings => {
                resolve(currentBookings)
            }).catch(err => reject(err))
        })
    })
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
                return res.send(response_body)
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
    res.send({'allowedEndpoints': nonAuthEndpointsList})
})

app.post('/', (req, res) => {
    db.User_Details.find({'_id': sessions[req.body.auth_token]})
    .then(user_details => {
        switch (user_details[0].role) {
            case 'admin':
                res.send({'allowedEndpoints': authAdminEndpointsList})
                break;
            case 'terminal': 
                res.send({'allowedEndpoints': authTerminalEndpointsList})
                break;
            case 'client': 
                res.send({'allowedEndpoints': authClientEndpointsList})
                break;
        }
        res.send({'allowedEndpoints': nonAuthEndpointsList})
    })
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
        db.User_Details.find({'username': username})
        .then(user_details => {
            if(user_details[0]) {
                response_body['message'] = messages['userTaken']
                response_body['status'] = 'userTaken'
            } else {
                response_body['message'] = messages['signupOK']
                response_body['status'] = 'signupOK'
                return db.User_Details.create({
                    'username': username,
                    'password': password,
                    'name': name,
                    'role': "client",
                    'phone_no': phone_no
                })
            }
        }).catch((err) => {
            response_body['message'] = messages['genError']
            response_body['status'] = 'genError'
        }).then(() => {
            res.send(response_body)
        })
    }
})

app.post('/registerAuth', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['signupAuth'])

    // check if validation fails 
    if (result.error) {
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        var response_body = {}
        db.User_Details.find({'_id': sessions[result.value.auth_token]})
        .then(user_details => {
            if (user_details[0].role !== 'admin') {
                response_body['message'] = messages['privError']
                response_body['status'] = 'privError'
            } else {
                const username = result.value.username
                const password = result.value.password
                const name = result.value.name
                const role = result.value.role
                const phone_no = result.value.phone_no

                return db.User_Details.find({'username': username})
                .then(results => {
                    if(results[0]) {
                        response_body['message'] = messages['userTaken']
                        response_body['status'] = 'userTaken'
                    } else {
                        response_body['message'] = messages['signupOK']
                        response_body['status'] = 'signupOK'
                        return db.User_Details.create({
                            'username': username,
                            'password': password,
                            'nme': name,
                            'role': role,
                            'phone_no': phone_no
                        })
                    }
                })
            }
        }).catch((err) => {
            response_body['message'] = messages['genError']
            response_body['status'] = 'genError'
        }).then(() => {
            res.send(response_body)
        })
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

        db.User_Details.find({'username': username})
        .then(user_details => {
            if (user_details[0]) {
                if (user_details[0].password === password) {
                    response_body['message'] = messages['loginOK']
                    response_body['username'] = username
                    response_body['auth_token'] = generateAuthToken()
                    response_body['status'] = 'loginOK'
                    response_body['role'] = user_details[0].role
                    sessions[response_body['auth_token']] = user_details[0]._id
                } else {
                    response_body['message'] = messages['invalidPassword']
                    response_body['status'] = 'invalidPassword'   
                }
            } else {
                response_body['message'] = messages['invalidUser']
                response_body['status'] = 'invalidUser'
            }
            res.send(response_body)
        })
        .catch(err => {
            res.send({
                'status': 'genError',
                'message': messages['genError']
            })
        })
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

        var response_body = {}
        db.User_Details.find({_id: sessions[auth_token]})
        .then(users => {
            users[0].password = newPassword
            return users[0].save()
        })
        .then(() => {
            response_body['message'] = messages['pwChangedOK']
            response_body['status'] = 'pwChangedOK'
        })
        .catch(err => {
            response_body['message'] = messages['genError']
            response_body['status'] = 'genError'
        })
        .then(() => res.send(response_body))
    }
})

app.post('/deregisterClient', (req, res) => {
    const auth_token = req.body.auth_token
    const userID = sessions[auth_token]
    
    var response_body = {}
    db.User_Details.find({_id: userID})
    .then(users => {
        var user = users[0]
        if (user.role === 'client') {
            response_body['message'] = messages['deregisterOK']
            response_body['status'] = 'deregisterOK'
            delete sessions[auth_token]
            return db.User_Details.deleteOne({_id: user._id})
        } else {
            response_body['message'] = messages['privError']
            response_body['status'] = 'privError'
        }
    })
    .catch(err => {
        response_body['message'] = messages['genError']
        response_body['status'] = 'genError'
    })
    .then(() => res.send(response_body))
})

// Client End
app.post('/getCurrentBookings', (req, res) => {
    const auth_token = req.body.auth_token
    const userID = sessions[auth_token]
    
    var response_body = {}
    db.User_Details.find({_id: userID})
    .then(users => {
        var user = users[0]
        if (user.role === 'client') {
            response_body['message'] = messages['opOK']
            response_body['status'] = 'opOK'

            return getCurrentBookings(userID)
            .then((currentBookings) => {
                response_body['currentBookings'] = currentBookings
            })
        } else {
            response_body['message'] = messages['privError']
            response_body['status'] = 'privError'
        }
    })
    .catch(err => {
        response_body['message'] = messages['genError']
        response_body['status'] = 'genError'
    })
    .then(() => {
        res.send(response_body)
    })
})

app.post('/getPastBookings', (req, res) => {
  const auth_token = req.body.auth_token
  const userID = sessions[auth_token]
  
  var response_body= {}
  db.User_Details.find({_id: userID})
  .then((users) => {
    var user = users[0]
    if (user.role === 'client') {
        response_body['message'] = messages['opOK']
        response_body['status'] = 'opOK'

        return db.Booking_Details.find({user: userID}).populate('lot').populate('spot')
        .then((bookingDetails) => {
            response_body['pastBookings'] = bookingDetails
        })
    } else {
        response_body['message'] = messages['privError']
        response_body['status'] = 'privError'
    }
  })
  .catch(err => {
      response_body['message'] = messages['genError']
      response_body['status'] = 'genError'
  })
  .then(() => {
      res.send(response_body)
  })
})

// Operations End
// getCurrentStatus
app.post('/getCurrentStatus', (req, res) => {
    var result = joi.validate(req.body, validators['terminalRequest']) 
    
    if(result.error) {
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        var auth_token = req.body.auth_token
        var client_auth_token = req.body.client_auth_token
        var userID = sessions[auth_token]
        
        var response_body = {}
        db.User_Details.find({_id: userID})
        .then(users => {
            var user = users[0]
            if (user.role === 'terminal') {
                return db.User_Details.find({_id: sessions[client_auth_token]})
                .then(clients => {
                    if(clients.length === 0) {
                        response_body['message'] = messages['invalidUser']
                        response_body['status'] = 'invalidUser'
                    } else {
                        return getCurrentBookingAtLot(sessions[auth_token], sessions[client_auth_token])
                        .then(currentSpots => {
                            response_body['currentSpots'] = currentSpots[0]
                            response_body['message'] = messages['opOK']
                            response_body['status'] = 'opOK'
                        })
                    }
                })
            } else {
                response_body['message'] = messages['privError']
                response_body['status'] = 'privError'
            }
        })
        .catch(err => {
            response_body['message'] = messages['genError']
            response_body['status'] = 'genError'
        })
        .then(() => {
            res.send(response_body)
        })
    }
})

// allocateParking
app.post('/toggleBooking', (req, res) => {
    const result = joi.validate(req.body, validators['terminalRequest']) 
    if(result.error) {
        res.send({
            'message': result.error.details[0].message,
            'status': 'invalidParams'
        })
    } else {
        var auth_token = result.value.auth_token
        var client_auth_token = result.value.client_auth_token
        var size = result.value.size
        var userID = sessions[auth_token]
        
        var response_body = {}
        db.User_Details.find({_id: userID})
        .then(users => {
            var user = users[0]
            if (user.role === 'terminal') {
                return db.User_Details.find({_id: sessions[client_auth_token]})
                .then(clients => {
                    if(clients.length === 0) {
                        response_body['message'] = messages['invalidUser']
                        response_body['status'] = 'invalidUser'
                    } else {
                        return getCurrentBookingAtLot(sessions[auth_token], sessions[client_auth_token])
                        .then(currentSpots => {
                            if(currentSpots.length === 0) {
                                // Book a parking
                                db.Lot_Details.findOne({user: userID})
                                .then(lot => {
                                    return Promise.all([db.Booking_Details.find({lot: lot._id, dateTimeOfExit: undefined}), lot])
                                })
                                .then(([bookings, lot]) => {
                                    switch (size) {
                                        case 0:
                                            size = 'Small'
                                            break;
                                        case 1:
                                            size = 'Medium'
                                            break;
                                        case 2:
                                            size = 'Large'
                                            break;
                                        default:
                                            size = 'Medium'
                                    }

                                    return db.Spot_Details.find({
                                        lot: lot._id,
                                        _id: {
                                            $not: {
                                                $in: bookings.map(booking => {
                                                    return booking.spot
                                                })
                                            }
                                        },
                                        size: size
                                    })
                                })
                                .then(spots => {
                                    if(spots[0]) {
                                        response_body['message'] = messages['bookParkingOK'] + " Proceed to " + spots[0].name
                                        response_body['status'] = 'bookParkingOK'
                                        db.Booking_Details.create({
                                            'user': sessions[client_auth_token],
                                            'lot': spots[0].lot,
                                            'spot': spots[0]._id,
                                            'dateTimeOfBooking': new Date()
                                        })
                                    } else {
                                        response_body['message'] = messages['noParkingAvailable']
                                        response_body['status'] = 'noParkingAvailable'
                                    }
                                }).then(() => {
                                    res.send(response_body)
                                })
                            } else {
                                // Free the parking
                                currentSpots[0].dateTimeOfExit = new Date()
                                currentSpots[0].save()
                                response_body['message'] = messages['freeParkingOK']
                                response_body['status'] = 'freeParkingOK'
                                res.send(response_body)
                            }
                        })
                    }
                })
            } else {
                response_body['message'] = messages['privError']
                response_body['status'] = 'privError'
                res.send(response_body)
            }
        }).catch(err => {
            response_body['message'] = messages['genError']
            response_body['status'] = 'genError'
            res.send(response_body)
        })
    }
})

// Admin End
// registerLots
// getLots
// getCurrentBuildingStatus
// getLotLogs
// getUserHistory

app.post('/test', (req, res) => {
    var response_body = {}
    const auth_token = req.body.auth_token
    
    response_body['message'] = messages['authOK']
    response_body['status'] = 'authOK'
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
