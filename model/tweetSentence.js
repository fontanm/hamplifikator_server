//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;

var tweetSentenceSchema = new Schema({
  tweet_id: Number,	
  date: Date,  
  user: String,
  text: String,
});


//Export function to create "SomeModel" model class

module.exports = mongoose.model("Tweet_Sentence", tweetSentenceSchema);