var request = require('request');
var rp = require('request-promise-native');
var config = require('./config');
var conf = new config();

/*
 * Return latest save tweet for particular author
 */
function getTopTweet(encsearchquery)
{

 var TweetSentence = require('./model/tweetSentence');

 return new Promise((resolve, reject) => {
    TweetSentence.find({user: encsearchquery})
                     .limit(1)
                     .sort({tweet_id: -1})
                     .then(function(top_tweet){
                                if(top_tweet.length > 0)
                                    resolve(top_tweet[0].tweet_id);
                                else 
                                    resolve(0);
                     })
                     .catch((err) => {
                        reject(err);
                     })   
    });
}

/*
 * Return details about author
 */
function getAuthor(encsearchquery) {

 var TweetAuthor = require('./model/tweetAuthor');

 return new Promise((resolve, reject) => {
    TweetAuthor.find({screenName: encsearchquery})
                     .limit(1)
                     .then(function(author){
                                resolve(author[0]);
                     })
                     .catch((err) => {
                        reject(err);
                     })   
    });
}

/*
 * Initial data - top tweet and author's details
 */
function getInitialData(encsearchquery) {
    return new Promise((resolve, reject) => {
        var initData = {
            toptweet : 0,
            author : {}
        };

        getTopTweet(encsearchquery).then(function(top_tweet)
        {
            initData.toptweet = top_tweet;
            getAuthor(encsearchquery).then(function(author) {   
                if (!((typeof author === "undefined"))) {
                    initData.author = author;
                }

                resolve(initData);
            });
        })
        .catch((err) => { reject(err) })        
    }); 
 
}

/*
 * Get odler tweets from the db to get 300 sentences
 */ 
function findAdditionalTweets(encsearchquery, items) {
    var TweetSentence = require('./model/tweetSentence');
    var sentences = [];

    return new Promise((resolve, reject) => {
            if (300 - items < 1) { 
                resolve([]);
            }

            TweetSentence.find( {user: encsearchquery} )
                .limit(300 - items)
                .sort({tweet_id: -1})
                .then(function(db_sentences) {
                                        db_sentences.forEach(function(db_sentence){
                                            sentences = sentences.concat([
                                                {
                                                    created_at: db_sentence.date,
                                                    id: db_sentence.tweet_id,
                                                    text: db_sentence.text 
                                                }
                                                ]);
                                        });
                                        resolve(sentences);
                }).catch((err) => {
                        reject(err)
                });                 
        });    
}

function dealWithAPIResult(result, toptweet, encsearchquery, hasUser) {
    var TweetSentence = require('./model/tweetSentence');
    var TweetAuthor = require('./model/tweetAuthor');
    var TextParse = require('sentence-splitter');
    var sentencer = require('./lib/sentencer');    
    var sentences = [];

    // flag if the user data needs to be saved
    var addUser = !hasUser;
    var user = {};

    result.forEach( function(element) {
        // we are interested only in results wiht (full)text
        if (element.full_text != null && element.full_text.length > 0 && (toptweet = 0 || element.id > toptweet )) {
            try {
                // parse text using TextParse
                var parsed_text = TextParse.split(element.full_text);
                
                // parse sentences using our own sentence parser
                var new_sentences = sentencer.load_sentences(parsed_text, element.created_at, element.id);

                // add sentences to the database
                new_sentences.forEach(function(sentence){
                    if (sentence.text.trim() !== '') {
                        var myData = new TweetSentence({
                                                        tweet_id: sentence.id,
                                                        date: sentence.created_at,
                                                        user: encsearchquery, 
                                                        text: sentence.text,
                                                    });
                        myData.save()
                            .then(item => {}) // we do not need to anything about success ...
                            .catch(err => {
                              console.log(err);
                            });
                    }
                });

                sentences = sentences.concat(new_sentences);
            }
            catch(e) {
               console.log(e);
            }
            user = element.user;
        }
    });

    /*
     * Add user if she does not exist
     */
    if (addUser) {
        var myData = new TweetAuthor({
                              screenName: encsearchquery,
                              profile_image_url_https: user.profile_image_url_https,
                              name: user.name                                                    
                          });
        myData.save().then(item => {}) // we do not need to anything about success ...
            .catch(err => {
              console.log(err);
            });
    }
    return {
        sentences: sentences,
        user: user
    };
}


