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

//Get the hostname of the node
var os = require("os");
var myHostname = os.hostname();
var amqp = require('amqplib/callback_api');

//print the hostname
console.log("------------ HOSTNAME [%s] ------------",myHostname);

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
amqp.connect('amqp://test:test@172.16.70.30', function(error0, connection) {
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

              channel.assertQueue('', {
                        exclusive: true
                      }, function(error2, q) {
                                if (error2) {
                                            throw error2;
                                          }
                                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
                                channel.bindQueue(q.queue, exchange, '');

                                channel.consume(q.queue, function(msg) {
                                            if(msg.content) {
                                                            console.log(" [x] %s", msg.content.toString());
                                                          }
                                          }, {
                                                      noAck: true
                                                    });
                              });
            });
});


//PUBLISHER CODE
amqp.connect('amqp://test:test@192.168.56.109', function(error0, connection) {
      if (error0) {
              throw error0;
            }
      connection.createChannel(function(error1, channel) {});
});

amqp.connect('amqp://test:test@172.16.70.30', function(error0, connection) {

if (error0) {
        throw error0;
      }
      connection.createChannel(function(error1, channel) {
              if (error1) {
                        throw error1;
                      }
              var exchange = 'logs';
              var msg =  'Hello World!';

              channel.assertExchange(exchange, 'fanout', {
                        durable: false
                      });
              channel.publish(exchange, '', Buffer.from(msg));
              console.log(" [x] Sent %s", msg);
            });





    setTimeout(function() {
              connection.close();
              }, 500);
});


setInterval(function() {
  console.log("============= LEADER CHECK [1] =============");
	console.log(JSON.stringify(nodes));
	leader = 1;
	activeNodes = 0;
	Object.entries(nodes).forEach(([hostname,prop]) => {
	  console.log("test: " + JSON.stringify(hostname) + JSON.stringify(prop) )
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
      myLeaderNode = myNodeID;
      //nodes.find(e => e.nodeID === myNodeID).leaderNode = myNodeID;
		}
  });
}, 2000);


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

