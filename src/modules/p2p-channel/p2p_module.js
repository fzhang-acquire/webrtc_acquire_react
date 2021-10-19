import MicroEmitter from 'core/helpers/micro_emitter';
import roomIdGenerate from "../../core/helpers/roomIdGenerate";

export default class P2PModule  extends  MicroEmitter {
    constructor(app, thread, channel) {
        super();
        this.__type = (this.constructor).getName();
        this.thread = thread;
        this.app = app;
        this.channel = channel;
        this.id = roomIdGenerate(app.mainApp.config.account, this.__type, thread.id);
        this.cookieId = `${app.mainApp.config.account}_${this.__type}_${ thread.id }`;
        this.state_id = this.__type + '_' + app.mainApp.config.account;
        this.onDisposeCbs = [];

        this.xxxxx = this.stateObservable(thread, `${ this.id }._0`);
        this.data = this.stateObservable(thread, `${ this.id }.data`);
        this.owners = this.stateObservable([], `${this.id}.owners`);
        this.threadMyself = this.stateObservable(null, `${this.id}.myself`);
        this.invitedUsers = [];

        this.threadUsers = this.createThreadUsersList(true);


        this.__state = null;
        this._started = null;

        this.if('ready', () => {
            if (this.channel.ready && this.thread.status === 'active' ) {
                this.channel.join(this.id, this);
            }

            this.channel.if('ready', () => {
                if (typeof this.channel == 'undefined') {
                    return;
                }

                if (this.thread.status === 'active' || true) {
                    this.channel.join(this.id, this);
                }

                this.channel.on('ready', () => {
                    if (typeof this.channel == 'undefined') {
                        return;
                    }
                    if (this.thread.status === 'active') {
                        this.channel.join(this.id, this);
                    }
                }, this);
            }, this);
        }, this.channel);

        this.myself = this.createP2PMyClient();
        this.users = this.stateObservable([], `${this.id}.users`);
        this.users(this.createP2PClientList());

        this.onDisposeCbs.push(this.on('client-updated', () => {
            this.users(this.createP2PClientList());
        }));
        this.onDisposeCbs.push(this.threadUsers.subscribe((tUsers) => {
            if (tUsers) {
                for (const u of tUsers) {
                    if (Object.keys(u.clients).length > 0) {
                        //console.log('clients exist for u :', u);
                    } else {
                        this.inviteUserToRoom(u);
                    }
                }
            }
        }));


    }

    inviteUserToRoom(u){
        let uKey = `${u.type}-${u.id}`;
        if(!this.invitedUsers.includes(uKey)) {
            this.invitedUsers.push(uKey);
            setTimeout(() => {
                this.app.signal([{type: u.type, id: u.id }], "askAvailableForCall", { roomId: this.id, threadId: this.thread.threadId, contactId: this.thread.contactId, type: this.callType() }).then(null);
                //console.log('send invitation to u :', u);
            }, 600);

        }
    }

    anyClientOnline() {
        let online = false;
        if (this.data() && this.data().clients) {
            for (const cl of this.data().clients) {
                if (cl.online) {
                    online = true;
                }
            }
        }
    }

    isClientAvailable(client, alert= false) {
        if (client && client.client && !client.client.online) {
            if (alert) {
                this.app.mainApp.showDialog({
                    title: this.app.getTransMsg('User unavailable'),
                    content: this.app.getTransMsg('User is not online.')
                });
            }
            return false;
        }
        return true;
    }

    getUserClass() {
        return null;
    }

