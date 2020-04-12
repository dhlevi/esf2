const Schema = require('mongoose').Schema;

module.exports.agentSchema = new Schema(
{
    name: { type: String, default: 'Err' },       // name of the agent
    url: { type: String, default: 'Err' },        // Servie URL (should be top level endpoint, http://apis.gov.bc.ca/int/ftasvc/)
    usersType: { type: String, default: 'all' },  // The type of users that are allowed to access the service agent (BCeID+IDIR, IDIR only, Or by a whitelist)
    userList: [{ user: String, role: String }],   // If using Whitelist, this is the list of BCeID and IDIR values that are acceptable. Roles are submitter or Reviewers
    // List of Validation Schema's, stored in minio and versioned (not used if we call service/validate though?)
    schemas: [{ guid: String, displayName: String, version: Number, activeDate: { type: Date, default: Date.now }, expiryDate: { type: Date, default: Date.now } }],
    schemaJson: { type: Object, default: {} },    // The current schema. If XSD, it's converted to a JSON schema
    retryAttemps: { type: Number, default: 5 },   // If the submission fails, it we retry X times
    retryDelay: { type: Number, default: 1 },     // The delay between allowing a retry
    retryUnit: { type: String, default: 'd' },    // The unit for the delay: ms, s, m, h, d
    metadata: 
    {
        createdBy: { type: String, default: 'ESF' },
        lastUpdatedBy: { type: String, default: 'ESF' },
        createdDate: { type: Date, default: Date.now },
        lastUpdatedDate: { type: Date, default: Date.now },
        history: [{ user: String, date: { type: Date, default: Date.now }, event: String}],
        revision: { type: Number, default: 0 }
    }
},
{ collection: 'agents' });

module.exports.links = function(agent)
{
    let links = 
    [
        { rel: 'fetch', title: 'Fetch Agent', method: 'GET', href: '/Agents/' + agent._id },
        { rel: 'update', title: 'Update Agent', method: 'PUT', href: '/Agents/' + agent._id },
        { rel: 'delete', title: 'Delete Agent', method: 'DELETE', href: '/Agents/' + agent._id },
        { rel: 'fetch', title: 'Fetch Agent Schema', method: 'GET', href: '/Agents/' + agent._id + '/Schema' },
        { rel: 'create', title: 'Replace/version Agent Schema', method: 'POST', href: '/Agents/' + agent._id + '/Schema?filename=' }
    ];

    agent.links = links;
}