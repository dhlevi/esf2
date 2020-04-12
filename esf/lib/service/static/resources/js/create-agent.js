Vue.component('create-agent',
{
    props: ['agent'],
    template:   
    `
        <form id="agentEditForm" action="#" style="margin: 10px; height: calc(100vh - 114px);">
            <div class="card white" style="height: calc(100vh - 88px); overflow-y: auto; overflow-x: hidden;">
                <div style="padding-left: 10px; padding-right: 10px;">
                    <h3>Register Service Agent</h3>
                    <div class="row" style="margin-bottom: 0px;">
                        <div class="col s12 input-field">
                            <input id="agentName" type="text" class="validate active" v-model="agent.name">
                                <label for="agentName">Name</label>
                        </div>
                    </div>
                    <div class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <p>Supply a service agent URL. This is the url used by ESF internally to communicate with the agent.</p>
                        </div>
                    </div>
                    <div class="row" style="margin-bottom: 0px;">
                        <div class="col s10 input-field">
                            <input id="agentUrl" type="text" class="validate active" v-model="agent.url">
                                <label for="agentUrl">Service URL</label>
                        </div>
                        <div class="col s2">
                            <a class="waves-effect waves-light btn-small bcgov-header" onclick="testAgentUrl()" style="width: 100px;">Test</a>
                        </div>
                    </div>
                    <div class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <p>Is this service agent accesible by all government users, or by a white list only?</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col s12">
                            <p>
                                <label>
                                    <input name="usersGroup" type="radio" id="bceid" value="all" v-model="agent.usersType"/>
                                    <span>Any BCeID and IDIR user</span>
                                </label>
                            </p>
                            <p>
                                <label>
                                    <input name="usersGroup" type="radio" id="idir" value="idir" v-model="agent.usersType"/>
                                    <span>Any IDIR user</span>
                                </label>
                            </p>
                            <p>
                                <label>
                                    <input name="usersGroup" type="radio" id="whitelist" value="whitelist" v-model="agent.usersType"/>
                                    <span>Whitelisted users only</span>
                                </label>
                            </p>
                        </div>
                    </div>
                    <div v-if="agent.usersType === 'whitelist'" class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <textarea v-model="agent.users"></textarea>
                        </div>
                    </div>
                    <div class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <p>Retry on failed submission</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col s4 input-field">
                            <input id="retries" type="number" class="validate active" v-model="agent.retryAttemps">
                            <label for="retries">Retry Attempts</label>
                        </div>
                        <div class="col s4 input-field">
                            <input id="retryDelay" type="number" class="validate active" v-model="agent.retryDelay">
                            <label for="retryDelay">Delay between attempts</label>
                        </div>
                        <div class="col s4 input-field">
                            <select v-model="agent.retryUnit">
                                <option value="ms" selected>Milliseconds</option>
                                <option value="s" selected>Seconds</option>
                                <option value="m" selected>Minutes</option>
                                <option value="h" selected>Hours</option>
                                <option value="d" selected>Days</option>
                            </select>
                            <label>Unit</label>
                        </div>
                    </div>
                    <div class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <p>Supply the Service Agent Schema. This is used to validate submissions before processing, and is here for a reference. If you don't supply one, validation will be handled by the service agent itself.</p>
                        </div>
                    </div>
                    <div class="row" style="padding-bottom: 30px;">
                        <div class="col s12 input-field">
                            <div class="btn bcgov-header">
                                <span>XSD or JSON schema:</span>
                                <input type="file" id="xsdUpload" accept=".xls,.xlsx,.json,.schema">
                            </div>
                        </div>
                    </div>
                    <div v-if="agent.schemaJson && agent.schemaJson.length > 10" class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <p>Your current schema</p>
                        </div>
                    </div>
                    <div v-if="agent.schemaJson && agent.schemaJson.length > 10" class="row" style="margin-top: 20px;">
                        <div class="col s12">
                            <textarea v-model="agent.schemaJson"></textarea>
                        </div>
                    </div>
                    <div class="card-action">
                        <a class="waves-effect waves-light btn-small bcgov-header" onclick="saveAgent()" style="width: 140px;"><em style="position: absolute; top: 4px; left: 14px;" class="material-icons left">save</em>Save</a>
                    </div>
                </div>
            </div>
        </form>
    `
});