import Client from '../../core/client';
import Utils from '../../libs/utils';
import RTCHelper from './rtcroom_helper.js';
import {addRTCView} from "../../core/helpers/addRTCView";

export default class User extends Client {
    static RTC = RTCHelper;

    constructor(id, module, user, state) {
        super(id, module, user, state);
        this.room = module;

        // this.user=user;//observable

        this.callback_type = 'required';

        this._rtc_calling = false;

        this.status = 'standby';
        this.callIspicked = false;

        this.on('status-update', () => {
            if (this.status === 'standby') {
                this._rtc_calling = false;
            }

            if ((this.status === 'standby' && this.room.app.type === 'frontend')) {
                Utils.setCookie(`is_call_started_${this.room.app.myself.id}`, '', null);
            }
        })

        window.onunload = () => {
            if ((this.status === 'incall' || this.status === 'joined') && this.room.app.type === 'frontend') {
                Utils.setCookie(`is_call_started_${this.room.app.myself.id}`, 'true', null);
            }

        };

        // standby
        // incall   // room will have call_id.. i am not yet joined with any voice/video call, but i can share screen yet...
        // joined   // room will have call_id.. i am also joined with


        this.screen_status = 'standby';
        // standby
        // incall   // room will have call_id.. i am not yet joined with any screen share, ...
        // joined   // room will have call_id.. i am also joined with it and shared my screen as well.

        this.config = {
            sslVersion: location.href.indexOf('https://') === 0 || location.href.indexOf('://localhost') >= 0,
            webrtcCoreSupported: RTCHelper.webrtcSupported,
            webrtcSupported: RTCHelper.webrtcSupported && (location.href.indexOf('https://') === 0 || location.href.indexOf('://localhost') >= 0),
        };

        this.settingsButton = false;
        this.settingsModel = false;
        this.extraUsersPanel = false;
        this.tooltipName = false

        this.connections = {};
        this.rotation = 0;
        this.streamLoopCounter = 0;

        this._stream = {
            screen: null,                 // if its here on myself.. means we are sharing.. else we are receviing.
            rtc: null,                   // 1=>loading
            video_mute: false,
            audio_mute: false,
            screen_mute: false,
        };

        this.rtcStreamName = ''; // => {
        this.screenStreamName = 'na';

        this.stream_type = [];
        this.rtcStreamType = 'na';
        this.streamWrote = false;

        this.stream = (val = 'NA') => {
            if (val !== 'NA') {
                const strm = Object.assign({}, this._stream, val);
                this.stream_type = this.checkStreamType(strm);
                this.streamWrote = true;

                this.rtcStreamType = (this.stream_type.indexOf('audio_only') < 0 ? 'video' : 'audio');
                this.rtcStreamName = (strm.screen ? 'na' : user.id + '-' + (this.stream_type.indexOf('audio_only') < 0 ? 'video' : 'audio'));
                this.screenStreamName = (this.stream().screen && user ? user.id + '-' + ('screen') : 'na');
                this._stream = strm;
                this.trigger('stream-update');
                return val;
            }
            return this._stream;
        };

        this.video_mute = false;
        this.callType = null;
        this.audio_mute = false;
        this.screen_mute = false;

        this.shouldWePickCall = null;      // if there is an incoming call.. GUI Sholud ask user, what to pick
        this.callIconVisible = true;
        this.on('shouldWePickCall', () => {
            setTimeout(() => {
                try {
                    if (this.shouldWePickCall == null) {
                        this.callIconVisible = true;
                    } else {
                        this.callIconVisible = false;
                    }

                    if (this.shouldWePickCall == null && this.status === 'standby') {
                        this.room.app.mainApp.trigger('rtcCallStatus', {
                            contactId: this.room.data().contactId,
                            callChannel: this.room.callType(),
                            status: "disconnected"
                        })
                    }
                    if (this.shouldWePickCall) {

                        this.room.app.status('rtc_incoming');
                        this.room.state('connecting');

                        if (this.room.app.type === 'backend') {

                            this.room.app.mainApp.trigger('rtcCallStatus', {
                                contactId: this.room.data().contactId,
                                callChannel: (this.shouldWePickCall && this.shouldWePickCall.typeText) || 'audio',
                                status: "incoming"
                            })
                            this.room.app.mainApp.showNotification({
                                contactId: this.room.data().contactId,
                                type: this.shouldWePickCall.typeText, // video
                                icon: 'icon-video-call', //enum(icon-video-call, https://example.com/dummy-icon.png)
                                iconType: 'font-icon', //enum(font-icon, image-url)
                                title: `Incoming ${(this.shouldWePickCall && this.shouldWePickCall.typeText) || 'audio'} call`,
                                description: `From user #${this.room.data().id}`,
                                accept: (resp, type) => {

                                    try {
                                        if (this.shouldWePickCall) {
                                            this.shouldWePickCall.cb(type || (this.shouldWePickCall && this.shouldWePickCall.typeText) || 'audio')
                                        }
                                    } catch (err) {
                                    }

                                },
                                reject: (resp) => {
                                    try {
                                        if (this.shouldWePickCall) {
                                            this.shouldWePickCall.cb('declined')

                                        }
                                    } catch (err) {

                                    }
                                },
                                disconnect: (resp) => {
                                    this.stopRTCCall();
                                },
                                remove: (resp) => {
                                    // console.log("M --- remove---resp--------", resp);
                                }
                            });
                        }

                        /*if (this.room.app.type == 'frontend') {
                            this.room.app.ui.status('max');
                        }*/
                    }
                } catch (e) {
                    // console.error(e);
                }
            }, 30);
        });

        setTimeout(() => {
            ['video_mute', 'audio_mute', 'screen_mute'].forEach(val => {
                if (this && typeof this[val] !== 'undefined') {

                    this.on(`t-${val}`, () => {
                        if (this._stream && this.room.users) {
                            for (const k of this.room.users()) {
                                k.msg(val, this[val]);
                            }
                            this._stream[val] = this[val];
                            this.trigger('stream-update');
                        }
                    });
                }
            });
        }, 500);

        this.on('t-video_mute', () => {

            const type = this.stream_type;
            const isVideoMute = this.video_mute;
            if (type.includes('video') && isVideoMute === false) {
                this.callType = 'video';
            } else {
                this.callType = 'audio';
            }


            if (this.stream().rtc && this.stream().rtc.getVideoTracks && this.stream().rtc.getVideoTracks().length > 0) {
                this.stream().rtc.getVideoTracks()[0].enabled = !this.video_mute;
            }
            if (this.room.callType() === 'video' && this.room.app.mainApp.type === 'contact' && typeof this.room.app.mainApp.pushToGoogleAnalyticsEvent === 'function' && this.status !== 'standby' && this === this.room.myself) {
                this.room.app.mainApp.pushToGoogleAnalyticsEvent(`${this.video_mute ? 'video_mute' : 'video_unmute'}`, 'click', `${this.video_mute ? 'Video Mute' : 'Video Unmute'}`);
            }
        });
        this.on('t-audio_mute', () => {
            if (this.stream().rtc && this.stream().rtc.getAudioTracks && this.stream().rtc.getAudioTracks().length > 0) {
                this.stream().rtc.getAudioTracks()[0].enabled = !this.audio_mute;
            }
            if (this.room.app.mainApp.type === 'contact' && typeof this.room.app.mainApp.pushToGoogleAnalyticsEvent === 'function' && this.status !== 'standby' && this === this.room.myself) {
                this.room.app.mainApp.pushToGoogleAnalyticsEvent(`${this.audio_mute ? 'audio_mute' : 'audio_unmute'}`, 'click', `${this.audio_mute ? 'Audio Mute' : 'Audio Unmute'}`);
            }
        });
        this.on('t-screen_mute', () => {
            if (this.stream().screen && this.stream().screen.getVideoTracks && this.stream().screen.getVideoTracks().length > 0) {

                this.stream().screen.getVideoTracks()[0].enabled = !this.screen_mute;
            }
        });

        this.on('stream-update', () => {
            const type = this.stream_type;

            const isVideoMute = this.video_mute;
            if (type.includes('video') && isVideoMute === false) {
                this.callType = 'video';
            } else if(type.includes('audio')){
                this.callType = 'audio';
            }

            let disableAudioDefault = false;

            if (this.room && this.room.myself && this.room.myself !== this) {
                disableAudioDefault = false;
            }
            if (type.indexOf('video') >= 0) {
                this.video_mute = (this.video_mute === null ? false : this.video_mute);
            } else {
                this.video_mute = false;
            }

            if (type.indexOf('audio') >= 0) {
                this.audio_mute = (this.audio_mute === null ? disableAudioDefault : this.audio_mute);
            } else {
                this.audio_mute = false;
            }

            if (type.indexOf('screen') >= 0) {
                this.screen_mute = (this.screen_mute === null ? false : this.screen_mute);
            } else {
                this.screen_mute = false;
            }

        });

        this.trackEvents();
    }

