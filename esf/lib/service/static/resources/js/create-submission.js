Vue.component('create-submission',
{
    props: ['submission', 'agents'],
    template:   
    `
    <form id="submissionEditForm" action="#" style="margin: 10px; height: calc(100vh - 114px);">
        <div class="card white" style="height: calc(100vh - 88px); overflow-y: auto; overflow-x: hidden;">
            <div style="padding-left: 10px; padding-right: 10px;">
                <h3>Create Submission</h3>
                <div class="row" style="margin-bottom: 0px;">
                    <div class="col s12 input-field">
                        <select v-model="submission.agent">
                            <agent-options v-for="(agent, index) in agents"
                                           v-bind:agent="agent"
                                           v-bind:index="index"
                                           v-bind:key="index">
                            </agent-options>
                        </select>
                        <label>Service Agent</label>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col s12">
                        <p>If you want to recieve status updates by email, supply an email address below</p>
                    </div>
                </div>
                <div class="row" style="margin-bottom: 0px;">
                    <div class="col s12 input-field">
                        <input id="emailAddress" type="text" class="validate active" v-model="submission.emailAddress">
                        <label for="emailAddress">Email</label>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col s12">
                        <p>Add user reference tags. Type a word and press "enter" to create a tag.</p>
                    </div>
                </div>
                <div class="row" style="margin-bottom: 0px;">
                    <div class="col s12 input-field">
                        <div id="subTags" class="chips chips-placeholder"></div>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col s12">
                        <p>Submission XML or JSON document</p>
                    </div>
                </div>
                <div class="row" style="padding-bottom: 30px;">
                    <div class="col s12 input-field">
                        <div class="btn bcgov-header">
                            <span>XML/JSON</span>
                            <input type="file" id="docUpload" accept=".xls,.xlsx,.json,.schema">
                        </div>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col s12">
                        <p>Additional attachment documents</p>
                    </div>
                </div>
                <div class="row" style="padding-bottom: 30px;">
                    <div class="col s12 input-field">
                        <div class="btn bcgov-header">
                            <span>Attachments</span>
                            <input type="file" id="attachmentUpload" multiple="multiple">
                        </div>
                    </div>
                </div>
                <div class="card-action">
                    <a class="waves-effect waves-light btn-small bcgov-header" onclick="saveSubmission()" style="width: 194px;"><em style="position: absolute; top: 4px; left: 14px;" class="material-icons left">save</em>Save &amp; Validate</a>
                    <a id="submitSubmission" class="waves-effect waves-light btn-small bcgov-header" onclick="submitSubmission()" style="width: 194px; display: none;"><em style="position: absolute; top: 4px; left: 14px;" class="material-icons left">save</em>Submit</a>
                </div>
            </div>
        </div>
    </form>
    `
});

Vue.component('agent-options',
{
    props: ['agent', 'index'],
    template:   
    `
        <option v-bind:value="'' + agent._source.name + ''" selected>{{agent._source.name}}</option>
    `
});