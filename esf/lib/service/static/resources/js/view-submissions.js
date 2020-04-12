Vue.component('view-submissions',
{
    props: ['submissions', 'agents', 'search'],
    template:   
    `
        <div class="card white" style="margin: 10px; height: calc(100vh - 114px); overflow-y: auto; overflow-x: hidden;">
            <div style="padding-left: 10px; padding-right: 10px;">
                <h3>Submissions</h3>
                <div class="row">
                    <search-component v-bind:agents="agents"
                                      v-bind:search="search"></search-component>
                </div>
                <div class="row" style="margin-bottom: 0px;">
                    <ul id="submissionList" class="collection" style="height: 100%; overflow: auto;">
                        <submission-list v-for="(submission, index) in submissions"
                                         v-bind:submission="submission"
                                         v-bind:index="index"
                                         v-bind:key="index">
                        </submission-list>
                    </ul>
                </div>
            </div>
        </div>
    `
});

Vue.component('submission-list',
{
    props: ['submission', 'index'],
    template:   
    `
    <li class="collection-item avatar" style="min-height: 60px;">
        <i v-if="submission._source.status === 'Created'" class="material-icons circle blue">done</i>
        <i v-if="submission._source.status === 'Validated'" class="material-icons circle yellow">check_circle_outline</i>
        <i v-if="submission._source.status === 'Invalid'" class="material-icons circle red">highlight_off</i>
        <i v-if="submission._source.status === 'Queued'" class="material-icons circle yellow">highlight_off</i>
        <i v-if="submission._source.status === 'Submitted'" class="material-icons circle yellow">forward</i>
        <i v-if="submission._source.status === 'In Progress'" class="material-icons circle yellow">settings</i>
        <i v-if="submission._source.status === 'Failed'" class="material-icons circle red">sms_failed</i>
        <i v-if="submission._source.status === 'Completed'" class="material-icons circle green">sentiment_satisfied_alt</i>
        <span class="title" style="font-weight: bold;">{{submission._id}}</span>
        <p style="padding: 0px; margin: 0px; font-size: 10px;">Agent: {{submission._source.agent}} | Submitted by {{submission._source.submitter}} | Status: {{submission._source.status}}</p>
        <p><tag-list v-for="(tag, index) in submission._source.tags"
                     v-bind:tag="tag"
                     v-bind:index="index"
                     v-bind:key="index"></tag-list></p>
        <a href="#!" v-bind:onclick="'viewSubmission(\\'' + submission._id + '\\')'" class="secondary-content"><i class="material-icons black-text">search</i></a>
    </li>
    `
});

Vue.component('tag-list',
{
    props: ['tag', 'index'],
    template:   
    `
        <span class="chip">{{tag.tag}}</span>
    `
});

Vue.component('search-component',
{
    props: ['search', 'agents'],
    template:   
    `
    <div style="border: 1px solid #80808038;">
        <div class="row">
            <div class="col s12 input-field">
                <input id="keyword" type="text" class="validate active" v-model="search.query">
                <label for="keyword">Search</label>
            </div>
        </div>
        <div class="row">
            <div class="col s6 input-field">
                <input id="fromDate" type="text" class="datepicker" v-model="search.fromDate">
                <label for="fromDate">From Date</label>
            </div>
            <div class="col s6 input-field">
                <input id="toDate" type="text" class="datepicker" v-model="search.toDate">
                <label for="toDate">To Date</label>
            </div>
        </div>
        <div class="row">
            <div class="col s12">
                <a id="search" class="waves-effect waves-light btn-small bcgov-header" onclick="loadSubmissions()" style="width: 194px;"><em style="position: absolute; top: 4px; left: 14px;" class="material-icons left">search</em>Search</a>
                <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax" target="_blank">How to keyword search</a>
            </div>
        </div>
    </div>
    `
});