    checkAudioAutoPlay(element) {
        try {
            const promise = element.play();
            if (promise) {
                promise.then(() => {
                    this.audioPlayed = true;

                }).catch(error => {
                    this.audioPlayed = false;
                    if (error && error.name && error.name === 'NotAllowedError') {
                        if (this.room.app.mainApp.getSetting('crm.visitor_call_popup_alert') === 'no') {
                            return;

                        }

                        const onClickAndClose = (e) => {

                            element.play().then(() => {
                                this.audioPlayed = true;
                                // element.removeAttribute('');
                                // element.setAttribute('controls', 'controls');
                            }).catch(error => {
                                console.log("audioAutoplayerror", error)
                                this.audioPlayed = false;

                            });
                        }

                        const playNowLabel = this.room.app.getTransMsg('Play Now');

                        if (this.room.app.mainApp.type === 'backend') {
                            const buttons = [
                                {
                                    action: 'ok',
                                    label: playNowLabel,
                                    isPrimary: true,
                                    onClickAndClose
                                }
                            ];

                            this.room.app.mainApp.showDialog({
                                title: this.room.app.getTransMsg('Audio Auto-Play Disabled'),
                                content: this.room.app.getTransMsg('Audio Auto play not allowed by your browser. So please click play now  button to start Audio.'),
                                buttons
                            });
                        }else{
                            this.room.app.mainApp.dialog.save({
                                title: this.room.app.getTransMsg('Audio Auto-Play Disabled'),
                                description: this.room.app.getTransMsg('Audio Auto play not allowed by your browser. So please click play now  button to start Audio.'),
                                onClose: () => {
                                    onClickAndClose();
                                },
                                saveButtonText: playNowLabel,
                                onSave: () => {
                                    onClickAndClose();
                                }

                            });
                        }

                        // show controlls.
                        // element.setAttribute('controls', 'controls');
                    }

                });
            }
        } catch (e) {
            console.error("audioAutoplayerror", e);
        }
    }

    checkStreamType(strm) {
        const streams = [];
        if (strm.screen) {
            if (this.room.app.type === 'backend') this.room.app.mainApp.trigger('remoteChatOnThread');
            streams.push('screen');
        }
        if (strm.rtc) {
            streams.push('rtc');

            if (strm.rtc.getVideoTracks().length > 0) {
                streams.push('video');
            }
            if (strm.rtc.getAudioTracks().length > 0) {
                streams.push('audio');
            }

            if (strm.rtc.getVideoTracks().length > 0 && strm.rtc.getAudioTracks().length == 0) {
                streams.push('video_only');
            }
            if (strm.rtc.getVideoTracks().length == 0 && strm.rtc.getAudioTracks().length > 0) {
                streams.push('audio_only');
            }
            if (strm.rtc.getVideoTracks().length == 0 && strm.rtc.getAudioTracks().length == 0) {
                streams.push('none');
            }
        }
        return streams;
    }

    rotate(left = true) {
        if (!this.isRotateVideoSupport(true)) {
            return;
        }
        this.rotation = (left ? this.rotation - 90 : this.rotation + 90);
        if (this.rotation == 360 || this.rotation == -360) {
            this.rotation = (0);
        }
        for (let e of this.room.users()) {
            e.msg('rotate', this.rotation);
        }
    }

    startScreenShare() {

        if (!this.room || !this.room.app) {
            return;
        }
        this.room.startSignaling((online) => {

            if (this.screen_status === 'joined') {
                return;
            }

            if (!this.room || !this.room.app) {
                return;
            }
            if (!online) {
                this.room.app.mainApp.showDialog({
                    title: this.room.app.getTransMsg('Unable to Connect'),
                    content: this.room.app.getTransMsg('Seems like user is no more connected.')
                });
                return;
            }

            this.room.app.frameMananger.checkOperation('webrtc', reload => {
                if (reload) {
                    return;
                }

                if (this.config.notSSL) {
                    this.room.app.mainApp.showDialog({
                        title: this.room.app.getTransMsg('Unable to Connect'),
                        content: this.room.app.getTransMsg('Screen sharing required https version of website.')
                    });
                    return;
                }
                User.RTC.getUserMediaStreams(this.room.app, this.room.data().id, 'screen', (err, streams, type) => {
                    if (err) {
                        if (err.name === 'NotAllowedError') {
                            return;
                        } else {
                            console.error(err);
                        }
                    }

                    this.stream({
                        screen: streams,
                    });
                    this.screen_status = 'joined';
                    // start screen call with each user..
                    const blackList = {};
                    this.screenCaller = user => {
                        if (blackList[user.id] && blackList[user.id] === 'standby') {
                            return;
                        }
                        if (user && user.client && user.client.virtual) {
                            return;
                        }
                        if (this.user.id === user.user.id) {
                            return;
                        }
                        this.startCallWith(user, true, false, picked => {
                            for (const u of this.room.users()) {
                                if (u.user.id === user.user.id && u.id !== user.id) {
                                    this.stopCallWith(u);
                                }
                            }

                        });
                    };


                }, false, null, this.room);

            });
        });
    }

