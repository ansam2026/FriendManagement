const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const assert = require('assert');
var validator = require('validator');

const CONNECTION_URL = "mongodb+srv://testuser:testuser@cluster0-5vagu.mongodb.net/test?retryWrites=true&w=majority";
const DATABASE_NAME = "FriendManagementDB";

var app = Express();
app.use(BodyParser.urlencoded({ extended: true }));
app.use(BodyParser.json());

var database, collection;

app.listen(3000, () => {
    MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
        if (error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("friends");
        console.log("Connected to `" + DATABASE_NAME + "`!");
    });
});

//get full list
app.get("/friends/getFullList", (request, response) => {
    collection.find({}).toArray((error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        response.send(result);
        console.log(result);
    });
});


//1. Update document to make friend connection
app.post("/Addfriend", (request, response) => {

    var friends = request.body.friends;

    var friendA = friends[0];
    var friendB = friends[1];

    var result = validateFriends(friends);

    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    isBlocked(friendA, friendB, function (err, count) {
        if (err) console.log(err);
        if (count == 0) {
            collection.update(
                { "id": friendA },
                {
                    $addToSet: { "friends": friendB }
                },
                { upsert: true }, function (err, results) {
                    if (err) {
                        return response.send(results);
                    }
                });
            collection.update(
                { "id": friendB },
                {
                    $addToSet: { "friends": friendA }
                },
                { upsert: true }, function (err, results) {
                    if (err) {
                        return response.send(results);
                    }
                });
            return response.send(prettifyJSON({ success: true }));
        }
    });
});

//2. get Friend lists
app.post("/getfriendlist", (request, response) => {
    var inputEmail = request.body.email;
    var result = checkIfEmailInString(inputEmail);

    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    var query = { "id": inputEmail };
    collection.find(query).toArray((error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        response.send(prettifyJSON({ success: true, friends: result[0].friends, count: result.length }));
    });
});

//3. get common friend
app.post("/Commonfriend", (request, response) => {

    var friends = request.body.friends;

    var friendA = friends[0];
    var friendB = friends[1];

    var result = validateFriends(friends);

    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    var commonFriend = [];
    var frndListA = [];
    var frndListB = [];

    var query = { "id": friendA };
    collection.find(query).toArray((error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        // console.log(result[0].id);
        frndListA = result[0].friends;

        //runnig inside code becos of asynch mode
        var query = { "id": friendB };
        collection.find(query).toArray((error, result) => {
            if (error) {
                return response.status(500).send(error);
            }
            frndListB = result[0].friends;

            if (frndListA != null && frndListB != null) {
                for (var i = 0; i < frndListA.length; i++) {
                    for (var e = 0; e < frndListB.length; e++) {
                        if (frndListA[i] === frndListB[e]) {
                            commonFriend.push(frndListA[i]);
                        }
                    }
                }
            }
            response.send(prettifyJSON({ success: true, friends: commonFriend, count: commonFriend.length }));

        });
    });
});

//4. subscribe to email
app.post("/subscribe", (request, response) => {

    var requestor = request.body.requestor;
    var result = checkIfEmailInString(requestor);
    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    var target = request.body.target;
    var result = checkIfEmailInString(target);
    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    collection.update(
        { "id": requestor },
        {
            $addToSet: { "subscribe": target }
        },
        { upsert: true }, function (err, results) {
            if (err) { return response.status(500).send(err); }
        });
    collection.update(
        { "id": target },
        {
            $addToSet: { "follower": requestor }
        },
        { upsert: true }, function (err, results) {
            if (err) { return response.status(500).send(err); }
        });
    return response.send(prettifyJSON({ success: true }));
});

//5. Block from updates
app.post("/block", (request, response) => {

    var requestor = request.body.requestor;
    var result = checkIfEmailInString(requestor);
    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    var target = request.body.target;
    var result = checkIfEmailInString(target);
    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    collection.update(
        { "id": requestor },
        {
            $addToSet: { "block": target }
        },
        { upsert: true }, function (err, results) {
            if (err) { return response.status(500).send(err); }
            return response.send(prettifyJSON({ success: true }));
        });
});

