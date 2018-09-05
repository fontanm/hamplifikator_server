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

//var mongoDB = 'mongodb://localhost:27017/twitter-store';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

//app.post('/authorize', functions.authorize);
app.post('/create_tweeet', functions.create_tweeet);


app.listen(8080);

