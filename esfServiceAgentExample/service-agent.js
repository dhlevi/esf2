const express     = require("express");
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const bodyParser  = require('body-parser');
const request     = require('request');
const rp          = require('request-promise-native');

const Queue       = require('./queue');

// Start express
let app = express();
// Express logging, security, etc.
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// set body parse size
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

// initialize queue
let queue = new Queue();

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

let agentId;
let agentName;
let validToken = '';
let esfUrl = 'http://localhost:8080'; // derived from the req on ESFPackage
exports.launch = function (port) 
{
    console.log('Starting ESF example service agent');

    // required interface endpoints
    // Ping exists just to have a simple responsive endpoint
    // that can be used to verify the service is alive
    app.get("/Ping", (req, res, next) => 
    {
        res.json(['Pong']);
    });

    // Essential endpoint. ESF will call this every 25 seconds
    // and update your service agents valid token. Use this to
    // also determine the ESF URL so you do not need to manually
    // configure it.
    //
    // The ESF token is REQUIRED to make any PUT requests to the
    // esf submission endpoint. You cannot update without a token.
    // the token will change every 25 seconds, so be sure to keep
    // track of it as done here.
    app.post("/ESFPackage", (req, res, next) => 
    {
        validToken = req.query.token;
        agentId = req.query.agentId;
        agentName = req.query.agentName;
        // esfUrl = req.protocol + '://' + req.get('host');

        res.json(['Token Accepted']);
    });

    // Endpoint called with the submission ID, used to allow
    // the service agent to validate a submission body before
    // processing. Response must be:
    //
    // { isValid: boolean, message: '<Whatever validations message you want to send to the user>' }
    app.get("/Validate", (req, res, next) => 
    {
        let submissionId = req.query.submissionId;

        // call ESF {get}/Submissions/{id}/SubmissionDocument
        // once you have the document, validate it however you like (xsd, json schema, whatever works for you)
        // do NOT update the submission with a status. ESF will handle it.

        request.get(esfUrl + '/Submissions/' + submissionId + '/SubmissionDocument?token' + validToken, (err, resp, body) => 
        {
            if (!err)
            {

                let isValid = true;

                // obviously, your real validation check should do something...
                // using the libxmljs library for xml/xsd validation:
                // let xsdDoc = xml.parseXmlString(mySchemaString);
                // let xmlDoc = xml.parseXmlString(submission.submissionJson);
                // let isValid = xsdDoc.validate(xmlDoc);

                res.json({isValid: isValid, message: 'Your submission is ' + (isValid ? '' : 'not ') + 'valid!'});
            }
            else
            {
                console.log("Error: " + err.message);
                res.writeHead(500);
                res.end();
            };
        })
        .on("error", (err) => 
        {
            console.log("Error: " + err.message);
            res.writeHead(500);
            res.end();
        });
    });

    // Similar function to Ping, however will also return a
    // package of data informing ESF of the service agent status.
    // You are welcome to add anything to the message, but ESF
    // will expect a response that looks like this:
    app.get("/Status", (req, res, next) => 
    {
        res.json(['Pong']);
    });

    app.listen(port, () => 
    {
        console.log("Server running on port " + port);
    });

    // submission queue listener
    // This process will check for any new subissions
    // and queue them accordingly
    setInterval(() => 
    {
        if(esfUrl)
        {
            let queryString = encodeURIComponent('agent:' + agentName + ' AND status:Submitted');
            request.get(esfUrl + '/Submissions?query=' + queryString, (err, res, body) => 
            {
                let results = JSON.parse(body);
                if (results.hits.total > 0)
                {
                    results.hits.hits.forEach(submission => 
                    {
                        // add to blocking queue
                        // process, set to Queued, In Progress, then Completed/Failed
                        // Queued indicates that the submission is accepted by the agent
                        // In progress means you're working on it
                        // Failed/Completed indicates that we're done
                        // !!! Remember when you call 'put' to update a submission
                        // !!! the revision will change. Further puts with the same
                        // !!! object will return an error/404. Put returns the new object, fyi
                        // !!! this also includes sending messages!!!

                        submission._source.status = 'Queued';
                        rp(
                        {
                            method: 'PUT',
                            uri: esfUrl + '/Submissions/' + submission._id + '?token=' + validToken,
                            body: submission._source, 
                            json: true
                        }).then((res) =>
                        {
                            // add to the queue to await processing
                            // don't queue the subimssion._source, queue the updated copy
                            queue.enqueue(res);
                        });
                    });
                }
            })
            .on("error", (err) => 
            {
                console.log("Error: " + err.message);
            })
        }
    }, 60000);

    // Check the queue every X seconds, process anything waiting
    setInterval(async () => 
    {
        if (!queue.isEmpty())
        {
            // get the next queued item
            let submission = queue.dequeue();

            // set submision to "In Progress". Remember to get the result so we have the correct revision count
            submission.status = 'In Progress';
            rp(
            {
                method: 'PUT',
                uri: esfUrl + '/Submissions/' + submission._id + '?token=' + validToken,
                body: submission, 
                json: true // Automatically stringifies the body to JSON
            }).then(async (res) =>
            {
                let finalizedSubmission = await processSubmission(res);

                // We're done processing this submission, so inform the user
                // of the result

                request.put(esfUrl + '/Submissions/' + submission._id + '?token=' + validToken, { json: finalizedSubmission },
                (err, res, body) =>
                {
                    if (err) 
                    {
                        console.log(err);
                    }
                });
            }).catch(err =>
            {
                // requeue if we get a 404 due to the token being invalid.
                // A real implementation here should be much more robust!
                submission.status = 'Queued';
                queue.enqueue(submission);
            });
        }
    }, 10000);
}

async function processSubmission(submission)
{
    // do something useful...
    // You can send messages to the submission at any time during processing. It's a great
    // way to keep the user informed of whats going on, and a useful debugging utility
    // but remember this will change the revision...;
    // also note, request-promise-native has been deprecated as of a few weeks ago
    await rp(
    {
        method: 'POST',
        uri: esfUrl + '/Submissions/' + submission._id + '/SendMessage',
        body: { sender: agentName, message: "Doing some useful work!" }, 
        json: true
    });

    submission.status = 'Completed';
    
    return submission;
}