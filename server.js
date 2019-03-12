const express = require('express')

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const portNum = 3000

const messages = {
    'invalidURL': 'invalid URL!'
}

app.get('*', (req, res) => {
    var res_body = {
        'msg': messages['invalidURL']
    }
    res.send(res_body)
})

app.post('*', (req, res) => {
    var res_body = {
        'msg': 'invalid URL!'
    }
    res.send(res_body)
})

app.listen(portNum)
console.log("Server is up at", portNum)