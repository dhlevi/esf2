let url = '';
let realm = '';
let enabled = true;

exports.init = function (url, realm, enabled) 
{
    this.url = url;
    this.realm = realm;
    this.enabled = enabled;
}