const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const router = require('./router');

let env = require('dotenv').config();

const PORT = process.env.PORT || 3000;
const host = 'localhost';
const MONGODB_LINK = process.env.MONGODB_LINK;

mongoose.connect(MONGODB_LINK, { useUnifiedTopology: true, useNewUrlParser: true });

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/api', router);

const start = async () => {
    try {
        await mongoose.connect(MONGODB_LINK, { useUnifiedTopology: true, useNewUrlParser: true });

        app.listen(PORT, host, function () {
            console.log(`Server listens http://${host}:${PORT}`)
        });
    }
    catch (err) {
        console.log(err);
    }
}

start();