function testAgentUrl()
{
    $.ajax
	({
		url: app.agent.url + '/Ping',
		type: "get",
        success: function (result)
        {
            M.toast({ html: '<span style="color: green;">Success!</span> Service agent is available!'});
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: '<span style="color: red;">Failed!</span> Service could not be found, or is not an ESF service agent: ' + status.responseText});
        }
    });
}
function loadAgents()
{
    $.ajax
    ({
        url: serviceUrl + 'Agents',
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (result)
        {
            console.log('Agents loaded');
            app.agents = result.hits.hits;
            app.forceRerender();
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error Loading Agents. Error: ' + status.responseText});
            console.log('Error Loading Agents. Error: ' + status.responseText);
        }
    });
}

function editAgent(agent)
{
    $.ajax
    ({
        url: serviceUrl + 'Agents/' + agent,
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (result)
        {
            console.log('Agent loaded');
            app.agent = result;
            app.tabSwitch('edit-agent');
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error Loading Agents. Error: ' + status.responseText});
            console.log('Error Loading Agents. Error: ' + status.responseText);
        }
    });
}

function deleteAgent(agent)
{
    $.ajax
    ({
        url: serviceUrl + 'Agents/' + agent,
        type: 'delete',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (result)
        {
            console.log('Agent deleted');
            loadAgents();
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error Loading Agents. Error: ' + status.responseText});
            console.log('Error Loading Agents. Error: ' + status.responseText);
        }
    });
}
function saveAgent()
{
    $.ajax
    ({
        url: serviceUrl + 'Agents' + (app.agent._id ? '/' + app.agent._id : ''),
        type: app.agent._id ? 'put' : 'post',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        data: JSON.stringify(app.agent),
        success: function (result)
        {
            M.toast({ html: 'Agent registered. Loading XSD...'});
            // read the xsd file, submit!
            storeAgentSchema(result);
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error saving Agent. Error: ' + status.responseText});
            console.log('Error saving Agent. Error: ' + status.responseText);
        }
    });
}

function storeAgentSchema(agent)
{
	let file = document.getElementById('xsdUpload').files[0];

    if(file)
    {
        let reader = new FileReader();

        reader.onload = function(re)
        {
            $.ajax
            ({
                url: serviceUrl + 'Agents/' + agent._id + '/Schema?filename=' + agent.name + '_schema',
                type: 'post',
                data: re.target.result,
                cache: false,
                contentType: 'text/xml; charset="utf-8"',
                processData: false,
                success: function ()
                {
                    M.toast({ html: 'Schema uploaded'});
                },
                error: function (status)
                {
                    // error handler
                    M.toast({ html: 'Error saving file. Error: ' + status.responseText});
                    console.log('Error saving file. Error: ' + status.responseText);
                }
            });
        };

        reader.readAsText(file);
    }
    else
    {
        M.toast({ html: 'No XSD supplied.'});
    }
}
