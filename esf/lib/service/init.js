const express     = require("express");
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const mongoose    = require('mongoose');
const bodyParser  = require('body-parser');
const elastic     = require('mongoosastic');
const request     = require('request');
const agentSchema = require('../model/agent').agentSchema;
const utils       = require('../helpers/utils');
// link elastic search into the schema
// this will allow for auto-syncing and easy querying
let elasticOptions =
{
    saveOnSynchronize: true,
    protocol: 'http',
    hosts: 
    [
      'localhost:9200'
    ]
};

agentSchema.plugin(elastic, elasticOptions);

const Agent = mongoose.model('Agent', agentSchema);
const AgentController      = require('./controllers/agent-controller');
const SubmissionController = require('./controllers/submission-controller');
// Start express
let app = express();
// Express logging, security, etc.
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// set body parse size
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

// configuration for cors
// Enable CORS
app.use(function (req, res, next) 
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization,responseType');
    res.setHeader('Access-Control-Expose-Headers', 'x-total-count,x-pending-comment-count,x-next-comment-id');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Cache-Control', 'max-age=4');
    next();
});
// Keycloack, OAuth, Siteminder etc should go here

// mongodb connect (move configs int process.env)

let dbOptions = 
{
    useUnifiedTopology: true,
    useNewUrlParser: true,
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500,           // Reconnect every 500ms
    poolSize: 10,                     // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    connectTimeoutMS: 10000,          // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000,           // Close sockets after 45 seconds of inactivity
    user: '',
    pass: ''
};

mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost/esf', dbOptions);

// controllers
let agentController = new AgentController(app);
let submissionController = new SubmissionController(app);

let server;
// create a holder for valid tokens on the app
app.validTokens = {};
exports.launch = function (port) 
{
    // handle static files for the UI components
    console.log('Setting static path to ' + __dirname + '/static');
    app.use(express.static(__dirname + '/static/'));

    agentController.initEndpoints(app);
    submissionController.initEndpoints(app);

    // Create service endpoints
    app.get("/", (req, res, next) => 
    {
        res.json(
        {
            message: "Welcome to the ESF v2 rest service",
            links: 
            [
                { rel: 'self', title: 'API Top Level', method: 'GET', href: '/' },
                { rel: 'self', title: 'API Ping', method: 'GET', href: '/Ping' },
            ],
            agentLinks: agentController.links,
            submissionLinks: submissionController.links
        });
    });

    app.get("/Ping", (req, res, next) => 
    {
        //console.log('Pong');
        res.json(['Pong']);
    });

    server = app.listen(port, () => 
    {
        console.log("Server running on port " + port);
        console.log("-----------------------------------------------------");
        console.log("UI available: /index.html");
        console.log("-----------------------------------------------------");
        console.log("Endpoints available:");
        console.log("{GET}  /");
        console.log("{GET}  /Ping");
        agentController.logEndpoints();
        submissionController.logEndpoints();
        console.log("-----------------------------------------------------");
    });

    // set repeating task for api tokens
      
    setInterval(() => 
    {
        // loop all agents
        Agent.search(
        {
            match_all : {}
        }, 
        function(err, results) 
        {
            if (err)
            {
                console.log('Failed to fetch!');
                console.log(err);
            }
            else
            {
                if (results.hits.total > 0)
                {
                    results.hits.hits.forEach(agent =>
                    {
                        let token = utils.uuid();

                        request.post(agent._source.url + '/ESFPackage?token=' + token + '&agentName=' + agent._source.name + '&agentId=' + agent._id, (err, res, body) => 
                        {
                            app.validTokens[agent._id] = token;
                        })
                        .on("error", (err) => 
                        {
                            console.log("Error: " + err.message);
                        });
                    });
                }
            }
        });
        // wait
    }, 25000);
}
