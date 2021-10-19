import {isAcqBare} from '../../../../';
import MicroEmitter from 'core/helpers/micro_emitter';
import ServerConnector from '../server-communication/server_connector';
import Peer from './peer';

export default class P2PChannel extends MicroEmitter {

    constructor(app, details) {
        super();
        this.showLogs = (window.location.href.indexOf('clogs') > 0);
        // this.joinRoomArray = [];

        this.app = app;
        this.details = details;
        this.connector = null;
        this.socket = null;
        this.event_map = [];
        this.users = {};
        this.ready = false;
        this._links = {};
        this._users = {};
        this._rooms = {};
        // public joinRoomArray: any;

    }

    updateDetails(details) {
        this.details = details;

    }

    getUserId(uid) {

        return uid;
    }

    user(module, id, cls = Peer, a, b) {
        if (typeof this.users[module.id] == 'undefined') {
            this.users[module.id] = {};
        }
        if (
            typeof this.users[module.id][id] == 'undefined' ||
            typeof this.users[module.id][id].id == 'undefined'
        ) { // cid,channel,module,chat,user,state, rtcroom

            const user = new cls(id, module, a, b);
            user.on('dispose', () => {
                delete this.users[module.id][id];
            }, this);

            const cbs = this.users[module.id][id];
            this.users[module.id][id] = user;
            if (cbs) {
                for (const cb of cbs) {
                    cb(user);
                }
            }
        }
        return this.users[module.id][id];
    }