/*
 * Twitter autohorization
 */
function authorize() {
    var header = conf.appsettings.consumerkey + ':' + conf.appsettings.consumersecret;
    var encheader = (Buffer.from(header)).toString('base64');
    var finalheader = 'Basic ' + encheader;

    return new Promise((resolve, reject) => {
        if (conf.appsettings.bearertoken != '') {
            resolve(true);
        }
        else {
            var options = {
                    method: 'POST',
                    uri: 'https://api.twitter.com/oauth2/token',
                    formData: {
                        'grant_type': 'client_credentials'
                    },
                    headers: {
                        Authorization: finalheader
                    }
                    
            };
            
            rp(options)
            .then(function(body) {
                conf.appsettings.bearertoken = JSON.parse(body).access_token;
                resolve(true);
            })
            .catch(function(error) {
                reject(error);
            });            
        }
    });
}

/* export functions*/
functions = {
    create_tweeet: function(req, res) {
        console.time("create_tweeet");
        
        authorize().then( () => {
            var searchquery = req.body.query;
            var encsearchquery = encodeURIComponent(searchquery);
            var bearerheader = 'Bearer ' + conf.appsettings.bearertoken;

            // after getting initial data (toptweet is the most important one)
            getInitialData(encsearchquery).then(
                function(initData) {        

                    // prepare call to twitter API
                    var query = 'https://api.twitter.com/1.1/statuses/user_timeline.json';

                    var sentences = []; 

                    var options = {
                            uri: query,
                            qs: {
                                screen_name : encsearchquery,
                                result_type : 'recent',
                                tweet_mode : 'extended',
                            },
                            headers: {
                                Authorization: bearerheader
                            }                                
                    };

                    // passign top tweet id - i.e. top tweet that we already have in the db
                    if (initData.toptweet != 0 && initData.toptweet != undefined) {
                        options.qs.since_id = initData.toptweet;
                    }

                    // call the API
                    rp(options)
                    .then(
                        function(body){
                            //console.log(body);
                            var result = JSON.parse(body);
                            var user = {};                                 
                            var hasUser = false;

                            if (Object.keys(initData.author).length > 0) {
                                hasUser = true;
                                user = initData.author;   
                            }

                            var resultAPI = dealWithAPIResult(result, initData.toptweet, encsearchquery, hasUser);
                            

                            sentences = resultAPI.sentences;

                            if (!hasUser) {
                                user = resultAPI.user;
                            }
                            // hack to update img src all the time
                            // TODO: fix db entry
                            if( resultAPI.user.profile_image_url_https && user.profile_image_url_https != resultAPI.user.profile_image_url_https)
                            {
                                var TweetAuthor = require('./model/tweetAuthor');
                                TweetAuthor.findOneAndUpdate(
                                    {screenName: resultAPI.user.screenName},
                                    {profile_image_url_https: resultAPI.user.profile_image_url_https},
                                    function(err, author) {
                                        if (err) 
                                            console.log(err);
                                        else
                                            console.log('author updated');
                                    });
                                
                                user.profile_image_url_https = resultAPI.user.profile_image_url_https;
                            }                            



                            var items = sentences.length;

                            console.log(items + ' items added into db');
                            
                            findAdditionalTweets(encsearchquery, items).then(
                                function(dbSentences) { 
                                    sentences = sentences.concat(dbSentences);

                                    res.json({
                                        success: true, 
                                        data: sentences, 
                                        user_image: user.profile_image_url_https, 
                                        user_name: user.name 
                                    });
                                }, 
                                function(err) {
                                    console.log(err)
                                });

                        })
                    .catch(function(error) {
                        console.log(error);
                    });
                });
        });
        console.timeEnd("create_tweeet");
    }
}

module.exports = functions;