const mongo = require('mongodb');
const mongoose = require('mongoose');
const elastic = require('mongoosastic');

// models
const Agent = require('../model/agent');

let MongoDB = function()
{
    mongoose.connect('mongodb://localhost/esf', {useNewUrlParser: true});
};

MongoDB.prototype.Agent = function()
{
    return new Agent();
}

