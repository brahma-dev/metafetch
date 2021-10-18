import * as superagent from 'superagent';
declare module 'superagent' {
    interface SuperAgentRequest extends Request {
        charset: ()=>this
    }
}