    switchVideo() {
        if (this.__last_type) {
            return;
        }
        this.__last_type = true;
        this.updateStreams();
    }

    updateStreams() {
        if (this.currentCaller) {
            this.__last_hash = this.room.media_settings.getHash();
            User.RTC.getUserMediaStreams(this.room.app, this.room.data().id, this.__last_type ? 'video' : 'audio', (err, streams, type) => {
                if (err) {
                    return;
                }
                let dispose = this.stream().rtc;

                if (this.stream && this.stream().rtc) {
                    dispose = this.stream().rtc;
                }
                if (this.room.app.mainApp.type === 'contact' && typeof this.room.app.mainApp.pushToGoogleAnalyticsEvent === 'function' && this.status !== 'standby' && this === this.room.myself) {
                    this.room.app.mainApp.pushToGoogleAnalyticsEvent(`audio_to_video`, 'click', `Audio to Video`);
                }
                this.stream({
                    rtc: streams,
                });
                if (this.stream().rtc && this.stream().rtc.getAudioTracks && this.stream().rtc.getAudioTracks().length > 0) {
                    this.stream().rtc.getAudioTracks()[0].enabled = !this.audio_mute; //mute audio of new stream if already muted before
                }
                this.trigger('call-update');
                setTimeout(() => {
                    for (let e of this.room.users()) {
                        e.trigger('reset-stream');
                        e.trigger('stream-update');
                    }
                }, 2000);
                this.room.callType('video');
                if (dispose) {
                    dispose.dispose();
                }
            });
        }
    }

    startRTCCall(video = true, callback_type = null, auto_pick = false, checkAgent = true, meStartedCall = true) {
        this.room.createThreadUsersList();
        this.room.startSignaling((online) => {
            if (!online) {
                this.room.app.mainApp.showDialog({
                    title: this.room.app.getTransMsg('Unable to Connect'),
                    content: this.room.app.getTransMsg('Seems like user is no more connected.')
                });
                return;
            }
            if (this._rtc_calling) {
                return;
            }


            this._rtc_calling = true;

            if (this.room.app.type === 'backend') {
                if (this.room.data().status === "closed") {
                    this.room.app.mainApp.showDialog({
                        title: this.room.app.getTransMsg('Opps!'),
                        content: this.room.app.getTransMsg('You have left from this conversation . Please rejoin the chat to start Call')
                    });
                    this._rtc_calling = false;
                    return;
                }

                for (let i = 0; i < this.room.users().length; i++) {
                    const e = this.room.users()[i];
                    if (e.client.online && e.user.type === 'contact' && e.client.url && !e.client.url.includes('https://')) {

                        this.room.app.mainApp.showDialog({
                            title: this.room.app.getTransMsg('Unable to Connect'),
                            content: this.room.app.getTransMsg('Your website does not have https, so video & voice calls are not supported')
                        });

                        this._rtc_calling = false;
                        return;

                    }
                }
                ;

            } else if (this.room.app.type === 'frontend') {
                if (checkAgent) {
                    let agentAvailable = false;
                    for (let u of this.room.data().users) {
                        //console.log(u.client.online);
                        if (((u.user && u.user.type === 'user') || u.type === 'user') && ['joined', 'active'].includes(u.status)) {
                            agentAvailable = true;
                            break;

                        }
                    }
                    if (!agentAvailable) {
                        this.room.app.mainApp.trigger('messageAgent', video ? 'video' : 'audio', null, '', () => {
                            this.startRTCCall(video, callback_type, auto_pick, false)
                        });
                        this._rtc_calling = false;
                        return;
                    }
                }

                this.room.myself.callIspicked = false;
                this.autoCutTimer = setTimeout(() => {
                    if (!this.room.myself.callIspicked) {
                        this.room.app.mainApp.showDialog({
                            title: this.room.app.getTransMsg('Unable to Connect'),
                            content: this.room.app.getTransMsg('Currently all agents are busy. Please try again in some time')
                        });
                        this.room.app.onGoingStimulateCall = false;
                        this.stopRTCCall(true);
                    }

                }, 1200000)

            }


            this.__last_hash = this.room.media_settings.getHash();
            this.__last_type = video;


            if (this.status === 'joined') {
                this._rtc_calling = false;
                return;
            }

            if (this.shouldWePickCall) {
                this._rtc_calling = false;

                return this.shouldWePickCall.cb(video ? 'video' : 'audio');
            }
            const inCallusers = [];
            for (let e of this.room.users()) {
                if (e.status !== 'standby') {
                    inCallusers.push(e);
                }
            }

            if (inCallusers.length >= 5) {
                this._rtc_calling = false;
                this.room.app.mainApp.showDialog({
                    title: this.room.app.getTransMsg('Unable to Connect'),
                    content: this.room.app.getTransMsg('Sorry you can\'t join this, there are already {limit} people in the room, so you can just see the them but you can\'t share your webcam/voice.', { limit: 5 })
                });
                return;
            }
            if (callback_type == null) {
                callback_type = this.callback_type;
            }

            this.room.app.frameMananger.checkOperation('webrtc', reload => {
                // if(!reload){

                const triggerAll = () => {
                    // start call with each user..

                    const blackList = {};

                    this.currentCaller = this.observableCollectionMonitor(this.room.users, user => {
                        if (user && user.client && user.client.virtual)
                            return; // console.error('skiping virual user');
                        if (blackList[user.id] && blackList[user.id] === 'standby')
                            return;
                        if (this.user.id === user.id)
                            return;
                        const skipUUCheck = this._one_way_called === true;

                        //! call all the other users in the room through p2p 
                        //skip offline user
                        if (user && user.client && !user.client.online) {
                            const userSubscribed = user.on('client-update', () => {
                                if (user.client.online === true && user.status === 'standby') {
                                    userSubscribed()

                                    this._one_way_called = false;
                                    // console.error('rtc call added: '+user.id+' : '+auto_pick);
                                    this.startCallWith(user, false, auto_pick, picked => {
                                        for (const u of this.room.users()) {
                                            if (u.user.id === user.user.id && u.id !== user.id) {
                                                this.stopCallWith(u, false, false, true);
                                            }
                                        }


                                        if (picked) { //call is picked by other user
                                            this.room.myself.callIspicked = true;

                                        } else { // call is declined or error
                                            this.room.app.onGoingStimulateCall = false;

                                        }
                                    });

                                }
                            })
                            return;
                        }


                        this._one_way_called = false;

                        //console.error('rtc call added: '+user.id+' : '+auto_pick);
                        this.startCallWith(user, false, auto_pick, picked => {
                            for (const u of this.room.users()) {
                                if (u.user.id === user.user.id && u.id !== user.id) {
                                    this.stopCallWith(u, false, false, true);
                                }
                            }

                            if (picked) { //call is picked by other user
                                this.room.myself.callIspicked = true;

                            } else { // call is declined or error
                                this.room.app.onGoingStimulateCall = false;

                            }
                        });
                    }, user => {
                        if (user && user.client && user.client.virtual) {
                            return;
                        }// console.error('skiping virual user stop');
                        // console.error('rtc call remove: '+user.id);
                        //blackList[user.id] = user.status;
                        //this.stopCallWith(user, false);
                        console.error('removed: ' + id);
                    }, caller => {
                        return this.status === 'joined';
                    });

                };

                if (!this.config.webrtcSupported) {
                    console.log('Video/Audio call not supported in your browser. Please contact to administrator for more information.');
                    this._rtc_calling = false;
                    return;
                }
                User.RTC.getUserMediaStreams(this.room.app, this.room.data().id, video ? 'video' : 'audio', (err, streams, type) => {
                    if (err) {
                        console.error(err);
                        this.room.app.onGoingStimulateCall = false;
                        this._rtc_calling = false;
                        return;
                    }

                    // console.log(streams);
                    this.stream({
                        rtc: streams,
                    });
                    try {
                        this.status = 'joined';

                    } catch (e) {
                        console.error(e);

                    }
                    triggerAll();
                });

                // }
            });
        });
    }

