const mongoose = require('mongoose');
const minio    = require('../../helpers/minio');
const elastic  = require('mongoosastic');
const fs = require('fs');
const rp = require('request-promise-native');

const constants = require('../../helpers/constants');
const agentModel = require('../../model/agent');
const agentSchema = require('../../model/agent').agentSchema;
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

agentSchema.plugin(elastic, elasticOptions);

const Agent = mongoose.model('Agent', agentSchema);

let AgentController = function(app)
{
    this.app = app;
};

AgentController.prototype.initEndpoints = function(app)
{
    this.app.get("/Agents", (req, res, next) => 
    {
        try
        {
            // fetch from ElasticSearch
            // or use mongo aggregate searches
            Agent.search(
            {
                match_all : {} // just get all service agents. We never have that many so no need for a search
            }, 
            function(err, results) 
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
                            agentModel.links(doc._source);
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

    this.app.get("/Agents/:id", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            Agent.findById(id)
            .then(document =>
            {
                if (!document)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    agentModel.links(document);
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

    this.app.post("/Agents", (req, res, next) => 
    {
        try
        {
            // create new agent
            console.log(req.body);

            let newAgent = new Agent();
            newAgent.name         = req.body.name;
            newAgent.url          = req.body.url;
            newAgent.userType     = req.body.usersType;
            newAgent.userList     = req.body.userList
            newAgent.retryAttemps = req.body.retryAttemps
            newAgent.retryDelay   = req.body.retryDelay
            newAgent.retryUnit    = req.body.retryUnit
            // meta create
            newAgent.metadata.createdBy = '';
            newAgent.metadata.createdDate = new Date();
            newAgent.metadata.history.push({ user: 'idir\\user', date: new Date(), event: 'Agent Created' });
            newAgent.metadata.revision    = 1;

            // create and return
            newAgent.save().then(document => 
            {
                console.log('Agent saved successfully');
                agentModel.links(document);
                res.status(201).json(document);
            })
            .catch(err =>
            {
                console.error(err);
                res.writeHead(500);
                es.end();
            });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });

    app.put("/Agents/:id", async (req, res, next) => 
    {
        try
        {
            // update new agent
            let id = req.params.id;
            let existingAgent = await Agent.findById(id);

            if (existingAgent && existingAgent.metadata.revision === req.body.metadata.revision)
            {
                console.log(req.body);
                existingAgent.name         = req.body.name;
                existingAgent.url          = req.body.url;
                existingAgent.userType     = req.body.usersType;
                existingAgent.userList     = req.body.userList;
                existingAgent.userList     = req.body.userList
                existingAgent.retryAttemps = req.body.retryAttemps
                existingAgent.retryDelay   = req.body.retryDelay
                existingAgent.retryUnit    = req.body.retryUnit
                // metadata
                existingAgent.metadata.revision = req.body.metadata.revision + 1;
                existingAgent.metadata.lastUpdatedBy = 'idir\\theUser';
                existingAgent.metadata.lastUpdatedDate = new Date();
                existingAgent.metadata.history.push({ user: 'idir\\user', date: new Date(), event: 'Agent Updated' });
    
                existingAgent.save().then(document =>
                {
                    agentModel.links(document);
                    res.json(document);
                });
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

    app.delete("/Agents/:id", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            // delete agent
            Agent.findById(id)
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
                    })
                    .catch(err =>
                    {
                        console.error(err);
                        res.writeHead(500);
                        res.end();
                    });
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

    app.get("/Agents/:id/Schema", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            // find agent
            Agent.findById(id).then(agent =>
            {
                if (!agent)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    let currentSchema = agent.schemas[agent.schemas.length - 1];
                    // get the xsd document from minio
                    minio.getStats(constants.MINIO_BUCKETS.AGENTS, id, currentSchema.guid)
                    .then(stats => 
                    {
                        minio.getDocumentUrl(constants.MINIO_BUCKETS.AGENTS, id, currentSchema.guid)
                        .then(result => 
                        {
                            res.setHeader('Content-Length', stats.size);
                            res.setHeader('Content-Type', stats.metaData['content-type']);
                            res.setHeader('Content-Disposition', 'inline;filename="' + currentSchema.displayName + '"');

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

    app.post("/Agents/:id/Schema/", (req, res, next) => 
    {
        try
        {
            let id = req.params.id;
            let fileName = req.query.filename ? req.query.filename : 'file.txt';
            // find agent
            Agent.findById(id).then(agent =>
            {
                if (!agent)
                {
                    res.writeHead(404);
                    res.end();
                }
                else
                {
                    // write the doc to a temp space on disk
                    var body = '';
                    console.log(req.body);
                    req.on('data', function(data) 
                    {
                        body += data;
                    });

                    req.on('end', function ()
                    {
                        let extension = 'schema'; // Do we accept zips of multiple xsd's?
                        fileName = fileName + '.' + extension;
                        let tempPath = './temp/' + fileName;
                        fs.writeFileSync(tempPath, body);

                        agent.schemaJson = body;

                        // push document into minio
                        minio.storeDocument(constants.MINIO_BUCKETS.AGENTS, id, fileName, extension, tempPath)
                        .then(results =>
                        {
                            // delete temp doc
                            fs.unlinkSync(tempPath);
                            // expire any active schema's
                            agent.schemas.forEach(schema => 
                            {
                                if (schema.expiryDate > new Date())
                                {
                                    schema.expiryDate = new Date();
                                }
                            });
                            // add the new schema
                            agent.schemas.push({ guid: results.fullName, displayName: fileName, version: agent.schemas.length + 1, activeDate: new Date(), expiryDate: new Date(9999, 12, 31)});
                            // update agent
                            agent.metadata.history.push({ user: 'idir\\user', date: new Date(), event: 'Agent xsd uploaded' });
                            agent.metadata.revision = agent.metadata.revision + 1;

                            agent.save().then(updatedDoc => 
                            {
                                agentModel.links(updatedDoc);
                                res.json(updatedDoc);
                            }).catch(err => { console.error(err); res.writeHead(500); res.end(); });
                        }).catch(err => { console.error(err); res.writeHead(500); res.end(); });
                    });
                }
            }).catch(err => { console.error(err); res.writeHead(500); res.end(); });
        }
        catch(err)
        {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });
};

AgentController.prototype.logEndpoints = function()
{
    console.log("Agent Endpoints:");
    console.log("{GET}    /Agents");
    console.log("{GET}    /Agents/id");
    console.log("{POST}   /Agents");
    console.log("{PUT}    /Agents/id");
    console.log("{DELETE} /Agents/id");
    console.log("{GET}    /Agents/id/Schema");
    console.log("{POST}   /Agents/id/Schema");
}

AgentController.prototype.links = function()
{
    let links = 
    [
        { rel: 'fetch', title: 'Find Agents', method: 'GET', href: '/Agents' },
        { rel: 'create', title: 'Create Agent', method: 'POST', href: '/Agents' }
    ];

    return links;
}

module.exports = AgentController;