 //Object data modelling library for mongo
const mongoose = require('mongoose');

//Mongo db client library
//const MongoClient  = require('mongodb');

//Express web service library
const express = require('express')

//used to parse the server response from json to object.
const bodyParser = require('body-parser');

//instance of express and port to use for inbound connections.
const app = express()
const port = 3000

//import the request library
var request = require('request');

//This is the URL endopint of your vm running docker
var url = 'http://192.168.56.109:2375';

//Get the hostname of the node
var os = require("os");
var myHostname = os.hostname();
var leaderCheck = false;
var autoScaled = false;
var nodes = [];

//print the hostname
console.log("------------ HOSTNAME [%s] ------------",myHostname);

var myNodeID = Math.floor(Math.random() * (100 - 1 + 1) + 1);

var systemLeader = 0;

//connection string listing the mongo servers. This is an alternative to using a load balancer. THIS SHOULD BE DISCUSSED IN YOUR ASSIGNMENT.
const connectionString = 'mongodb://localmongo1:27017,localmongo2:27017,localmongo3:27017/NotFLIX?replicaSet=rs0';

setInterval(function() {

	console.log(`Intervals are used to fire a function for the lifetime of an application.`);

}, 3000);

//tell express to use the body parser. Note - This function was built into express but then moved to a seperate package.
app.use(bodyParser.json());

//connect to the cluster
mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true});


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;

var logsSchema = new Schema({
	_id : Number,
	accountID: Number,
	username: String,
	titleID: Number,
	userAction: String,
	dateAndTime: Date,
	pointOfInteraction: String,
	typeOfInteraction: String
});

var logsModel = mongoose.model('Logs', logsSchema, 'logs');

//SUBSCRIBER CODE
var amqp = require('amqplib/callback_api');

amqp.connect('amqp://user:bitnami@192.168.56.109', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
		if (error1) {
			throw error1;
		}
		
		var exchange = 'logs';
		channel.assertExchange(exchange, 'fanout', {
			durable: false
		});
	
		channel.assertQueue('', {exclusive: true}, function(error2, q) {
			if (error2) {
				throw error2;
			}
			console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
			channel.bindQueue(q.queue, exchange, '');
		
			channel.consume(q.queue, function(msg) {
				if(msg.content) {
					let hostname = JSON.parse(msg.content.toString()).hostname
					let nodeID = JSON.parse(msg.content.toString()).nodeID
          let status = JSON.parse(msg.content.toString()).status;                   
					let datetime = JSON.parse(msg.content.toString()).datetime;
                             
					nodes.some(node => node.hostname === hostname) ? (nodes.find(e => e.hostname === hostname)).datetime = datetime : 
            nodes.push({"nodeID": nodeID,"hostname": hostname, "status": status, "datetime": datetime});
            
          nodes.forEach((node, index) => console.log(node));
           
				}
			}, { noAck: true });
		});
	});
});


//PUBLISHER CODE
amqp.connect('amqp://user:bitnami@192.168.56.109', function(error0, connection) {
    if (error0) {
		throw error0;
    }
    connection.createChannel(function(error1, channel) {});
});

setInterval(function() {
	amqp.connect('amqp://user:bitnami@192.168.56.109', function(error0, connection) {
	
		if (error0) {
			throw error0;
		}
		connection.createChannel(function(error1, channel) {
			if (error1) {
				throw error1;
			}
			else {
				leaderCheck = true;
			}
			var exchange = 'logs';
		
			channel.assertExchange(exchange, 'fanout', {durable: false});
      
      toSend = {"hostname" : myHostname, "status": "alive","nodeID" : myNodeID, "datetime" : Date.now()} ;
			channel.publish(exchange, '', Buffer.from(JSON.stringify(toSend)));
			console.log(" [SENT] %s", JSON.stringify(toSend));
 
		});
		
		setTimeout(function() {
			connection.close();
		}, 500);
	});
}, 2000);

