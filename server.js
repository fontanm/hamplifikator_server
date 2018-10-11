var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var https = require('https');
var http = require('http');

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

http.createServer(app).listen(8080);

if (conf.prod == true) {
	var fs = require('fs');
	var options = {
		key: fs.readFileSync(conf.ssl.privateKeyFile,'utf8'),
		cert: fs.readFileSync(conf.ssl.certificateFile,'utf8')
	};

	https.createServer(options, app).listen(8081);
}


//app.listen(8080);
app.listen = function() {
	var server = http.createServer(this);
	return server.listen.apply(server, arguments);
};

