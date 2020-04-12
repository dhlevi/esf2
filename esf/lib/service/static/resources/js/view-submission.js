Vue.component('view-submission',
{
    props: ['submission'],
    template:   
    `
        <div class="card white" style="margin: 10px; height: calc(100vh - 114px); overflow-y: auto; overflow-x: hidden;">
            <div style="padding-left: 10px; padding-right: 10px;">
                <h4>Submission {{submission._id}}</h4>
                
                <p style="padding: 0px; margin: 0px; font-size: 14px;">Agent: <span style="font-weight: bold;">{{submission.agent}}</span></p>
                <p style="padding: 0px; margin: 0px; font-size: 14px;">Submitted by: <span style="font-weight: bold;">{{submission.submitter}}</span></p>
                <p style="padding: 0px; margin: 0px; font-size: 14px;">Status: <span style="font-weight: bold;">{{submission.status}}</span></p>
                <p><tag-list v-for="(tag, index) in submission.tags"
                            v-bind:tag="tag"
                            v-bind:index="index"
                            v-bind:key="index"></tag-list></p>
                <ul id="messageList" class="collection" style="height: 100%; overflow: auto;">
                    <view-messages v-for="(message, index) in submission.messages"
                                     v-bind:message="message"
                                     v-bind:index="index"
                                     v-bind:key="index">
                    </view-messages>
                </ul>

                <div v-if="submission.submissionJson && submission.submissionJson !== ''" class="input-field col s12">
                    <textarea readonly style="height: 350px;" id="submissionData">{{submission.submissionJson}}</textarea>
                    <label for="submissionData">Submission Data:</label>
                </div>

            </div>
            <div class="card-action">
                <a id="submitSubmission" class="waves-effect waves-light btn-small bcgov-header" onclick="app.tabSwitch('view-submissions')" style="width: 194px;">close</a>
                <a id="submitSubmission" class="waves-effect waves-light btn-small bcgov-header" onclick="submitSubmission()" style="width: 194px;"><em style="position: absolute; top: 4px; left: 14px;" class="material-icons left">send</em>Re-Submit</a>
                <a id="submitSubmission" class="waves-effect waves-light btn-small bcgov-header" onclick="viewSubmisionOnMap()" style="width: 194px;"><em style="position: absolute; top: 4px; left: 14px;" class="material-icons left">map</em>View on Map</a>
            </div>
        </div>
    `
});

Vue.component('view-messages',
{
    props: ['message'],
    template:   
    `
    <li class="collection-item" style="min-height: 60px;">
        <p style="padding: 0px; margin: 0px; font-size: 10px; font-weight: bold;">From {{message.sender}} on {{message.timestamp.split('T')[0]}} at {{message.timestamp.split('T')[1].split('.')[0]}}</span></p>
        <p style="padding: 0px; margin: 0px; font-size: 14px;">{{message.message}}</p>
    </li>
    `
});