//6. get recipient emails to recv updates 
app.post("/recipients", (request, response) => {

    var sender = request.body.sender;
    var result = checkIfEmailInString(sender);
    if (result.success == false) {
        return response.send(prettifyJSON(result));
    }

    var text = request.body.text;
    var recipientList = [];
    var friendList = [];
    var followerList = [];
    var emailInText = [];
    var blocks = [];

    var query = { "id": sender };
    collection.find(query).toArray((error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        friendList = result[0].friends;
        followerList = result[0].follower;
        blocks = result[0].block;

        //add friends
        if (friendList != null) {
            for (var i = 0; i < friendList.length; i++) {
                if (!recipientList.includes(friendList[i])) {
                    recipientList.push(friendList[i]);
                }
            }
        }

        //add followers
        if (followerList != null) {
            for (var i = 0; i < followerList.length; i++) {
                if (!recipientList.includes(followerList[i])) {
                    recipientList.push(followerList[i]);
                }
            }
        }

        //add text email
        emailInText = getEmailInString(text);
        if (emailInText != null) {
            for (var i = 0; i < emailInText.length; i++) {
                if (!recipientList.includes(emailInText[i])) {
                    recipientList.push(emailInText[i]);
                }
            }
        }

        //remove block email
        if (blocks != null) {
            var index;
            for (var i = 0; i < blocks.length; i++) {
                index = recipientList.indexOf(blocks[i]);
                if (index > -1) {
                    recipientList.splice(index, 1);
                }
            }
        }

        response.send(prettifyJSON({ success: true, recipients: recipientList, count: recipientList.length }));

    });
});

app.get("/getList1", (request, response) => {
    var query = { email: 'test1@fm.com' };
    collection.find(query).toArray((error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        response.send(result);
        console.log(result);
    });
});

app.post("/searchEmail", (request, response) => {
    var query = { email: 'test1@fm.com' };
    console.log(request.query.email);
    collection.find(query).toArray((error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        response.send(result);
        console.log(result);
    });
});

var isBlocked = function (requestor, target, callback) {
    collection.find({
        "id": target,
        "block": { $in: [requestor] }
    }).count(function (err, count) {
        console.log(count);
        return callback(null, count);
    });
};

function validateFriends(friends) {
    // Check if email given more than 2 or less than 2
    if (friends.length != 2)
        return { success: false, reason: "There should be 2 emails" };

    // Check values
    if (!friends[0] || !friends[1])
        return { success: false, reason: "email cannot be null or empty" };

    // Check if duplicate email
    if (validator.equals(friends[0], friends[1]))
        return { success: false, reason: "email 1 and email 2 are same" };

    // Check if email are valid
    if (!validator.isEmail(friends[0]))
        return { success: false, reason: "incorrect email 1 format" };
    if (!validator.isEmail(friends[1]))
        return { success: false, reason: "incorrect email 2 format" };

    return { success: true };
};

var checkIfEmailInString = function (text) {
    var regex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    var isEmailTxt = text.match(regex);
    if (isEmailTxt) {
        return { success: true };
    }
    else {
        return { success: false, reason: "incorrect email format" };
    }

}

var getEmailInString = function (text) {
    var regex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    return text.match(regex);
}

var prettifyJSON = function (jsonData) {
    return JSON.stringify(jsonData, null, 4);
}



//insert initial data in friends collection
app.get("/friends/addAll", (request, response) => {
    collection.insertOne({
        "id": "andy@example.com",
        "friends": [
            "john@example.com"
        ],
        "subscribe": [
            "lisa@example.com"
        ],
        "follower": [
            "tim@example.com"
        ],
        "block": [
            "james@example.com"
        ]
    }, function (err, result) {
        assert.equal(err, null);
        response.send(result);
        console.log("Inserted document into the friends collection.");
    });
});