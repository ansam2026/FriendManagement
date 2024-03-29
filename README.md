1.	Friend Management API information

1.1.	API to create a friend connection between two email addresses.

URL: /Addfriend

Input JSON:
{
"friends":["john@example.com","andy@example.com"]
}


1.2.	API to retrieve the friends list for an email address. 

URL: /getfriendlist

Input JSON:
{
"email":"andy@example.com"
}


1.3.	API to retrieve the common friends list between two email addresses.
URL: /commonfriend

Input JSON:
{
  “friends”:
    [
      “andy@example.com”,
      “john@example.com”
    ]
}

1.4.	API to subscribe to updates from an email address.

URL: /subscribe

Input JSON:
{
"requestor":"lisa@example.com",
"target":"john@example.com"
}


1.5.	API to block updates from an email address.
URL: /block

Input JSON:
{
  "requestor": "andy@example.com",
  "target": "john@example.com"
}

1.6.	API to retrieve all email addresses that can receive updates from an email address. 

URL: /recipients

Input JSON:
{
"sender":"john@example.com",
"text":"Hello World!" kate@example.com"
}




2.	Database Modelling

2.1.	MongoDB setup in MongoDB Atlas

https://www.mongodb.com/cloud/atlas

2.2.	MongoDB collection: friends

2.3.	MongoDB document: 

id (email),
friends (array), 
subscribe (array), 
follower(array),
block(array).



3.	Technology Stacks:

3.1.	NodeJS with extensions (ExpressJS, Validator, mongoDB, body-parser)
3.2.	MongoDB
3.3.	Visual Studio Code
3.4.	Git Repository





