function ends_with_zkratka(text)
{
    var zkratky = [
        ' tzv.', ' tzn.', ' tj.', ' mj.', ' např.', ' kupř.', ' popř.'
    ];
    return zkratky.some(function(v) { return text.indexOf(v) >= 0; });    
}

function _load_sentences(source, date_add, id_str) {
    var ret = [];
    var sent_date = date_add;
    var sentence_to_add = '';
    var push_it = false;
    

    if (!(source.constructor === Array)) {
        return ret;
    }

    try {
        source.forEach(function(child) {
            /*
            Recursive walk 
            */
            if (child.type && child.type != 'Sentence') {
                var inner = _load_sentences(child, sent_date, id_str);
                ret = ret.concat(inner);
            }
            /*
            deal with single sentence
            */
            else {
                sentence_to_add += child.raw.replace(/@\w+/g,'');
                                     
                /*
                  add it as complete senctence if it is not of the form 
                  " [SingleLetter]." pattern                               some std. czech abbreviation pattern   
                */
                if (sentence_to_add[sentence_to_add.length - 3] != ' ' && ! ends_with_zkratka(sentence_to_add)) {
                    push_it = true;
                }
                else {
                   // else next sentence is likley to be continuation of the previous 
                   sentence_to_add += ' ';                
                }


                if (push_it == true) {
                    // remove urls
                    sentence_to_add = sentence_to_add.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');

                    // capitalize first letter 
                    sentence_to_add = sentence_to_add.trim().replace(/^\w/, c => c.toUpperCase());

                    // add sentence to the return object
                    ret.push({
                        created_at: sent_date, 
                        id: id_str, 
                        text: sentence_to_add
                    });

                    // clear state
                    sentence_to_add = '';
                    push_it = false;
                }
            }
        });
    }
    catch(e) {   
        console.log(e);
    }

    // push if not empty
    if(sentence_to_add != '') {
                ret.push({
                    created_at: sent_date, 
                    id: id_str, 
                    text: sentence_to_add.trim()
                });
    }

    return ret;
}

/* export functions*/
sentencer = {
    load_sentences: function(source, date_add, id_str) {
        return _load_sentences(source, date_add, id_str);
    }
}

module.exports = sentencer;