    stopScreenCall(refreshStatus = true) {
        if (this.room.app.type === 'backend') this.room.app.mainApp.trigger('unbindRemoteChatOnThread');
        // remove all incomings calls..
        // i am standby thus everybody must be standby
        if (this.room && this.room.users()) {
            for (let e of this.room.users()) {
                if (e.screen_status !== 'standby') {
                    this.stopCallWith(e, true, refreshStatus);
                }
            }
        }
        this.screen_status = 'standby';

        this.screenCaller = null;
        if (refreshStatus) {
            this.room.refreshMyScreenStatus();
        }
        if (this.stream().screen) {
            if (this.stream().screen.dispose) {
                this.stream().screen.dispose();
            }
            this.stream({screen: null});
        }
        this.room.stopSignaling();
    }

    stopRTCCall(refreshStatus = true) {
        this.room.stopSignaling();
        this.streamLoopCounter = 0;

        if (this.autoCutTimer) {
            clearTimeout(this.autoCutTimer);

        }

        this.room.myself.callIspicked = false;
        this.room.app.onGoingStimulateCall = false;
        if (this.shouldWePickCall && this.shouldWePickCall) {
            if (refreshStatus) {
                this.shouldWePickCall.cb('declined');

            } else {

                this.shouldWePickCall.cb('hanged');
            }
        }
        if (this.room && this.room.app) {

        }
        if (refreshStatus && this.room && this.room.app) {
            this.room.app.popUpMananger.sections.remove('rtcroom');
        }
        // i've stopped sharing..
        this.status = 'standby';
        if (this.stream && this.stream().rtc) {
            this.stream().rtc.dispose();
            this.stream({rtc: null});
        }

        // remove all incomings calls..
        // i am standby thus everybody must be standby
        for (let e of this.room.users()) {
            if (e.status !== 'standby') {
                this.stopCallWith(e, false, refreshStatus);
            }
        }
        this.currentCaller = null;
        if (refreshStatus) {
            this.room.refreshMyRTCStatus();
        }
        this.room.app.trigger('callEnd', this.room);
        this._rtc_calling = false;
    }


    watchStreamClosed(stream, callback) {

        // let streamEndedEvent = 'ended';
        // if ('oninactive' in stream) {
        //     streamEndedEvent = 'inactive';
        // }
        ['ended', 'inactive'].forEach(ev => {
            stream.addEventListener(ev, () => {

                if (typeof this.stream != 'function' || !this.stream || !(this.stream().rtc || this.stream().screen)) {
                    callback();
                }
                callback = function () {
                };
            }, false);
            stream.getAudioTracks().forEach(track => {
                track.addEventListener(ev, () => {

                    if (typeof this.stream != 'function' || !this.stream || !(this.stream().rtc || this.stream().screen)) {
                        return;
                    }
                    callback();
                    callback = function () {
                    };
                }, false);
            });
            stream.getVideoTracks().forEach(track => {
                track.addEventListener(ev, () => {

                    if (typeof this.stream != 'function' || !this.stream || !(this.stream().rtc || this.stream().screen)) {
                        return;
                    }
                    callback();
                    callback = function () {
                    };
                }, false);
            });

        })

    }