setInterval(function() {
  console.log("============= LEADER CHECK [1] =============");
	console.log(JSON.stringify(nodes));
	leader = 1;
	activeNodes = 0;
	Object.entries(nodes).forEach(([hostname,prop]) => {
	  //console.log("test: " + JSON.stringify(hostname) + JSON.stringify(prop) )
	  maxNodeID = myNodeID;
	  if(hostname != myHostname){
	    if("nodeID" in prop){
			  activeNodes++;
        //console.log("ACTIVE NODES: " + activeNodes + "LENGTH: " + nodes.length);
   		  if(prop.nodeID > myNodeID){
			    leader = 0;
			  }
	    }
	  }
		if((leader == 1) && (activeNodes == nodes.length)){
		  systemLeader = 1;
		  console.log(myHostname + ": I am the leader now! NODE: " + myNodeID);
      let time = Date.now();
      nodes.forEach((node, index) => {
        let diff = time - node.datetime;
        console.log(node.hostname + "] nodeTIME: " + node.datetime + " currentTIME: " + time + " diff: " + diff);
        if(diff >= 10000 && node.hostname != myHostname){ 
         
          var create = {
            uri: url + "/v1.40/containers/create",
	          method: 'POST',
            json: {"image": "notflix_" + node.hostname, "hostname" : + node.hostname, "name" : "notflix_" + node.hostname + "_"}
          };

         
          console.log("ERROR: " + node.hostname + " unresponsive.");
          console.log("Restarting " + node.hostname);
          
          
          
          //send the create request
request(create, function (error, response, createBody) {
    if (!error) {
	    console.log("Created container " + JSON.stringify(createBody));
     
        //post object for the container start request
        var start = {
            uri: url + "/v1.40/containers/" + createBody.Id + "/start",
	      	method: 'POST',
	        json: {}
	    };
		
	    //send the start request
        request(start, function (error, response, startBody) {
	        if (!error) {
		        console.log("Container start completed");
	    
                //post object for  wait 
                var wait = {
			        uri: url + "/v1.40/containers/" + createBody.Id + "/wait",
                    method: 'POST',
		            json: {}
		        };
		   
                
			    request(wait, function (error, response, waitBody ) {
			        if (!error) {
				        console.log("run wait complete, container will have started");
			            
                        //send a simple get request for stdout from the container
                        request.get({
                            url: url + "/v1.40/containers/" + createBody.Id + "/logs?stdout=1",
                            }, (err, res, data) => {
                                    if (err) {
                                        console.log('Error:', err);
                                    } else if (res.statusCode !== 200) {
                                        console.log('Status:', res.statusCode);
                                    } else{
                                        //we need to parse the json response to access
                                        console.log("Container stdout = " + data);
                                        containerQty();
                                    }
                                });
                        }
		        });
            }
        });

    }   
});






          
          
        }
      })
    }
  });
}, 5000);

setInterval(function() {
  var hour = new Date().getHours();
  
  if(hour >= 16 && hour < 18 and !autoScaled){
    autoScaled = true;
    console.log("Autoscaling containers to deal with increased load during peak times...");
    var create = {
            uri: url + "/v1.40/containers/create",
	          method: 'POST',
            json: {"image": "notflix_node1", "hostname : node4", "name" : "notflix_node4_"}
          };
                  
          //send the create request
request(create, function (error, response, createBody) {
    if (!error) {
	    console.log("Created container " + JSON.stringify(createBody));
     
        //post object for the container start request
        var start = {
            uri: url + "/v1.40/containers/" + createBody.Id + "/start",
	      	method: 'POST',
	        json: {}
	    };
		
	    //send the start request
        request(start, function (error, response, startBody) {
	        if (!error) {
		        console.log("Container start completed");
	    
                //post object for  wait 
                var wait = {
			        uri: url + "/v1.40/containers/" + createBody.Id + "/wait",
                    method: 'POST',
		            json: {}
		        };
		   
                
			    request(wait, function (error, response, waitBody ) {
			        if (!error) {
				        console.log("run wait complete, container will have started");
			            
                        //send a simple get request for stdout from the container
                        request.get({
                            url: url + "/v1.40/containers/" + createBody.Id + "/logs?stdout=1",
                            }, (err, res, data) => {
                                    if (err) {
                                        console.log('Error:', err);
                                    } else if (res.statusCode !== 200) {
                                        console.log('Status:', res.statusCode);
                                    } else{
                                        //we need to parse the json response to access
                                        console.log("Container stdout = " + data);
                                        containerQty();
                                    }
                                });
                        }
		        });
            }
        });

    }   
});
    
}

}, 1000);


app.get('/', (req, res) => {
     logsModel.find({},'_id accountID username titleID userAction dateAndTime pointOfInteraction typeOfInteraction', (err, logs) => {
        if(err) return handleError(err);
    res.send(JSON.stringify(logs))
  })
})

app.post('/',  (req, res) => {
  var new_logs_instance = new SomeModel(req.body);
  new_logs_instance.save(function (err) {
  if (err) res.send('Error');
    res.send(JSON.stringify(req.body))
  });
})

app.put('/',  (req, res) => {
  res.send('Got a PUT request at /')
})

app.delete('/',  (req, res) => {
  res.send('Got a DELETE request at /')
})

//bind the express web service to the port specified
app.listen(port, () => {
 console.log(`Express Application listening at port ` + port)
})