    start() {
        if (this.connector) {
            return;
        }

        // console.log('[p2p] connecting...');
        this.connector = new ServerConnector('p2p', this.app, this.app.getSignalingServerURL()[0], this.app.getSignalingServerURL()[1], true);

        this.connector.on('connect', first => {
            this.socket = this.connector.server;

            this.app.currentSI = this.socket.id;
            this.app.socket = this.socket;

            const recording = !!(this.app.mainApp.getSetting && this.app.mainApp.getSetting('crm.enable_call_recording') === 'yes');
            const crecording =!!(this.app.mainApp.getSetting && this.app.mainApp.getSetting('cobrowse.enable_video_recording') === 'yes');

            this.socket.on('session_conflict', () => {
                if (this.showLogs) console.log('[p2p] session_conflict');
                this.connector.suspend();
            });

            this.socket.on('create-chat', async (codeResult) => {
                const createChat = await this.app.mainApp.api('post', `crm/messenger/chat/create?-x-user-type=contact&contactId=${codeResult.contactId}`, {}, {
                    message: {
                        type: 'message',
                        message: '',
                        translateLangKey: '',
                    },
                    isFromCobrowse:true,
                    agentId: codeResult.agentId
                });
                this.socket.emit('result-to-agent',codeResult, createChat);
            });

            // this.socket.on('contact-not-available', async (codeResult) => {
                // this.app.mainApp.showDialog({
                //     title: this.app.getTransMsg('Message'),
                //     content: this.app.getTransMsg('User is offline.')
                // });
            // });

            this.socket.on('success-to-agent', async (codeResult, createChat) => {
                const contactId = (createChat.contact) ? createChat.contact.id : createChat.contactId;
                const caseId = createChat.id;
                const timelineId = createChat.timelineId;
                const threadId  = createChat.threadId;
                const isCaseJoined = createChat.isCaseJoined;
                acquireIO.trigger('needToReloadChatView', contactId);
                acquireIO.contactRedirect({ threadId, contactId, timelineId, caseId, isCaseJoined, callback: (e) => {
                    const waitForElement = (selector, callback) => {
                        let poops = setInterval(function(){
                            if(document.querySelector(selector)){
                                const el = document.querySelector(selector);
                                clearInterval(poops);
                                callback(el);
                            }
                        }, 100);
                    }

                    if(this.app.connect_contact_by_code() === 'yes') {

                        //check, Is chat tab exist or not?
                        waitForElement('[data-for="chat"]', function(cobrowseTab){
                            acquireIO.changeTab(contactId, timelineId, 'chat');
                            const element = document.querySelector('.co-browsing-btn');
                            if(element) {
                                element.style.color = "#375674";
                                element.style.pointerEvents = 'auto';
                            }
                        });

                    } else {

                        let initType = 'cobrowse', dataFor = 'dynamic-tab-rtc-cobrowse', reqBtn = '.cobrowse-request-btn';
                        if(isAcqBare()){
                            initType = this.app.autoInitType;
                            if(initType === 'screen') {
                                dataFor = 'dynamic-tab-rtc-screen';
                                reqBtn = '.screen-request-btn';
                                waitForElement('[data-for="dynamic-tab-rtc-cobrowse"]', function(tab){
                                    tab && acquireIO.changeTab(contactId, timelineId, dataFor);
                                });

                            }else if(initType === 'video' || initType == 'audio'){
                                waitForElement('.user-profile-header', (header) => {
                                    let elmSel = '.video-call-request';
                                    if(initType === 'audio'){
                                        elmSel = '.audio-call-request';
                                    }
                                    waitForElement(elmSel, (rtcBtn) => {
                                        this.app.mainApp.store.dispatch({
                                            type:'DASHBOARD_PROFILE_TOGGLE'
                                        })
                                        setTimeout(() => {
                                            rtcBtn.click();
                                        }, 1500);
                                    });
                                });

                                return;

                            }
                        }
                        //check, Is cobrowse tab is exist?
                        waitForElement('[data-for="'+ dataFor +'"]', function(cobrowseTab){
                            //check tab content
                            let tryForContent = 0;
                            const checkContent = setInterval(() => {
                                try {
                                    const cobrowseContent = document.querySelector('.case-tab-dynamic-tab-rtc-cobrowse h1').innerHTML;
                                    if(cobrowseContent == "Tab Content for Tab Cobrowse" && tryForContent <= 10) {
                                        acquireIO.trigger('fillChatView', contactId);
                                        clearInterval(checkContent);
                                    } else if(tryForContent > 10){
                                        clearInterval(checkContent);
                                    }
                                    tryForContent++;
                                } catch (error) {
                                    clearInterval(checkContent);
                                    tryForContent++;
                                }
                            }, 500);

                            acquireIO.changeTab(contactId, timelineId, dataFor);



                            //check, Is tab changed or not?
                            let tryTabChange = 0;
                            const checkTabChange = setInterval(() => {
                                try {
                                    if(cobrowseTab.classList.contains('is-selected')){
                                        clearInterval(checkTabChange);
                                    } else {
                                        acquireIO.changeTab(contactId, timelineId, 'dynamic-tab-rtc-cobrowse');
                                        clearInterval(checkTabChange);
                                    }
                                } catch (error) {
                                    clearInterval(checkTabChange);
                                }
                            }, 500);

                            //check, Is request is sent or not?
                            waitForElement(reqBtn, function(cobrowseRequestBtn){
                                let tryRequest = 0;
                                const checkRequest = setInterval(() => {
                                    try {
                                        if(cobrowseRequestBtn.value !== 'Please Wait...' && tryRequest <= 10) {
                                            cobrowseRequestBtn.click();
                                            clearInterval(checkRequest);
                                        } else if(tryRequest > 10){
                                            clearInterval(checkRequest);
                                        }
                                        tryRequest++;
                                    } catch (error) {
                                        clearInterval(checkRequest);
                                    }
                                }, 500);
                                // const element:any = document.querySelector('.co-browsing-btn');
                                // element.style.color = "#375674";
                                // element.style.pointerEvents = 'auto';
                                acquireIO.trigger('enableCobrowseBtn');

                            });

                        });
                    }
                }});

            })

            this.socket.emit('register',
                {
                    recording,
                    name: this.app.mainApp.myself().name || this.app.mainApp.myself().fields.name || `${this.app.mainApp.myself().type || 'user'} #${this.app.mainApp.myself().id}`,
                    cobrowse_recording: crecording,
                    account: this.app.mainApp.config.account,
                    data: {
                        type: this.app.type,
                        tenantId: this.app.mainApp.config.account,
                        userId: this.app.mainApp.myself().id,
                        clientUrl:window.location.href
                    }
                },
                (err, status, result) => {
                    if (err) {
                        if (this.showLogs) console.error('register event:::', err.message);
                    }

                    if(this.app.type === 'frontend') {
                        this.app.cobrowseCode = (result && result.cobrowseCode) || '';
                    }

                    this._users[this.details.id] = (status);

                    this.event_map = [];

                    this.ready = true;
                     console.log('[p2p] registered...');
                    this.trigger('ready');
                },
            );

            if(this.app.onSockConnect && Array.isArray(this.app.onSockConnect)){
                for(let fn of this.app.onSockConnect){
                    if(typeof fn === 'function') {
                        fn();
                    }
                }

                this.app.onSockConnect = [];
            }
        });

        this.connector.on('disconnect', first => {
             console.log('[p2p] disconnected...');
            this.trigger('disconnect');
            this.ready = false;

            for (const k in this.users) {
                for (const x in this.users[k]) {
                    if ((this.users[k]) && typeof this.users[k][x].trigger === 'function') {
                        this.users[k][x].trigger('leave');
                    }else{
                        console.log('leave trigger err: ', this.users[k][x]);
                    }
                }
            }

            this._users = {};
            this._links = {};
            this._rooms = {};
        });
    }

