var request = require('request');
var rp = require('request-promise-native');
var config = require('./config');

function load_sentences(source, date_add, id_str)
{
    var ret = [];
    var sent_date = date_add;
    var sentence_to_add = '';
    var push_it = false;

    if(!(source.constructor === Array))
        return ret;

    try
    {
        //source.children.forEach(function(child){
        source.forEach(function(child){
            if(child.type && child.type != 'Sentence')
            {
                var inner = load_sentences(child, sent_date, id_str);
                ret = ret.concat(inner);
            }
            else
            {
                sentence_to_add += child.raw.replace(/@\w+/g,'');
                                       
                if(sentence_to_add[sentence_to_add.length - 3] != ' ')
                    push_it = true;
                else
                    sentence_to_add += ' ';                

                if(push_it == true){
                    ret.push({created_at: sent_date, id: id_str, text: sentence_to_add.trim()});
                    sentence_to_add = '';
                    push_it = false;
                }
            }
        });
    }
    catch(e)
    {   
        console.log(e);
    }

    if(sentence_to_add != '')
                ret.push({created_at: sent_date, id: id_str, text: sentence_to_add.trim()});

    return ret;
}

function getTopTweet(encsearchquery)
{

 var TweetSentence = require('./model/tweetSentence');

 return new Promise((resolve, reject) => {
    TweetSentence.find({user: encsearchquery})
                     .limit(1)
                     .sort({tweet_id: -1})
                     .then(function(top_tweet){
                                //console.log(top_tweet);

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

function getAuthor(encsearchquery)
{

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

function getInitialData(encsearchquery)
{
    return new Promise((resolve, reject) => {
        var initData = {
            toptweet : 0,
            author : {}
        };

        getTopTweet(encsearchquery).then(function(top_tweet)
        {
            initData.toptweet = top_tweet;
            getAuthor(encsearchquery).then(function(author)
            {   
                if(!((typeof author === "undefined")))
                    initData.author = author;

                resolve(initData);
            });
        })
        .catch((err) => { reject(err)})        
    }); 
 
}

function findAdditionalTweets(encsearchquery, items)
{
    var TweetSentence = require('./model/tweetSentence');
    var sentences = [];
    return new Promise((resolve, reject) => {
            if(300 - items < 1) 
                resolve([]);

            TweetSentence.find({user: encsearchquery})
                 .limit(300 - items)
                 .sort({tweet_id: -1})
                 .then(function(db_sentences){
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
                                    })
                 .catch((err) => {
                        reject(err)
                    });                 
        });    
}

function dealWithAPIResult(result, toptweet, encsearchquery, hasUser)
{
    var TweetSentence = require('./model/tweetSentence');
    var TweetAuthor = require('./model/tweetAuthor');
    //var TextParse = require('text-parse');
    var TextParse = require('sentence-splitter');
    var sentences = [];
    var addUser = !hasUser;
    var user = {};

    result.forEach(
        function(element)
        {
            if(element.full_text != null && element.full_text.length > 0 && (toptweet = 0 || element.id > toptweet ))
            {
                try{
                    //var parser = TextParse();

                    //var text = parser.parse(element.full_text);
                    var text = TextParse.split(element.full_text);
                    
                    var new_sentences = load_sentences(text, element.created_at, element.id);

                    // add sent to db
                    new_sentences.forEach(function(sentence){
                        var text = sentence.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
                        if (text.trim() !== '') {
                            var myData = new TweetSentence({
                                                            tweet_id: sentence.id,
                                                            date: sentence.created_at,
                                                            user: encsearchquery, 
                                                            text: text,
                                                        });
                            myData.save()
                                .then(item => {}) // we do not need to anything about success ...
                                .catch(err => {
                                  console.log(err);
                                });
                        }
                    });

                    sentences = sentences.concat(new_sentences);
                    //console.log(element);
                }
                catch(e)
                {
                   console.log(e);
                   // it may end here because some parsed text doe snot contain any "sentence"... but we will ignore it                               
                }
                user = element.user;
            }
        });

    if(addUser)
    {
        var myData = new TweetAuthor({
                              screenName: encsearchquery,
                              profile_image_url_https: user.profile_image_url_https,
                              name: user.name                                                    
                          });
        myData.save()
            .then(item => {}) // we do not need to anything about success ...
            .catch(err => {
              console.log(err);
            });
    }

    return {
        sentences: sentences,
        user: user
    };
}

function authorize() {
    var header = config.consumerkey + ':' +config.consumersecret;
    var encheader = new Buffer(header).toString('base64');
    var finalheader = 'Basic ' + encheader;

    return new Promise((resolve, reject) => {
        if(config.bearertoken != '')
        {
            resolve(true);
        }
        else
        {
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
            .then(function(body)
                {
                    config.bearertoken = JSON.parse(body).access_token;
                    resolve(true);
                })
            .catch(function(error){
                    reject(error);
                });            
        }
    });
}

/* export functions*/
functions = {
    create_tweeet: function(req, res) {
        console.time("create_tweeet");
        
        authorize().then(() => {
            var searchquery = req.body.query;
            var encsearchquery = encodeURIComponent(searchquery);
            var bearerheader = 'Bearer ' + config.bearertoken;

            getInitialData(encsearchquery).then(
                function(initData) {        
                    var query = 'https://api.twitter.com/1.1/statuses/user_timeline.json';

                    //console.log(query);
                    //console.log(initData);

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

                    if(initData.toptweet != 0 && initData.toptweet != undefined) 
                    {
                        options.qs.since_id = initData.toptweet;
                    }

                    rp(options)
                    .then(
                        function(body){
                            //console.log(body);
                            var result = JSON.parse(body);
                            var user = {};                                 
                            var hasUser = false;

                            if(Object.keys(initData.author).length > 0)
                            {
                                hasUser = true;
                                user = initData.author;   
                            }

                            var resultAPI = dealWithAPIResult(result, initData.toptweet, encsearchquery, hasUser);
                            

                            sentences = resultAPI.sentences;

                            if(!hasUser)
                            {
                                user = resultAPI.user;
                            }

                            var items = sentences.length;

                            console.log(items + ' items added into db');
                            
                            findAdditionalTweets(encsearchquery, items).then(
                                function(dbSentences){ 
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
                    .catch(function(error)
                    {
                        console.log(error);
                    });
                });
        });
        console.timeEnd("create_tweeet");
    }
}
module.exports = functions;