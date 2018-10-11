var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var functions = require('./functions');
var config = require('./config');
var conf = new config();

var app = express();

//Set up mongoose connection
var mongoose = require('mongoose');
var mongoDB = conf.db;

mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.json());
app.use(cors(conf.cors));

//app.post('/authorize', functions.authorize);
app.post('/create_tweeet', functions.create_tweeet);


app.listen(8080);

