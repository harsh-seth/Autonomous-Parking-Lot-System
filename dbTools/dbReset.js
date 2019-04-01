var db = require('./db')

var connection = db.mongoose.connection

var user_details = [
    {
        'username': 'admin',
        'name': 'Admin',
        'password': 'admin1234',
        'role': "admin",
        'phone_no': "98765443210"
    },
    {
        'username': 'client',
        'name': 'Client',
        'password': 'client1234',
        'role': "client",
        'phone_no': "9876543210" 
    },
    {
        'username': 'terminal',
        'name': "Terminal",
        'password': 'terminal1234',
        'role': "terminal",
        'phone_no': "9887766554"
    }
]

connection.once('open', async () => {
    connection.db.dropDatabase()
    .then(() => {
        return db.User_Details.create(user_details)
    }).then((users) => {
        var lots = db.Lot_Details.create([{
            'name': "ACME Parking Lot 1",
            'location': 'VIT',
            'user': users[2]._id
        }])
        return Promise.all([users, lots])
    }).then(([users, lots]) => {
        var spots = db.Spot_Details.create([{
            'size': 'Small',
            'name': "Spot 1",
            'lot': lots[0]._id
        }])
        return Promise.all([users, lots, spots])
    }).then(([users, lots, spots]) => {
        var bookings = [
            {
                'user': users[1]._id,
                'lot': lots[0]._id,
                'spot': spots[0]._id,
                'dateTimeOfBooking': new Date()
            }
        ]
        return db.Booking_Details.create(bookings)
    }).catch(err => {
        console.log("Error! ", err)
    }).then(() => {
        connection.close()
        console.log("Reset done!")
    })
})