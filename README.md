# NotFLIX

Features:

- 3 containers running a distributed node.js application for high availability
	- Automatically compensates for failed containers

- 3 containers running mongoDB for high availability

- 3 containers used for RabbitMQ messaging to establish a leader

--------------------------------------------------------------------

NOTE: Change IP address in mongo.js file to match your host machine

//Build the solution
sudo docker-compose build

//Start the containers
sudo docker-compose up

//List running containers to find container ID
sudo docker container ls

//Kill a container when the system is running
//Docker API will be used to automatically recreate the container
//sudo docker kill container [container ID]

------------------------------------------------------------------

API usage

// Get data from the database
GET http://192.168.56.109

##

//Post data to the database
POST http://192.168.56.108:80 HTTP/1.1 
content-type: application/json 

  { "_id": 3, "accountID": 1, "userName": "B.stone", "titleID": 2 , "userAction":  "PlayPauseButtonPress",  "dateAndTime": "2022-04-18T18:34:00Z", "pointOfInteraction" : "1:24:56", "typeOfInteraction" : "Pause" }

  
###