    quit(room, module) {
        if (this.socket == null) {
            return;
        }
        if (typeof this._rooms[room] !== 'undefined' && this._rooms[room] != null) {
            this.socket.off(this._rooms[room]);
        }
        delete this._rooms[room];
        if (this.socket) {
            this.socket.emit('quit', room);
        }
    }

    join(room, module, rejoin = false) {
        if (typeof this._rooms[room] !== 'undefined') {
            if (this.showLogs) console.error('[p2p] room already joined.');
            return;
        }

        this._rooms[room] = null;
        this.if('ready',()=>{
            this.socket.emit('join', room, false, true, rid => {
                this._rooms[room] = rid;
                if (this.showLogs) console.error('[p2p] joined room:' + rid);

                const listen = (uid, type, ...args) => {

                    type = typeof type == 'string' ? type : this.event_map[type];
                    // console.error('got msg:' + type);

                    if (typeof uid !== 'string' && typeof uid != 'number') {
                        if (this.showLogs) {
                            console.error('invalid uid recevied from server room:' + room + ' rid:' + rid + ' uid:' + uid + ' type:' + type);
                            console.error(uid);
                            console.error(type);
                            console.error(args);
                        }
                    }
                    // 400,000
                    //

                    const from = uid;
                    // if(this.app.type == 'backend') {
                    //     if(type == 'join' && rid.indexOf('cobrowse_') >= 0) {
                    //         this.joinRoomArray.push(rid);
                    //         this.app.joinRoomArray = this.joinRoomArray;
                    //     } else if(type == 'leave' && rid.indexOf('cobrowse_') >= 0) {
                    //         const rmIndex = this.joinRoomArray.indexOf(rid);
                    //         this.joinRoomArray.splice(rmIndex, 1);
                    //         this.app.joinRoomArray = this.joinRoomArray;
                    //     }
                    // }

                    // if(this.app.type == 'frontend' && type == 'change-cobrowse-settings') {
                    //     acquireIO.trigger('changeFrontSettings', args[0]);
                    //     // console.log(args[0], "::::::");
                    // }


                    if (type === 'join' || type === 'leave') {
                        const utype = from.indexOf('visitor-') >= 0 ? 'visitor' : 'agent';
                        const id = from.split(utype + '-')[1].split('-')[0];

                        if (type === 'join') {
                            module.addUser(utype, id);
                            for (const typ of ['contact', 'user']) {
                                const s = typ + 's';
                                for (const k in this.app[s]) {
                                    let legacyTyp = typ === 'contact' ? 'visitor' : 'agent' // type Issue
                                    if (from.indexOf(legacyTyp + '-' + k) === 0) {
                                        this.app.l && console.error('adding client', this.app[s][k]);
                                        this.app[s][k].clients = {
                                            [from]: {
                                                name: 'web',
                                                online: true,
                                                cobrowse_code: '222',
                                                url:args[args.length-1]
                                            },
                                        };
                                    }
                                }
                            }
                        } else {
                            for (const typ of ['contact', 'user']) {
                                const s = typ + 's';
                                for (const k in this.app[s]) {
                                    this.app[s][k].clients = {
                                        [from]: {
                                            online: false,
                                        },
                                    }
                                }
                            }

                            /*if(this.app.type === 'frontend') {
                                let asu = this.app.mainApp.on('agent-state-updated', () => {
                                    let onlineAgs = this.app.mainApp.onlineAgents();
                                    for (let ag of onlineAgs) {
                                        if(parseInt(ag.id) === parseInt(id)) {
                                            setTimeout(() => {
                                                this.app.signal([{type: 'user', id}], "resume-room", { roomId: module.id, threadId: module.thread.threadId, contactId: module.thread.contactId }).then(null);
                                            }, 15000);

                                            //console.log('agent - ' + id, 'coming back online.. ');
                                            asu();
                                        }
                                    }
                                });
                            }*/
                        }
                    }

                    // console.log('[p2p] msg in room from:'+from+" room:"+room+' event:'+type);
                    args.unshift(type);

                    if (from !== null) {
                        if (typeof this.users[room] == 'undefined') {
                            this.users[room] = {};
                        }

                        this.users[room][from] = this.users[room][from] ? this.users[room][from] : [];
                        const user = this.users[room][from];

                        if (user && typeof user.id !== 'undefined') {
                            user.trigger.apply(user, args);
                            user.onMsg.apply(user, args);
                        } else {
                            user.push(user => {
                                user.trigger.apply(user, args);
                                user.onMsg.apply(user, args);
                            });
                            this.users[room][from] = user;
                            if (this.showLogs) console.error('[p2p] user not in online list. waiting.. type:' + type + ' from:' + from);
                            // console.error(from,type,...args);
                        }
                    } else {
                        if (this.showLogs) console.error('[p2p] user sending message even we\'ve not joined him..');
                    }
                };

                this.app.l && console.log(rid, 'listen')
                this.socket.on(rid, listen);
                this.on('disconnect', () => {
                    this.socket.off(rid, listen);
                });
                if (module && module.on) {
                    module.on('dispose', () => {
                        if (this.socket) {
                            this.socket.off(rid);
                        }
                    }, this);
                }

                this.socket.emit('join-success', false, rid,rejoin);

            });
        })
    }

