//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;

var tweetAuthorSchema = new Schema({
  screenName: String,
  profile_image_url_https: String,
  name: String
});


//Export function to create "SomeModel" model class

module.exports = mongoose.model("Tweet_Author", tweetAuthorSchema);