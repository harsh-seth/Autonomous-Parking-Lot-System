const express = require('express')

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const portNum = 3000

app.get('*', (req, res) => {
    res.send('Autonomous Parking Lot System')
})

app.listen(portNum)
console.log("Server is up at", portNum)