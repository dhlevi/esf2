const mongoose = require('mongoose');
const minio    = require('../../helpers/minio');
const elastic  = require('mongoosastic');
const fs = require('fs');
const rp = require('request-promise-native');
const xml = require('libxmljs');
const request     = require('request');
const constants = require('../../helpers/constants');
const agentModel = require('../../model/agent');
const agentSchema = require('../../model/agent').agentSchema;
const Agent = mongoose.model('Agent', agentSchema);

const submissionModel = require('../../model/submission');
const submissionSchema = require('../../model/submission').submissionSchema;
// link elastic search into the schema
// this will allow for auto-syncing and easy querying
let elasticOptions =
{
    //index: 'ESF' // the index in Elasticsearch to use. Defaults to the pluralization of the model name.
    //type: the type this model represents in Elasticsearch. Defaults to the model name.
    //esClient:// an existing Elasticsearch Client instance.
    //host - the host Elasticsearch is running on
    //port - the port Elasticsearch is running on
    //auth - the authentication needed to reach Elasticsearch server. In the standard format of 'username:password'
    saveOnSynchronize: true,
    protocol: 'http',
    hosts: 
    [
      'localhost:9200'
    ]
};

submissionSchema.plugin(elastic, elasticOptions);

const Submission = mongoose.model('Submission', submissionSchema);

let SubmissionController = function(app)
{
    this.app = app;
};

