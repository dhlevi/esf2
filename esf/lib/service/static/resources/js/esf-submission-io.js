
function saveSubmission()
{
    let elems = document.querySelectorAll('.chips');
    let instance = M.Chips.getInstance(elems[0]);
    
    app.submission.tags = instance.chipsData;

    $.ajax
    ({
        url: serviceUrl + 'Submissions' + (app.submission._id ? '/' + app.submission._id : ''),
        type: app.submission._id ? 'put' : 'post',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        data: JSON.stringify(app.submission),
        success: function (result)
        {
            M.toast({ html: 'Submission registered. Uploading XML document...'});
            // read the xsd file, submit!
            storeSubmissionXML(result);
            storeSubmissionAttachments(result);
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error saving Agent. Error: ' + status.responseText});
            console.log('Error saving Agent. Error: ' + status.responseText);
        }
    });
}

function storeSubmissionAttachments(submission)
{
    let files = document.getElementById('attachmentUpload').files;
    for(let fileIdx in files)
    {
        let file = files[fileIdx];

        if(file && file.name)
        {
            let formData = new FormData();
            formData.append('file', file);

            $.ajax
            ({
                url: serviceUrl + 'Submissions/' + submission._id + '/Attachments?filename=' + file.name,
                type: 'post',
                data: formData,
                cache: false,
                contentType: file.type,
                processData: false,
                success: function ()
                {
                    M.toast({ html: 'File uploaded!'});
                },
                error: function (status)
                {
                    // error handler
                    M.toast({ html: 'Error saving file. Error: ' + status.responseText});
                    console.log('Error saving file. Error: ' + status.responseText);
                }
            });
        }
    }
}

function storeSubmissionXML(submission)
{
    let file = document.getElementById('docUpload').files[0];

    if(file)
    {
        let reader = new FileReader();

        reader.onload = function(re)
        {
            $.ajax
            ({
                url: serviceUrl + 'Submissions/' + submission._id + '/SubmissionDocument',
                type: 'post',
                data: re.target.result,
                cache: false,
                contentType: 'text/xml; charset="utf-8"',
                processData: false,
                success: function ()
                {
                    M.toast({ html: 'xml uploaded, Validating...'});
                    validateSubmission(submission);
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
        M.toast({ html: 'No XML supplied.'});
    }
}

function validateSubmission(submission)
{
    $.ajax
    ({
        url: serviceUrl + 'Submissions/' + submission._id + '/Validate',
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function ()
        {
            M.toast({ html: 'Submission is valid!'});
            $('#submitSubmission').show();
            app.submission = submission;
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Submission is invalid: ' + status.responseText});
            $('#submitSubmission').hide();
        }
    });
}

function submitSubmission()
{
    $.ajax
    ({
        url: serviceUrl + 'Submissions/' + app.submission._id + '/Submit',
        type: 'put',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function ()
        {
            M.toast({ html: 'Successfully Submitted for Processing!'});
            $('#submitSubmission').hide();
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Submission could not be posted at this time: ' + status.responseText});
            $('#submitSubmission').show();
        }
    });
}

function loadSubmissions()
{
    $.ajax
    ({
        url: serviceUrl + 'Submissions?query=' + encodeURIComponent(app.search.query) + '&from=' + app.search.fromDate + '&to=' + + app.search.toDate,
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (result)
        {
            console.log('Submissions loaded');
            app.submissions = result.hits.hits;
            app.forceRerender();
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error Loading Submissions. Error: ' + status.responseText});
            console.log('Error Loading Submissions. Error: ' + status.responseText);
        }
    });
}

function viewSubmission(submissionId)
{
    $.ajax
    ({
        url: serviceUrl + 'Submissions/' + submissionId,
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (result)
        {
            console.log('Submission loaded');
            app.submission = result;
            app.tabSwitch('view-submission');
        },
        error: function (status)
        {
            // error handler
            M.toast({ html: 'Error Loading Submission. Error: ' + status.responseText});
            console.log('Error Loading Submission. Error: ' + status.responseText);
        }
    });
}

function viewSubmisionOnMap()
{

}
