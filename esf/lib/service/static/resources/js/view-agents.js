Vue.component('view-agents',
{
    props: ['agents'],
    template:   
    `
        <div class="card white" style="margin: 10px; height: calc(100vh - 114px); overflow-y: auto; overflow-x: hidden;">
            <div style="padding-left: 10px; padding-right: 10px;">
                <h3>Service Agents</h3>
                <div class="row" style="margin-bottom: 0px;">
                    <ul id="agentList" class="collection" style="height: 100%; overflow: auto;">
                        <agent-list v-for="(agent, index) in agents"
                                    v-bind:agent="agent"
                                    v-bind:index="index"
                                    v-bind:key="index">
                        </agent-list>
                    </ul>
                </div>
            </div>
        </div>
    `
});

Vue.component('agent-list',
{
    props: ['agent', 'index'],
    template:   
    `
    <li class="collection-item">
        <span class="title">{{agent._source.name}} revision {{agent._source.metadata.revision}} - Service: <a v-bind:href="'' + agent._source.url + ''" target="_blank">{{agent._source.url}}</a></span>
        <a href="#!" v-bind:onclick="'deleteAgent(\\'' + agent._id + '\\')'" class="secondary-content"><i class="material-icons black-text">delete</i></a>
        <a href="#!" v-bind:onclick="'editAgent(\\'' + agent._id + '\\')'" class="secondary-content"><i class="material-icons black-text">edit</i></a>
    </li>
    `
});