    createThreadUsersList(ob = false, thread = null){
        if (!this.app.myself) {
            return () => [];
        }

        let _users = null;
        if(thread){
            this.data(thread);
            _users = thread.users;
        }

        const users = _users || this.data().users,
                arr = [],
                index = [],
                myself = this.app.myself;

        //console.log('users', users);
        for (const k in users) {
            const u = users[k];
            if(typeof u !== 'object') continue;
            const me = myself.type === u.type && parseInt(myself.id) === parseInt(u.userId);

            if (!['active', 'joined'].includes(u.status)) {
                continue;
            }

            if (this.owners().indexOf(u.id) < 0) {
                let owners = this.owners();
                owners.push(u.id);
                this.owners(owners);
            }

            let already = false;
            if (me) {
                if (this.threadMyself() && this.threadMyself().id === u.userId) {
                    already = true;
                }
            } else {
                already = index.includes(`${u.type}-${u.userId}`);
            }

            if (u.type === 'user' && ['active', 'joined'].includes(u.status)) {
                this.app.__last_agents.push(u);
            }

            //console.log(index,`${u.type}-${u.userId}`);

            if (!already) {
                if (me) {
                    this.threadMyself(u.type === 'user' ? this.app.getUser(u.userId) : this.app.getContact(u.userId));
                } else if (u.type === 'user') {
                    arr.push(this.app.getUser(u.userId, false));
                } else if (u.type === 'contact') {
                    arr.push(this.app.getContact(u.userId));
                }
                index.push(`${u.type}-${u.userId}`);
            }
        }

        if(!ob) {
            try {
                //console.log(this.threadUsers(), arr);
                if(JSON.stringify(this.threadUsers()) !== JSON.stringify(arr)) {
                    this.threadUsers(arr);
                    this.trigger('client-updated');
                }
            }catch (e) {

            }

            return arr;
        }

        return this.stateObservable(arr, `${this.id}.threadUsers`);
    }

    createP2PMyClient() {
        const cls = this.getUserClass();

        let ob = null;
        if (this.threadMyself() && this.app.myself) {
            for (const k in this.threadMyself().clients) {
                const c = this.threadMyself().clients[k];
                if (k === this.app.myself.client.id) {
                    if (!ob) {
                        ob = this.app.p2p.user(this, k, cls, this.threadMyself(), c);
                        this.trigger('ready', this.app.p2p);
                    } else {
                        ob.client = c;
                    }
                }
            }
        }

        return ob;
    }

    createP2PClientList() {
        const cls = this.getUserClass();

        const client_list = this.users(),
                arr = [],
                added = [];

        const check = (user, cid, c) => {
            c.virtual = this.data().users && this.data().users[user.id] ? this.data().users[user.id].virtual : false;
            c.widget_state = (user.widget_state && typeof user.widget_state.ui !== 'undefined') ? user.widget_state.ui : false;


            let found = false;
            for (const cl of client_list) {
                if (cl.id === cid) {
                    cl.client = c;
                    found = true;
                }
            }
            if (!found) {
                // user,cid,client,a1,a2,a3
                //console.log('user-added', cid);
                arr.push(this.app.p2p.user(this, cid, cls, user, c));
            }
            added.push(cid);
        };
        if (this.threadUsers()) {
            for (const u of this.threadUsers()) {
                if(Object.keys(u.clients).length > 0) {
                    for (const k in u.clients) {
                        check(u, k, u.clients[k]);
                    }
                } else {
                    this.inviteUserToRoom(u);
                    //console.log('send invitation to u :', u);
                }
            }
            if (this.threadMyself()) {
                for (const k in this.threadMyself().clients) {
                    const c = this.threadMyself().clients[k];
                    if (k !== this.app.myself.client.id) {
                        check(this.threadMyself(), k, c);
                    }
                }
            }
            // remove old ones..
            for (let i = client_list.length - 1; i >= 0; --i) {
                const u = client_list[i];

                let found = false;
                for (const u1 of this.threadUsers()) {
                    for (const k in u1.clients) {
                        if (u.id === k) {
                            found = true;
                        }
                    }
                }
                if (this.myself) {
                    for (const k in this.myself.clients) {
                        if (k !== this.app.myself.client.id && k === u.id) {
                            found = true;
                        }
                    }
                }
                if (!found) {
                    // remove
                    u.trigger('dispose');
                    arr.remove(u);
                }
            }
        }

        return arr.concat(this.users());
    }

    onDispose() {
        if (!this.users) {
            return;
        }
        for (const u of this.users()) {
            u.trigger('dispose');
        }
        if (this.channel && this.channel.quit) {
            this.channel.quit(this.id, this);
        }

        if (this.threadMyself()) {
            this.threadMyself.reset();
        }
    }

    onDestroy() {
        for (const key in this) {
            this[key] = null;
            delete this[key];
        }
    }

    static getName() {

    }

    start() {
        if (this._started) {
            return;
        }
        this._started = true;
    }

    /*broadcastStream(event,cb){
        this.channel.broadcastStream(this.id,event,cb);
    }*/


    broadcastMsg(event, args) {
        this.channel.broadcast(this.id, event, args);
        this.start();
    }

}
