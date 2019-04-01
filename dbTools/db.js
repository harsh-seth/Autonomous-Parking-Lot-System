const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectID = Schema.Types.ObjectId


mongoose.connect('mongodb://localhost/parking_system', {useNewUrlParser: true})
mongoose.set('useCreateIndex', true)

const user_details_schema = new Schema({
    'username': {
        type: String,
        unique: true,
        required: true
    },
    'name': {
        type: String,
        required: true
    },
    'password': {
        type: String,
        required: true
    },
    'role': {
        type: String,
        default: false,
        required: true,
        enum: ["admin", "terminal", "client"]
    },  
    'phone_no': {
        type: String,
        required: true
    }

})

var User_Details =  mongoose.model('User_Details', user_details_schema)

const lot_details_schema = new Schema({
    'name': {
        type: String,
        required: true
    },
    'location': {
        type: String,
        required: true
    },
    'user': {
        type: ObjectID,
        ref: 'User_Details'
    }
})

var Lot_Details = mongoose.model('Lot_Details', lot_details_schema)

const spot_details_schema = new Schema({
    'size': {
        type: String,
        enum: ['Small', 'Medium', 'Large'],
        required: true
    },
    'name': {
        type: String,
        required: true
    },
    'lot': {
        type: ObjectID, 
        ref: 'Lot_Details'
    }
})

// spot_details_schema.index({_id: 1, 'lotID': 1}, {unique: true})

var Spot_Details = mongoose.model('Spot_Details', spot_details_schema)

const booking_details_schema = new Schema({
    'user': {
        type: ObjectID,
        ref: 'User_Details',
        required: true
    },
    'lot': {
        type: ObjectID, 
        ref: 'Lot_Details',
        required: true
    },
    'spot': {
        type: ObjectID,
        ref: 'Spot_Details',
        required: true
    },
    'dateTimeOfBooking': {
        type: Date,
        required: true
    },
    'dateTimeOfExit': {
        type: Date,
        required: false,
        default: undefined
    }
})

var Booking_Details = mongoose.model('Booking_Details', booking_details_schema)

exports.User_Details = User_Details
exports.Lot_Details = Lot_Details
exports.Spot_Details = Spot_Details
exports.Booking_Details = Booking_Details
exports.mongoose = mongoose