    startCallWith(user, screen = false, auto_pick = false, picked = null) {
        if (screen && user.screen_status === 'standby') {
            user.screen_status = 'incall';
        }
        if (!screen && user.status === 'standby') {
            user.status = 'incall';
        }

        const callHimNow = (autoPick = null) => {

            /*if (!screen && (
                !this.config.webrtcSupported || !user.config.webrtcSupported
            )) {
                // console.log('Video/Audio call not supported in your browser. Please contact to administrator for more information.');
                return;
            }*/


            const name = '[' + (!screen ? 'call' : 'screenCall') + '][' + user.id + '][R-' + 1 + ']';


            const create = () => {
                const offer_id = Math.ceil(Math.random() * 10000000000);


                user.getConnection(!screen ? 'out' : 'screenOut', (out, ondone) => {
                    ondone();
                    //console.error('offer ending');

                    const stream = out._stream = !screen ? this.stream().rtc : this.stream().screen;
                    //console.error(stream);
                    if (stream == null) {
                        return user.status === 'standby';
                    }

                    if (stream.getTracks) {
                        for (const track of stream.getTracks()) {
                            out.addTrack(track, stream);
                        }
                    } else {
                        out.addStream(stream);
                    }

                    /*setTimeout(() => {
                        addRTCView(this.room, true);
                    }, 300);*/

                    // if stream closed by use disconenct call.
                    this.watchStreamClosed(stream, () => {
                        if (user.id) {
                            this.stopCallWith(user, screen, true);
                        }
                    });


                    // out.addStream(out._stream);
                    out.resetCandidateQueue();
                    console.log(" frank test offer creating.");
                    var options = {
                        iceRestart: true
                      };
                    out.createOffer(offer => {
                        //console.log(name+" offer created.");
                        offer = User.RTC.lineSettings(offer);
                        out.setLocalDescription(new RTCSessionDescription(offer), () => {
                            // share streams with others...

                            this.room.app.l && console.log(name + " offer sent.");

                            user.msg(!screen ? 'offer' : 'screen', {
                                call: offer,
                                callType: !screen ? this.stream_type.indexOf('video') > 0 ? 'video' : 'audio' : 'screen',
                                autoPick,
                                excluded_recording: this.room.excluded_recording,
                                caseId: this.room.data().id,
                                channel: this.room.data().channel,
                                createdBy: this.room.app.myself.id,
                                userType: this.room.app.myself.type

                            }, offer_id, answer => {
                                this.room.app.l && console.log(answer + " answer recevied..");

                                if (answer === 'permissions') {
                                    this.room.app.mainApp.showDialog({
                                        title: this.room.app.getTransMsg('Unable to Connect'),
                                        content: this.room.app.getTransMsg('Camera/Audio permissions were not given.')
                                    });

                                    this.onMsg(user, 'hangup', false);
                                    this.stopCallWith(user);
                                    if (typeof picked == 'function') {
                                        picked(false);
                                    }
                                    return;
                                }
                                if (answer === 'app_background') {
                                    let showAlert = true;
                                    let hangup = true;
                                    for (const ux of this.room.rtcUsers()) {
                                        if (ux && ux.user && ux.user.clients) {
                                            for (const k in ux.user.clients) {
                                                if (ux.user.clients[k].name === 'web' && ux.user.clients[k].online) {
                                                    showAlert = false;
                                                    if (ux === user) {
                                                        hangup = false;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if (showAlert) {
                                        this.room.app.mainApp.showDialog({
                                            title: this.room.app.getTransMsg('Unable to Connect'),
                                            content: this.room.app.getTransMsg('Cannot start video/audio call when user is in background state.')
                                        });
                                    }
                                    if (hangup) {
                                        this.onMsg(user, 'hangup', false);
                                        this.stopCallWith(user, screen, true, true);
                                        if (typeof picked == 'function')
                                            picked(false);
                                    }
                                    return;
                                }
                                if (answer === 'declined' || answer === 'hanged') {
                                    if (answer === 'declined') {

                                        let content = this.room.app.getTransMsg('The {userType} has declined your {reqType} request.', {
                                            reqType: (screen ? 'screen share' : (this.stream_type.indexOf('video') > 0 ? this.room.app.getTransMsg('video call') : this.room.app.getTransMsg('voice call'))),
                                            userType: this.room.app.type === 'backend' ? this.room.app.getTransMsg('agent') : this.room.app.getTransMsg('user')
                                        });

                                        this.room.app.mainApp.showDialog({
                                            title: this.room.app.getTransMsg('Unable to Connect'),
                                            content

                                        });
                                        this.stopRTCCall();

                                    }
                                    this.onMsg(user, 'hangup', false);
                                    this.stopCallWith(user, screen, this.room.rtcUsers().length <= 1, false);

                                    if (answer === 'declined' && typeof picked == 'function') {

                                        picked(false);
                                    }
                                    return;
                                }
                                if (typeof answer == 'string') {
                                    if (answer === 'busy') {
                                        this.room.app.mainApp.showDialog({
                                            title: this.room.app.getTransMsg('Unable to Connect'),
                                            content: this.room.app.type === 'backend' ? this.room.app.getTransMsg('The visitor is busy. Please try again later') : this.room.app.getTransMsg('All agents are busy. Please try again later')

                                        });
                                    }
                                    if (answer === 'timeout') {
                                        this.room.app.mainApp.showDialog({
                                            title: this.room.app.getTransMsg('Unable to Connect'),
                                            content: this.room.app.type === 'backend' ? this.room.app.getTransMsg('The visitor is not responding. Please try again later') : this.room.app.getTransMsg('Agent is not responding. Please try again later')

                                        });
                                    }
                                    if(['busy', 'timeout'].includes(answer)) {
                                        this.stopRTCCall();

                                        this.onMsg(user, 'hangup', false);
                                        this.stopCallWith(user, screen, true, false);
                                    }
                                    //console.error(answer);
                                    if (typeof picked == 'function') {
                                        picked(false);
                                    }
                                    return;
                                }
                                try {
                                    if(out.signalingState === 'closed') {
                                        return;
                                    }
                                    out.setRemoteDescription(new RTCSessionDescription(answer), () => {

                                        // console.log(name + " answer accepted.");
                                        if (typeof picked == 'function') {
                                            if(!this.room.isCallStarted())
                                                this.room.trigger('startCallTimer');
                                            picked(true);
                                        }
                                    }, err => {
                                        console.log(name + ' answer can\'t accepted.');
                                        console.error(answer);
                                        console.error(err);
                                        if (typeof picked == 'function') {
                                            picked(false);
                                        }
                                    });
                                } catch (e) {
                                    console.error('answer parse failed');
                                    console.error(answer);
                                    console.error(e);
                                    this.stopCallWith(user, screen, true, true);
                                }
                            });


                        }, function () {
                            console.log(name + ' offer can\'t set locally.');
                            console.error(arguments);
                        });

                    }, function () {
                        console.log(name + ' offer can\'t created.');
                        console.error(arguments);
                    }, {
                        offerToReceiveAudio: !screen && this.stream_type.indexOf('audio') > 0,
                        offerToReceiveVideo: screen || this.stream_type.indexOf('video') > 0,
                        /*'mandatory': {
                         'OfferToReceiveAudio': true,
                         'OfferToReceiveVideo': true
                         }*/
                    }, e => console.log(`got errror while creating offer ${e}`), options);

                    User.RTC.handleIceCandidates(out, name, candidate => {
                        // console.log(name + " candidate sent.");
                        user.msg(!screen ? 'candidateIn' : 'candidateScreenIn', candidate, offer_id, this.room && this.room.excluded_recording ? this.room.excluded_recording : false);
                    }, (err, success) => {
                        if (!success) {
                            console.error(err);
                        }
                    }, () => {

                    });
                }, true);
            };

            create();

            let rtcstr = this.stream().rtc;
            if (rtcstr) {
                let timer = null;
                const diposer = user.__rdiposer = this.on('stream-update', () => {
                    if (user.__rdiposer === diposer && (
                            user.status === 'joined' || user.status === 'incall') && this.stream().rtc && rtcstr !== this.stream().rtc
                    ) {
                        rtcstr = this.stream().rtc;
                        if (timer) {
                            clearTimeout(timer);
                        }
                        timer = setTimeout(create, 800);
                    }
                });
            }

        };
        // Make sure he is getting our video.. if he is not on standby
        const currentCaller = screen ? this.screenCaller : this.currentCaller;

        let lastState = user.state;
        //console.log(user, lastState);
        const watchUser = user.on('client-update', () => {
            // const lastCallState = (screen ? user.screen_status : user.status) != 'standby';
            if (currentCaller === (screen ? this.screenCaller : this.currentCaller)) {
                const newState = user.client.online;
                if (newState !== lastState) {
                    if (!newState) {
                        // user.status = 'standby';
                    } else if (newState) {
                        callHimNow((screen ? 'screen' : (user.stream_type.indexOf('video') >= 0 ? 'video' : (user.stream_type.indexOf('audio') >= 0 ? 'audio' : auto_pick))));
                    }
                    lastState = newState;
                }
            } else {
                //disposeKoItem(watchUser);
            }
        });

        callHimNow(auto_pick);
    }

    stopCallWith(user, screen = false, refreshStatus = true, broadcast = true) {
        if (screen) {
            user.screen_status = 'standby';
        } else {
            //user.status = 'standby';
        }

        if (user.stream() && user.stream().rtc && !screen) {
            let tagIdAudio = 'audio-stream-' + user.stream().rtc.id, tmpElementAudio = document.getElementById(tagIdAudio);
            if(tmpElementAudio){
                let tmpStreamAudio = tmpElementAudio.srcObject;
                if(tmpStreamAudio) {
                    tmpStreamAudio.getAudioTracks().forEach(track2 => {
                        track2.stop();
                    });
                }
                tmpElementAudio.remove();
            }

            user.stream().rtc.dispose();
        }
        if (user.stream && user.stream().screen && screen) {
            user.stream().screen.dispose();
        }

        if (broadcast) {
            user.msg('hangup', screen);
        }

        try {
            user.getConnection(!screen ? 'out' : 'screenOut', c => {
                if (c) {
                    c.dispose();
                }
            }, false, true);
            user.getConnection(!screen ? 'in' : 'screenIn', c => {
                if (c) {
                    c.dispose();
                }
            }, false, true);
        } catch (e) {
        }

        if (refreshStatus) {
            if (screen) {
                this.room.refreshMyScreenStatus();
            } else {
                this.room.refreshMyRTCStatus();
            }
        }
        user.streamLoopCounter = 0;
    }


    pickUserScreen(user, payload, cb) {

        var startPick = (accept = false) => {

            var name = "[pick-screen][" + user.user().name + "][R-0]";
            user.getConnection('screen', (inc, ondone) => {
                this.screen_call(2);
                ondone();

                User.RTC.handleIceCandidates(inc, name, (candidate) => {
                    user.msg('candidateScreenOut', candidate);
                });

                inc.setRemoteDescription(new RTCSessionDescription(payload.call), () => {
                    inc.createAnswer((answer) => {
                        answer = User.RTC.lineSettings(answer);
                        inc.setLocalDescription(answer, () => {

                            // send the answer to a server to be forwarded back to the caller (you)*/

                            cb({type: 'answer', sdp: answer.sdp});
                            //this.status = 'connected';

                        }, function () {
                            console.error(arguments);
                        });
                    }, function () {
                        console.error(arguments);
                    }, {
                        'mandatory': {
                            'OfferToReceiveAudio': true,
                            'OfferToReceiveVideo': true
                        }
                    });
                }, function () {
                    console.error(arguments);
                });
            }, true);
        };

        startPick(true);
    }

    pickUserRTC(user, payload, cb, screen = false, offer_id) {
        if (!this.config.webrtcSupported && !screen) {
            cb(this.room.app.getTransMsg('Client browser not supported video/audio call.'));
            return;
        }

        // this.room.trigger('client-updated');

        if (typeof this.room.app !== 'undefined') {
            const rtcroom = this.room.app.activeRoomInRTC();
            const activeRoom = rtcroom && rtcroom.inCall() && rtcroom.myself.shouldWePickCall === null ? rtcroom : null;
            const activeRoomAlert = rtcroom && rtcroom.shouldWePickCall !== null ? rtcroom : null;

            if (activeRoom) {
                if (this.room !== activeRoom) {
                    cb('busy');
                    return;
                }
            }

            if (activeRoomAlert) {
                if (this.room !== activeRoomAlert) {
                    cb('busy');
                    return;
                }
            }
            setTimeout(() => {
                addRTCView(user.room, true);
            }, 300);
        }


        const startPick = () => {
            const prest = this.status;
            // console.error(prest + '----' + prest);


            if (screen && this.screen_status === 'standby') {
                this.screen_status = 'incall';
            }

            setTimeout(() => {
                this.room.app.frameMananger.checkOperation('webrtc', reload => {
                });
                ;
            }, 1000);

            const name = '[' + (!screen ? 'pick' : 'screenPick') + '][' + user.id + '][R-0]';

            this.room.app.l && console.log(name + " offer received...");

            setTimeout(() => {
                user.room.state('connecting');
                this.room.app.status('rtc');
                addRTCView(user.room, true);
            }, 300);

            user.getConnection(!screen ? 'in' : 'screenIn', (inc, done) => {

                if (payload.callType === 'audio') {
                    inc.filterCandidates = 'video';
                }
                inc.resetCandidateQueue();
                User.RTC.handleIceCandidates(inc, name, candidate => {
                    // console.log(name + " candidate sent.");
                    user.msg(!screen ? 'candidateOut' : 'candidateScreenOut', candidate, offer_id);
                }, success => {
                    // restart proccess..
                    if (success) {

                    }
                }, null);

                inc.setRemoteDescription(new RTCSessionDescription(payload.call), () => {

                    this.room.app.l && console.log(name + " offer accepted...");
                    done();
                    inc.createAnswer(answer => {
                        answer = User.RTC.lineSettings(answer);
                        inc.setLocalDescription(answer, () => {
                            this.room.app.l && console.log(name + " answer sent...");
                            cb({type: 'answer', sdp: answer.sdp});

                            screen ? user.screen_status = 'joined' : user.status = 'joined';

                        }, function () {
                            console.error(arguments);
                        });
                    }, function () {
                        console.error(arguments);
                    }, {
                        mandatory: {
                            OfferToReceiveAudio: true,
                            OfferToReceiveVideo: true,
                        },
                    });
                }, function () {
                    console.error(arguments);
                });
            }, true);
        };

        if (this.status === 'joined') {
            startPick();
        } else {
            const inviteUser = (callback, autoPick = null) => {
                const check = (type, cbx) => {
                    if (type === 'declined') {
                        cb('declined');
                        cbx(false);
                        this.stopRTCCall();
                    } else {
                        User.RTC.getUserMediaStreams(this.room.app, this.room.data().id, type, (err, streams, _type) => {
                            if (err) {
                                cb('permissions');
                                cbx(false);
                            } else {
                                cbx(_type);
                            }
                        });
                    }
                };

                if (autoPick) { // test
                    setTimeout(() => {
                        check(autoPick === true ? payload.callType : autoPick, callback);
                    }, 0);
                } else {
                    if (this.shouldWePickCall && this.shouldWePickCall.queue) {
                        this.shouldWePickCall.queue.push(callback);
                    } else {
                        this.shouldWePickCall = {
                            typeText: payload.callType,
                            type: payload.callType,
                            from: user.user.first_name,
                            cb: type => {
                                const queue = this.shouldWePickCall.queue;
                                this.shouldWePickCall = false;

                                this.shouldWePickCall = null;

                                check(type, resp => {
                                    if (resp === 'audio' || resp === "video") {
                                        this.room.app.status('rtc');
                                        this.room.state('connected');
                                        this.status = 'incall';
                                    }
                                    for (const q of queue) {
                                        q(resp);
                                    }
                                });
                            },
                            queue: [callback],
                        };
                        this.trigger('shouldWePickCall');
                    }
                }
            };

            let callback = 'required';

            // console.error(payload.autoPick);
            if (screen || (!payload.autoPick && this.room.app.settings().oneway_audio_video_support !== 'undefined' && this.room.app.settings().oneway_audio_video_support === '1' && this.room.app.mainApp.type === 'frontend'))
                callback = 'one_way'; // we support one_way only for screen.


            // if any on call already, no need to ask just join instant.
            if (screen && this.screen_status === 'joined') {
                callback = 'one_way';
            }
            if (!screen && this.status === 'joined') {
                callback = 'one_way';
            }

            if (callback === 'required') {

                inviteUser(tes => {
                    if (tes === 'video') {
                        this.startRTCCall(true, null, false, true, false);
                    } else if (tes === 'audio') {
                        this.startRTCCall(false, null, false, true, false);
                    } else {
                        return cb(tes);
                    }
                    startPick();
                }, payload.autoPick);
            } else if (callback === 'one_way') {
                this._one_way_called = true;
                if (!screen && this.status === 'standby') {
                    this.status = 'incall';
                }
                startPick();
            }
        }
    }


    /**
     *
     * @param key forever required..
     * @param cb when connection object is ready...
     * @param forcenew when forcing to create new object.. (if forced old cbs and conn will removed.. any pending cbs will triggered if no old conn is there)
     * @returns {*}
     */
    getConnection(key, cb, forcenew = false, quick = false) {

        if (!RTCHelper.webrtcSupported) {
            return null;
        }
        let conn = this.connections[key];


        // Create new at all.
        if (forcenew) {

            // Dispose exiting one..
            // there is an old connections avial. so there can't be any pending handlers..
            if (conn && conn[0]) {
                conn[0].dispose();
                conn = null;
            }

            if (window.location.href.indexOf('removeStunTurn') >= 0) {
                RTCHelper.PeerConnectionConfig = {
                    iceServers: [
                        {urls: ['stun:stun.l.google.com:19302']},
                        {urls: ['stun:stun1.l.google.com:19302']},
                        {urls: ['stun:stun2.l.google.com:19302']},
                    ],
                };
            }


            // Init Connection
            // @ts-ignore
            const connection = new RTCPeerConnection(RTCHelper.PeerConnectionConfig, RTCHelper.PeerConnectionOptions);


            connection.onsignalingstatechange = function () {
                /// console.error('signalingState:'+connection.signalingState);
            };
            connection.onicegatheringstatechange = function (event) {
                /// console.error('iceGatheringState:'+connection.iceGatheringState);

            };

            connection.oniceconnectionstatechange = function (event) {
                // console.error('iceConnectionState:'+connection.iceConnectionState);
                // out.signalingState);
                if (connection.iceConnectionState === "failed") {
                    console.log("ice failed and reset ice"); 
                    connection.restartIce();
                }
            };

            // connection.streams=[];
            /*connection.ontrack=(e)=>{
                let strm=e.streams[0];

            };*/
            let _candidateQueue = [];
            const _setRemoteOld = connection.setRemoteDescription;
            connection.filterCandidates = null;
            connection.resetCandidateQueue = function () {
                // console.error("resetCandidateQueue:");
                _candidateQueue = [];
            };
            connection.setRemoteDescription = function () {
                _setRemoteOld.apply(this, arguments);
                for (const k of _candidateQueue) {
                    k();
                }
                // console.error("setRemoteDescription:");
                _candidateQueue = {
                    push: cb => {
                        cb();
                    }
                };
            };
            connection.addCandidate = payload => {
                // console.error("remote-candidate:"+payload);
                if (payload == null) {
                    return;
                }
                // console.log('REMOTE: '+(payload && payload.candidate?payload.candidate:''));
                _candidateQueue.push(() => {
                    if (connection.filterCandidates && payload.sdpMid && payload.sdpMid.indexOf(connection.filterCandidates) >= 0) {
                        return;
                    }
                    if (payload && payload.candidate) {
                        // console.error("remote-candidate-added:"+payload.candidate);
                        connection.addIceCandidate(payload && payload.candidate ? new RTCIceCandidate(payload) : null)
                                .then(() => {
                                }, err => {
                                    console.error(' failed to add ICE Candidate: ' + err.toString());
                                    console.error(payload);
                                    console.error(err);
                                });
                    }
                });
            };

            connection.ontrack = e => {
                const strm = e.streams[0];
                this.room.app.l && console.error('track added stream:' + strm.id);
                strm.dispose = () => {
                    // console.log('DISPOSING Media streams..');
                    try {
                        if (strm.getTracks().length && strm.getTracks()[0].stop) {
                            strm.getTracks().forEach(track => {
                                track.stop();
                            });
                        }
                    } catch (e) {
                    }
                    try {
                        strm.stop();
                    } catch (e) {
                    }
                    if (strm.onended) {
                        strm.onended();
                    }
                };
                // connection.streams.push(obj);
                if (key === 'out') {
                    return;
                }

                if (key === 'screenIn' || key === 'screenOut') {
                    this.stream({screen: strm});
                } else {
                    this.stream({rtc: strm});
                    this.trigger('call-update');
                }
            };
            // this.enableSpeedMeter(false,this.remote);
            connection.dispose = () => {
                // TODO::
                // console.error('disposed: '+key);
                try {
                    /*$.each(connection.streams,(i,e)=>{
                        if (e.onended)
                            e.onended();
                    });*/
                    delete this.connections[key];
                    connection.close();

                    if (connection._dispose) {
                        connection._dispose.dispose();
                    }
                    connection = null; 
                } catch (e) {
                }
            };


            // Give this connection back..
            cb(connection, () => {
                // We are ready to execude any pending handlers now..
                const conn = this.connections[key];
                if (conn && conn[1] && conn[1].length > 0) {
                    for (let e of conn[1]) {
                        e(connection);
                    }
                } else {
                }
                this.connections[key] = [
                    connection,
                    [], // pending cb list... which will never fill from now.
                ];
            });

        } else {

            if (!conn) {
                conn = [null, []];
                this.connections[key] = conn;
            }
            if (quick && conn && !conn[0]) {
                return cb(null);
            }

            if (conn && conn[0]) {
                cb(conn[0]);
            } else {
                // create emply cb list.. so when connection is init we can give them back..
                if (conn[1]) {
                    conn[1].push(cb);
                }
            }
        }
    }


    remove() {

    }

    trackEvents() {
        this.on('ping', payload => {
            // console.log('got msg from:'+this.id+' value:'+payload);
        });

        const device_mute_handler = type => {
            return payload => {
                if (this._stream) {
                    this._stream[type] = payload;
                    this[type] = payload;
                    this.trigger('stream-update');
                }
            };
        };
        this.on('video_mute', device_mute_handler('video_mute'));
        this.on('audio_mute', device_mute_handler('audio_mute'));
        this.on('screen_mute', device_mute_handler('screen_mute'));

        this.on('rotate', payload => {
            if (!this.room.app.isIOS) {
                if (this._stream) {
                    this.rotation = (payload);
                }
            }
        });

        this.on('rtc_full_screen', payload => {
            if (!this.room.app.isIOS) {
                if (payload) {
                    this.room.app.popUpMananger.sections.push('rtcroom');
                } else {
                    this.room.app.popUpMananger.sections.remove('rtcroom');
                }
            }
        });
        this.on('screen_full_screen', payload => {
            if (payload) {
                this.room.app.popUpMananger.sections.push('screen');
            } else {
                this.room.app.popUpMananger.sections.remove('screen');
            }
        });

        this.on('hangup', payload => {
            if (!payload && this.stream && this.stream().rtc) {
                this.stream().rtc.dispose();
                this.stream({rtc: null});
            }
            if (payload && this.stream && this.stream().screen) {
                this.stream().screen.dispose();
                this.stream({screen: null});
            }
            this.trigger('stream-update');

            this.getConnection(payload ? 'screenIn' : 'in', c => {
                if (c) {
                    c.dispose();
                }
            }, false, true);
            this.getConnection(payload ? 'screenOut' : 'out', c => {
                if (c) {
                    c.dispose();
                }
            }, false, true);

            if (payload) {
                this.screenCaller = null; // no more retry..
                this.screen_status = 'standby';
                this.room.refreshMyScreenStatus();
            } else {
                this.currentCaller = null;  // no more retry..
                this.status = 'standby';
                this.room.refreshMyRTCStatus();
            }
            this.shouldWePickCall = false;
            this.room.myself.shouldWePickCall = false;
            this.shouldWePickCall = null;
            this.room.myself.shouldWePickCall = null;
            this.trigger('shouldWePickCall');
            this.room.myself.trigger('shouldWePickCall');

            // this.room.myself.status = 'standby';
        });

        this.on('my_config', payload => {
            if (payload[1]) {
                const c = this.config;
                c[payload[0]] = payload[1];
                this.config = c;
            }
        });

        // console.log('offer listening');
        this.on('offer', (payload, offer_id, cb) => {
            if (this.room.app.type === 'frontend') {

                const storageKey = `is_call_started_${this.room.app.myself.id}`;
                const cookieData = Utils.getCookie(storageKey);
                if (cookieData && cookieData === 'true') {
                    payload.autoPick = true;
                }
                this.room.myself.pickUserRTC(this, payload, cb, false, offer_id);
                if (this.room.app.mainApp.status() === 'noui') {
                    this.room.app.mainApp.max()

                }


            } else {
                this.room.myself.pickUserRTC(this, payload, cb, false, offer_id);
            }

        });

        this.on('screen-share-request', cb => {
            const start = () => {
                if (this.room && this.room.myself) {
                    this.room && this.room.myself.startScreenShare();
                }
            };

            const okClick = (e) => {
                start();
            }
            const cancelClick = (e) => {
                cb(false);
            }

            const acceptBtnLbl = this.room.app.getTransMsg('Accept');
            const cancelBtnLbl = this.room.app.getTransMsg('Cancel');

            if (this.room.app.mainApp.type === 'backend') {
                const buttons = [
                    {
                        action: 'ok',
                        label: acceptBtnLbl,
                        isPrimary: true,
                        onClickAndClose: okClick
                    },
                    {
                        action: 'cancel',
                        label: cancelBtnLbl,
                        isPrimary: false,
                        onClickAndClose: cancelClick
                    }
                ];

                this.room.app.mainApp.showDialog({
                    title: this.room.app.getTransMsg('Audio Auto-Play Disabled'),
                    content: this.room.app.getTransMsg('Audio Auto play not allowed by your browser. So please click play now  button to start Audio.'),
                    buttons
                });
            }else{
                this.room.app.mainApp.dialog.confirm({
                    title: this.room.app.getTransMsg('Screen Share Requested'),
                    description: this.room.app.getTransMsg('Agent has requested for you to share your screen. Click \'Accept\' to begin the screen share.'),
                    onClose: cancelClick,
                    okButtonText: acceptBtnLbl,
                    cancelButtonText: cancelBtnLbl,
                    okClick,
                });
            }
        });

        this.on('screen', (payload, offer_id, cb) => {
            this.room.myself.pickUserRTC(this, payload, cb, true, offer_id);
        });
        this.on('candidateIn', (payload, cb) => {
            const name = '[pick][' + this.user.id + '][R-X]';
            // console.error(name+' candidate received.');
            this.getConnection('in', conn => {
                conn.addCandidate(payload);
            });
        });
        this.on('candidateScreenIn', (payload, cb) => {
            this.getConnection('screenIn', conn => {
                this.room.isScrenShareWait(false);
                conn.addCandidate(payload);
            });
        });

        this.on('candidateScreenOut', (payload, cb) => {
            this.getConnection('screenOut', conn => {
                conn.addCandidate(payload);
            });
        });
        this.on('candidateOut', (payload, cb) => {
            this.getConnection('out', conn => {
                const name = '[call][' + this.user.id + '][R-X]';
                // console.log(name+' candidate received.');
                conn.addCandidate(payload);
            });
        });
    }

    isRotateVideoSupport(b) {
        return false;
    }
}
