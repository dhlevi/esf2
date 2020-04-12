let serviceUrl = "../";

let app = new Vue(
{
    el: '#content',
    data: 
    {
        search: {
            query: '',
            fromDate: '',
            toDate: ''
        },
        agents: [],
        submissions: [],
        agent: {},
        submission: {},
        lastTab: 'init',
        currentTab: 'init',
        tabs: ['init', 'create-agent', 'view-agents', 'create-submission', 'view-submissions', 'view-submission'],
        componentKey: 0,
        self: this
    },
    methods: 
    {
        tabSwitch: function (tab) 
        {
            if (tab === 'view-agents' || tab === 'create-submission')
            {
                // load agents from db
                loadAgents();
                this.submission = {};
            }
            else if (tab === 'view-submissions')
            {
                // load agents from db
                loadSubmissions();
                loadAgents();
            }
            else if(tab === 'create-agent')
            {
                this.agent = {};
            }
            else if(tab === 'edit-agent') // we have no edit component. It's really create without clearing the agent
            {
                tab = 'create-agent';
            }
            // handle the tab swap
            this.lastTab = this.currentTab;
            this.currentTab = tab;
            // show and hide content as needed
            $('#contentPanel').show();
            $('#titlePanel').hide();
        },
        forceRerender() 
        {
            // If a data component does not change, Vue won't trigger a render
            // if you need a force re-render of a page, but don't need to or
            // want to change data, increment the componentKey
            this.componentKey += 1;  
        },
        saveAgent: function(event)
        {
            saveAgent();
        }
    },
    computed: 
    {
        currentTabComponent: function () 
        {   
            this.componentKey += 1;
            return this.currentTab.toLowerCase();
        }
    },
    updated: function () 
    {
        this.$nextTick(function () 
        {
            $('select').formSelect();
            M.AutoInit(); 
            M.updateTextFields();
            $('.chips-placeholder').chips({
                placeholder: 'Enter a tag.',
                secondaryPlaceholder: '+Tag',
            });
            if (this.submission.hasOwnProperty('tags'))
            {
                $('.chips').chips({
                    data: this.submission.tags
                });
            }
            
        })
    }
});

$(document).ready(function()
{
    //loadAgents();
    // material init
    $('.materialboxed').materialbox();
    $('.parallax').parallax();
    $('.sidenav').sidenav();
    
    M.AutoInit();

    setTimeout(statusCheck, 5000);
});

function statusCheck()
{
    $.ajax
	({
		url: serviceUrl + 'Ping',
		type: "get",
		success: function (result)
		{
            setTimeout(statusCheck, 5000);
		},
		error: function (status)
		{
            $('#slide-out').empty();
            $('#contentPanel').empty();
            $('#titlePanel').empty();
            $('#titlePanel').append('<p class="label" style="background: #c50d0d; border-top: 2px solid black; border-left: 2px solid black; border-right: 2px solid black;"> ESF service has disconnected</p><p class="label" style="background: #c50d0d; border-left: 2px solid black; border-right: 2px solid black;"> Please contact the application administractor or ***@gov.bc.ca</p><p class="label" style="background: #c50d0d; border-bottom: 2px solid black; border-left: 2px solid black; border-right: 2px solid black;"> enter "smk ui [port]" in your command line</p>');
            $('#titlePanel').show();
            
			M.toast({ html: 'Service unavailable.'});
		}
    });
}