SubmissionController.prototype.initEndpoints = function(app)
{
    this.app.get("/Submissions", (req, res, next) => 
    {
        try
        {
            // submission search params
            // keyword, agent, mine/all users, from-to date

            let query = decodeURIComponent(req.query.query);
            let fromDate = req.query.fromDate;
            let toDate = req.query.toDate;

            // default match all
            let es_query = { match_all: {} };

            if (query && query !== '')
            {
                es_query = {
                    query_string: {
                        query : query,
                        fields  : ['_id', 'agent', 'submitter', 'emailAddress', 'tags.tag', 'status', 'createdDate']
                    }
                }
            }

            Submission.search(es_query, function(err, results) 
            {
                if (err)
                {
                    console.error(err);
                    res.writeHead(500);
                    res.end();
                }
                else
                {
                    if (results.hits.total > 0)
                    {
                        results.hits.hits.forEach(doc => 
                        {
                            submissionModel.links(doc._source);
                        });
                    }

                    res.json(results);
                }
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    this.app.get("/Submissions/:id", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            Submission.findById(id)
            .then(document =>
            {
                if (!document)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    submissionModel.links(document);
                    res.json(document);
                }
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    this.app.post("/Submissions", (req, res, next) => 
    {
        try
        {
            // create new agent
            console.log(req.body);

            let newSub = new Submission();
            newSub.agent = req.body.agent;
            newSub.submitter = req.body.submitter;
            newSub.emailAddress = req.body.emailAddress;
            newSub.tags = req.body.tags;
            newSub.status = constants.SUBMISSION_STATUS.CREATED;
            newSub.messages.push({ message: 'Submission Created', sender: 'ESF', timestamp: new Date() });
            newSub.metadata.createdBy = 'idir\\user';
            newSub.metadata.createdDate = new Date();
            newSub.metadata.history.push({ user: 'idir\\user', date: new Date(), event: 'Submission Created' });
            newSub.metadata.revision = 1;
            // validate against schema

            // create and return
            newSub.save().then(document => 
            {
                console.log('Submission saved successfully');
                submissionModel.links(document);
                res.status(201).json(document);
            })
            .catch(err =>
            {
                console.error(err);
                res.writeHead(500);
                res.end();
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    // should really be on the body, not query string
    this.app.post('/Submissions/:id/SendMessage', (req, res, next) => 
    {
        let sender = req.body.sender;
        let message = req.body.message;

        Submission.findById(req.params.id).then(submission => 
        {
            if (submission)
            {
                submission.messages.push({ message: message, sender: sender, timestamp: new Date() });
                submission.save().then(updatedSubission => 
                {
                    console.log('Message saved!');
                    res.json(updatedSubission);
                })
                .catch(err => 
                {
                    console.error(err);
                    res.writeHead(500);
                    res.end();
                });
            }
        })
        .catch(err => 
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        });
    });

    this.app.put("/Submissions/:id", async (req, res, next) => 
    {
        try
        {
            // update new agent
            let id = req.params.id;

            if (id !== 'undefined')
            {
                let existingSub = await Submission.findById(id);

                // only submit if we have a valid agent, token, and the submission revision is current.
                if (existingSub && existingSub.metadata.revision === req.body.metadata.revision)
                {
                    console.log(req.body);

                    // the only thing submissions allow you to change is the email address and maybe tags
                    // and if you're a service agent (with a valid token) the status
                    if (existingSub.emailAddress !== req.body.emailAddress)
                    {
                        existingSub.messages.push({ message: 'Updated email address from ' + existingSub.emailAddress + ' to ' + req.body.emailAddress + '', sender: 'ESF', timestamp: new Date() });
                        existingSub.emailAddress = req.body.emailAddress;
                    }

                    // if (existingSub.tags !== req.body.tags)
                    // {
                    //     existingSub.tags = req.body.tags;
                    // }

                    if(existingSub.status !== req.body.status)
                    {
                        // status changes require a token check!
                        let agent = await Agent.findOne({ name: existingSub.agent });
                        let token = req.query.token;
                        if(agent && token && this.app.validTokens[agent._id] === token)
                        {
                            existingSub.messages.push({ message: 'Updated Status from ' + existingSub.status + ' to ' + req.body.status, sender: agent.name, timestamp: new Date() });
                            existingSub.status = req.body.status;
                        }
                    }

                    // metadata
                    existingSub.metadata.revision = req.body.metadata.revision + 1;
                    existingSub.metadata.lastUpdatedBy = 'idir\\thisUser';
                    existingSub.metadata.lastUpdatedDate = new Date();
                    existingSub.metadata.history.push({ user: 'idir\\thisUser', date: new Date(), event: 'Submission Status Updated' });
        
                    existingSub.save().then(document =>
                    {
                        submissionModel.links(document);
                        res.json(document);
                    })
                    .catch(err =>
                    {
                        console.error(err);
                        res.writeHead(500);
                        res.end();
                    });
                }
                else
                {
                    res.writeHead(404);
                    res.end();
                }
            }
            else
            {
                res.writeHead(404);
                res.end();
            }
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.delete("/Submissions/:id", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            // delete submission
            Submission.findById(id)
            .then(document =>
            {
                if (!document)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    // delete documents?

                    // need to use remove for clearing from elastic
                    // otherwise change to findByIdAndDelete
                    document.remove()
                    .then(() =>
                    {
                        res.json(document);
                    }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                }
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.put("/Submissions/:id/Submit", (req, res, next) => 
    {
        try
        {
            Submission.findById(req.params.id)
            .then(document =>
            {
                if (!document)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    if (document.status !== constants.SUBMISSION_STATUS.CREATED)
                    {
                        document.status = constants.SUBMISSION_STATUS.SUBMITTED;

                        document.messages.push({ message: 'Document submitted for processing', sender: 'ESF', timestamp: new Date() });
                        document.metadata.revision = document.metadata.revision + 1;
                        document.metadata.lastUpdatedBy = 'idir\\thisUser';
                        document.metadata.lastUpdatedDate = new Date();
                        document.metadata.history.push({ user: 'idir\\thisUser', date: new Date(), event: 'Submission submitted for processing' });
                        document.lastAttemptedSubmissionDate = new Date();

                        document.save().then(submission =>
                        {
                            submissionModel.links(submission);
                            res.json(submission);
                        });
                    }
                    else
                    {
                        res.writeHead(500);
                        res.end();
                    }
                }
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.get("/Submissions/:id/Validate", async (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            Submission.findById(id)
            .then(async document =>
            {
                if (!document)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    if (document.status === constants.SUBMISSION_STATUS.CREATED ||
                        document.status === constants.SUBMISSION_STATUS.VALIDATED ||
                        document.status === constants.SUBMISSION_STATUS.INVALID ||
                        document.status === constants.SUBMISSION_STATUS.SUBMITTED)
                    {
                        // fetch the agent
                        let agent = await Agent.findOne({ name: document.agent });

                        if (agent)
                        {
                            request.get(agent.url + '/Validate?submissionId=' + id, (resp, body) => 
                            {
                                let isValid = JSON.parse(body.body).isValid;
                                document.messages.push({ message: 'Submission validation completed. Submission is ' + (isValid ? 'Valid' : 'Invalid'), sender: 'ESF', timestamp: new Date() });
                                document.metadata.history.push({ user: 'idir\\thisUser', date: new Date(), event: 'Submission validated' });
                                document.status = isValid ? constants.SUBMISSION_STATUS.VALIDATED :  constants.SUBMISSION_STATUS.INVALID;

                                document.save().then(updatedDoc => 
                                {
                                    submissionModel.links(updatedDoc);
                                    res.json(updatedDoc);
                                })
                                .catch(err =>
                                {
                                    console.error(err);
                                    res.writeHead(500);
                                    res.end();
                                });
                            })
                            .on("error", (err) => 
                            {
                                console.log("Error: " + err.message);
                            });

                        }
                        else
                        {
                            res.writeHead(500);
                            res.end();
                        }
                    }
                    else
                    {
                        res.writeHead(500);
                        res.end();
                    }
                }
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.get("/Submissions/:id/SubmissionDocument", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            // find Submission
            Submission.findById(id).then(submission =>
            {
                if(!submission)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    minio.getStats(constants.MINIO_BUCKETS.SUBMISSIONS, id, submission.submissionDocument)
                    .then(stats => 
                    {
                        minio.getDocumentUrl(constants.MINIO_BUCKETS.SUBMISSIONS, id, submission.submissionDocument)
                        .then(result => 
                        {
                            res.setHeader('Content-Length', stats.size);
                            res.setHeader('Content-Type', stats.metaData['content-type']);
                            res.setHeader('Content-Disposition', 'inline;filename="submission"');
                
                            return rp(result).pipe(res);
                        })
                        .catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                    }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                }
            }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.post("/Submissions/:id/SubmissionDocument", async (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            Submission.findById(id).then(async submission =>
            {
                if(!submission)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    // write the doc to a temp space on disk
                    var body = '';
                    req.on('data', function(data) 
                    {
                        body += data;
                    });

                    let fileName = 'submission';

                    req.on('end', async function ()
                    {
                        let extension = 'sub';
                        fileName = fileName + '.' + extension; // should always be xml... maybe support json?
                        let tempPath = './temp/' + fileName;
                        fs.writeFileSync(tempPath, body);
                        
                        submission.submissionJson = body;

                        // push document into minio
                        minio.storeDocument(constants.MINIO_BUCKETS.SUBMISSIONS, id, fileName, extension, tempPath)
                        .then(results =>
                        {
                            // delete temp doc
                            fs.unlinkSync(tempPath);
                            submission.submissionDocument = results.fullName;

                            // update submission
                            submission.metadata.history.push({ user: 'idir\\user', date: new Date(), event: 'Submission document Updated' });
                            submission.metadata.revision = submission.metadata.revision + 1;

                            submission.save().then(updatedDoc => 
                            {
                                submissionModel.links(updatedDoc);
                                res.json(updatedDoc);
                            })
                            .catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                        }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                    });
                }
            }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.post("/Submissions/:id/Attachments", async (req, res, next) => 
    {
        try
        {
            let fileName = req.query.filename ? req.query.filename : 'file.txt';
            let id = req.params.id;
            Submission.findById(id).then(async submission =>
            {
                if(!submission)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    // write the doc to a temp space on disk
                    var body = '';
                    req.on('data', function(data) 
                    {
                        body += data;
                    });

                    req.on('end', async function ()
                    {
                        let extension = fileName.split('.')[1];
                        fileName = fileName + '.' + extension;
                        let tempPath = './temp/' + fileName;
                        fs.writeFileSync(tempPath, body);

                        // push document into minio
                        minio.storeDocument(constants.MINIO_BUCKETS.SUBMISSIONS, id, fileName, extension, tempPath)
                        .then(results =>
                        {
                            // delete temp doc
                            fs.unlinkSync(tempPath);

                            // update submission
                            submission.messages.push({ message: 'Added attachment ' + results.fullName, sender: 'ESF', timestamp: new Date() });
                            submission.metadata.history.push({ user: 'idir\\user', date: new Date(), event: 'Added attachment ' + results.fullName });
                            submission.metadata.revision = submission.metadata.revision + 1;

                            submission.attachments.push({ filename: results.fullName });

                            submission.save().then(updatedDoc => 
                            {
                                submissionModel.links(updatedDoc);
                                res.json(updatedDoc);
                            })
                            .catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                        }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
                    });
                }
            }).catch(err => { console.error(err); res.writeHead(500);  res.end(); });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.get("/Submissions/:id/Attachments/:attachmentName", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            let filename = req.params.attachmentName;
            // find agent
            Submission.findById(id).then(submission =>
            {
                if (!submission)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    minio.getStats(constants.MINIO_BUCKETS.SUBMISSIONS, id, filename)
                    .then(stats => 
                    {
                        minio.getDocumentUrl(constants.MINIO_BUCKETS.SUBMISSIONS, id, filename)
                        .then(result => 
                        {
                            res.setHeader('Content-Length', stats.size);
                            res.setHeader('Content-Type', stats.metaData['content-type']);
                            res.setHeader('Content-Disposition', 'inline;filename="' + filename + '"');

                            return rp(result).pipe(res);
                        }).catch(err => { console.error(err); res.writeHead(500); res.end(); });
                    }).catch(err => {  console.error(err); res.writeHead(500); res.end(); });
                }
            }).catch(err => {  console.error(err); res.writeHead(500); res.end(); });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });
};

SubmissionController.prototype.logEndpoints = function()
{
    console.log("Submission Endpoints:");
    console.log("{GET}    /Submissions?query");
    console.log("{GET}    /Submissions/id");
    console.log("{POST}   /Submissions");
    console.log("{PUT}    /Submissions/id");
    console.log("{DELETE} /Submissions/id");
    console.log("{POST}   /Submissions/id/Submit");
    console.log("{POST}   /Submissions/id/Validate");
    console.log("{POST}   /Submissions/id/SubmissionDocument");
    console.log("{GET}    /Submissions/id/SubmissionDocument");
    console.log("{POST}   /Submissions/id/Attachments");
    console.log("{GET}    /Submissions/id/Attachments/attachmentName");
}

SubmissionController.prototype.links = function()
{
    let links = 
    [
        { rel: 'fetch', title: 'Find Submissions', method: 'GET', href: '/Submissions' },
        { rel: 'create', title: 'Create Submission', method: 'POST', href: '/Submissions' }
    ];

    return links;
}

module.exports = SubmissionController;