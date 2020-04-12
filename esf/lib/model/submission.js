const Schema = require('mongoose').Schema;

module.exports.submissionSchema = new Schema(
{
    agent: { type: String, default: 'ERR' },                       // the name of the agent (users won't know the guids)
    submitter: { type: String, default: 'ESF' },                   // submitters idir/bceid
    emailAddress: { type: String, default: 'error@default.zom' },  // address to send notifications to
    tags: [{ tag: String }],
    submissionJson: { type: String, default: '' },                 // The json representation (as a string in case it's xml, parse!)
    submissionDocument: { type: String, default: '' },             // could be a json obj instead of xml in minio?
    attachments: [{ filename: String }], // Filename in minio, for pdfs, word docs, etc.
    status: { type: String, default: 'Created' },                      // Created, Validated, Invalid, Submitted, In Progress, Failed/Completed
    messages: [{ message: String, sender: String, timestamp: { type: Date, default: Date.now }}],
    lastAttemptedSubmissionDate: { type: Date, default:null },
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
{ collection: 'submissions' });

// hateoas
module.exports.links = function(submission)
{
    let links = 
    [
        { rel: 'fetch', title: 'Fetch Agent', method: 'GET', href: '/Submissions/' + submission._id },
        { rel: 'update', title: 'Update Agent', method: 'PUT', href: '/Submissions/' + submission._id },
        { rel: 'delete', title: 'Delete Agent', method: 'DELETE', href: '/Submissions/' + submission._id },
    ];

    submission.links = links;
}