    onDispose() {
        /*for(let k in this.users){
            for (let x in this.users[k]){
                let u=this.users[k][x];
                if (u && typeof u.trigger=='function'){
                    u.trigger('dispose');
                }
            }
        }*/
        this.users = {};
        if (this.connector) {
            this.connector.suspend();
        }
    }

    onDestroy() {
        for (const k in this) {
            this[k] = null;
        }
    }

    whenReady(cb) {
        if (this.ready) {
            cb();
        } else {
            this.once('ready', cb);
        }
    }

    broadcast(room, event, args) {
        this.whenReady(() => {
            if (typeof this._rooms[room] !== 'undefined') {
                event = this.event_map.indexOf(event) >= 0 ? this.event_map.indexOf(event) : event;
                args.unshift(event);
                args.unshift(this._rooms[room]);
                this.socket.emit.apply(this.socket, args);
            } else {
                if (this.showLogs) console.error("[p2p] room is not joined yet. so can't broadcast.");
            }
        });
    }

    msg(link, event, args) {
        if (this.event_map === null) {
            return;
        }
        event = this.event_map.indexOf(event) >= 0 ? this.event_map.indexOf(event) : event;
        args.unshift(event);
        args.unshift(link);
        this.socket.emit.apply(this.socket, args);
    }

    trackEvent(category, type, data) {
        this.socket.emit('event', category, type, data);
    }
}
