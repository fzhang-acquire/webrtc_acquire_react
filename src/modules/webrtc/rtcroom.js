import * as ReactDOM from "react-dom";
import P2PModule from '../p2p-channel/p2p_module';
import RTCHelper from './rtcroom_helper.js';
import User from './rtcroom_user.js';
import {isActive} from "../../libs/utils";
import {renderLayout} from "../../../views/common";
import CameraSettings from "../../../views/components/CameraSettings";
import {cameraSettingsCSS} from "../../core/helpers/addCSS";
import {addRTCViewFullScreen} from "../../core/helpers/addRTCView";

export default class RTCRoom extends P2PModule {
    constructor(app, thread, channel, type, resume = false) {
        super(app, thread, channel);

        this.media_settings = new RTCHelper.MediaSettings(app);
        this.call_sound = null;
        this.call_outgoing_sound = null;
        this.app.getSound('call', audi => {
            this.call_sound = audi;
        });
        this.app.getSound('call-ringing-out', callRinging => {
            this.call_outgoing_sound = callRinging;
        });

        this.state = this.stateObservable('disconnected', `${this.id}.state`);
        this.callType = this.stateObservable(type, `${this.id}.callType`);
        this.isPopupEnabled = this.stateObservable(false, `${this.id}.isPopupEnabled`);
        this.isPopupFullScreenEnabled = this.stateObservable(false, `${this.id}.isPopupFullScreenEnabled`);
        this.availableUsersForCall = this.stateObservable([], `${this.id}.availableUsersForCall`);
        this.fullscreen = this.stateObservable(false, `${this.id}.fullscreen`);

        this.switchCheck = this.stateObservable(false, `${this.id}.switchCheck`);
        this.settingsPopup = this.stateObservable(false, `${this.id}.settingsPopup`);

        this.isCallStarted = this.stateObservable(false,`${this.id}.isCallStarted`);
        this.config = {
            webrtcCoreSupported: RTCHelper.webrtcSupported,
            webrtcHttp: location.href.indexOf('https://') === 0 || location.href.indexOf('://localhost') >= 0,
        };

        this.recording = this.app.mainApp.getSetting('cobrowse.enable_video_recording');
        this.recording = true; // this.recording == '1' || this.recording == 'on';
        this.resume = resume;

        this.checkActiveUsers();
        this.inCall = () => {
            if (this.myself) {
                return this.myself.status !== 'standby';
            }
            return false;
        }

        this.rtcUsers = () => {
            const arr = [];
            for (const client of this.users()) {
                if ((client.status === 'joined' || client.status === 'incall') && arr.indexOf(client) < 0) {
                    arr.push(client);
                } else if ((client.status !== 'joined' && client.status !== 'incall') && arr.indexOf(client) >= 0) {
                    arr.remove(client);
                }
            }
            return arr;
        };

        this.rtcAUsers = () => {
            return this.rtcUsers().filter(client => {
                return this.app.activeRoomInRTC() !== client.room;
            });
        };

        this.onDisposeCbs.push(this.fullscreen.subscribe(() => {
            if (this.app.mainApp.type !== 'contact') {
                if (this.fullscreen()) {

                    if (this.app.mainApp && typeof this.app.mainApp.trigger !== "undefined" && typeof this.data().id !== 'undefined') {
                        this.app.mainApp.trigger('needToReloadChatView', this.chat.data().id);
                        this.app.mainApp.trigger('activeDynamicTab', 'dynamic-tab-rtc-fullscreen', {
                            threadId: this.data().current_thread_id
                        });

                    }
                } else {
                    this.app.mainApp.trigger('activeDynamicTab', 'ACTIVE_DEFAULT_TAB');
                    this.app.mainApp.trigger('needToReloadChatView', this.data().id);
                }
            }
        }));

        this.onDisposeCbs.push(this.app.on('thread-data-updated', (threadId, data) => {
            if(threadId && threadId === this.data().threadId){
                if (data) {
                    this.data(data);
                }
            }
        }));

        this.onDisposeCbs.push(this.settings_update = function () {
            if (this.myself && this.incall && this.myself.__last_hash !== this.media_settings.getHash()) {
                this.myself.updateStreams();
            }
            this.settingsPopup(false);
        });

        this.onDisposeCbs.push(this.settingsPopup.subscribe((val) => {
            if (val) {
                if (this.app.mainApp.type === 'contact' && typeof this.app.mainApp.pushToGoogleAnalyticsEvent === 'function') {
                    this.app.mainApp.pushToGoogleAnalyticsEvent('audio_video_setting', 'click', 'Audio Video Setting');
                }
                const content = document.createElement('div');
                content.setAttribute('id', `${this.id}_setting_view`);
                let buttons;
                this.media_settings.checkDevices(() => {
                    if (this.app.type === 'backend') { //ASK FOR LATER RAJU JI
                        buttons = [
                            {
                                action: 'Close', label: 'Save', isPrimary: true, onClickAndClose: (e) => {
                                    this.media_settings.stopStreams();
                                    this.settings_update();
                                }
                            }
                        ];

                        this.app.mainApp.showDialog({
                            htmlrender: true,
                            title: 'Switch preferred camera and microphone',
                            content,
                            onClose: () => {
                                this.media_settings.stopStreams();
                                this.settingsPopup(false);
                                ReactDOM.unmountComponentAtNode(content);
                            },
                            buttons: buttons,
                            overflow: true,
                            onRender: () => {
                                let doc = document;
                                cameraSettingsCSS(this.app, doc);
                                renderLayout(this.app, this.app.store, content, CameraSettings, `${this.id}_setting_view`);
                            }

                        });
                    } else {
                        this.app.mainApp.dialog.save({
                            htmlrender: true,
                            title: 'Switch preferred camera and microphone',
                            content,
                            onClose: () => {
                                this.media_settings.stopStreams();
                                this.settingsPopup(false);
                                ReactDOM.unmountComponentAtNode(content);
                            },
                            saveButtonText: "Save",
                            overflow: true,
                            onSave: () => {
                                this.media_settings.stopStreams();
                                this.settings_update();
                                ReactDOM.unmountComponentAtNode(content);

                            },
                            onRender: (doc, win) => {
                                cameraSettingsCSS(this.app, doc);
                                renderLayout(this.app, this.app.store, content, CameraSettings, `${this.id}_setting_view`);
                            }

                        });

                    }
                });


            }
        }));

        this.onDisposeCbs.push(this.isPopupEnabled.subscribe((val) => {
            if (val) {
                addRTCViewFullScreen(this, true);
                if (this.type === 'frontend' && typeof this.mainApp.pushToGoogleAnalyticsEvent === 'function') {
                    this.mainApp.pushToGoogleAnalyticsEvent('screen_maximize', 'click', 'Audio/video Screen Maximize')
                }
            } else {
                addRTCViewFullScreen(this, false);
                if (this.type === 'frontend' && typeof this.mainApp.pushToGoogleAnalyticsEvent === 'function') {
                    this.mainApp.pushToGoogleAnalyticsEvent(`screen_minimize`, 'click', 'Audio/video Screen Minimize')
                }

            }

        }));

        this.onDisposeCbs.push(this.isPopupFullScreenEnabled.subscribe((val) => {
            if (val) {
                let element = document.querySelector('.rtc-tray-fullscreen');
                if(element){
                    element.classList.add('rtc-large-sc');
                }
            }else{
                let element = document.querySelector('.rtc-tray-fullscreen');
                if(element){
                    element.classList.remove('rtc-large-sc');
                }
            }

        }));

        this.onDisposeCbs.push(this.app.currentThread.subscribe(thread => {
            if( this.data() == null || thread == null){
                return;
            }
            if(parseInt(thread.threadId) === parseInt(this.data().threadId)) {
                this.data(thread);
                this.createThreadUsersList(false, thread);
                setTimeout(() => {
                    this.trigger('client-updated');
                }, 1000);
            }
        }));

        this.onDisposeCbs.push(
            this.on('startCallTimer', () => {
                this.isCallStarted(true);
                if(this.call_outgoing_sound) {
                    this.call_outgoing_sound.loop = false;
                    this.call_outgoing_sound.pause();
                    this.call_outgoing_sound.currentTime = 0;
                    this.audioPlayed = false;
                }
            })
        )
    }

    checkActiveUsers(){
        isActive(this.app, this.thread, (this.app.type === 'backend' ? 'contact' : 'user')).then(users => {

            if (users && Array.isArray(users) && users.length > 0) {

                let filteredUser = users.filter(u => {
                    let uKey = `${u.type}-${u.id}`;
                    if(!this.invitedUsers.includes(uKey)){
                        this.invitedUsers.push(uKey);
                        return true;
                    }else{
                        return false;
                    }
                });

                this.app.signal(filteredUser, "askAvailableForCall", { roomId: this.id, threadId: this.thread.threadId, contactId: this.thread.contactId, type: this.callType() }).then(null);
                this.stopRequest = false;

                const temp = users.map((user) => {
                    user.available = true; //set all users to available in starting
                    return user;

                })


                this.availableUsersForCall(temp);

                this.respAvailableTimeOut = setTimeout(() => {
                    /*if (this.peerClients.length === 0) {
                        this.trigger('disconnect')
                    }*/

                }, 10000)


            } else {

                if(this.app.type === 'frontend') {
                    let content = `${this.app.type === 'frontend' ? 'All agents are' : 'Contact is'} busy at the moment , Please try again in short time`;

                    this.app.mainApp.showDialog({
                        title: 'Unable to Connect',
                        description: content

                    });
                }
                this.myself && this.myself.stopRTCCall();
            }

        }).catch(err => {console.error(err);});
    }


    addUser(type, id, browsingUrl) {
        setTimeout(() => {
            this.trigger('client-updated');
        }, 1000);

    }

    static getName() {
        return 'rtcroom';
    }

    getUserClass() {
        return User;
    }

    refreshMyRTCStatus() {
        // if everybody is on standby then i am on standby too..  or visitor is on standby then i am on sytandby to
        let e = false;
        for (const ed of this.users()) {
            if (ed.status === 'joined' || ed.status === 'incall') {
                e = true;
            }
        }


        for (const ed of this.users()) {
            if (ed.user.type === 'contact' && ed.status === 'standby') {
                e = false;
            }
        }

        if (!e && this.myself) {
            this.myself.status = 'standby';
            this.myself.stopRTCCall(false);
            this.app.trigger('callEnd', this);
        }

        this.fullscreen(false);

    }
    refreshMyScreenStatus() {

    }

    isSignalingNeeded(){
        return this.app.activeRoomInRTC() && this.app.activeRoomInRTC().inCall();
    }

    stopSignaling(){
        if(!this.isSignalingNeeded()) {
            if(this.unsubsignal) {
                //console.log('signaling-signal sub dispose');
                this.unsubsignal.dispose();
            }
            if(this.keepalive)
                clearInterval(this.keepalive);
            this.app.mainApp.socket.server.emit('signaling-signal', this.data().id, false);
        }
    }

    startSignaling(cb) {
        if (this.app.type === 'frontend') {
            setTimeout(() => {
                this.app.trigger('signaling-signal', true);
                this.app.p2p.if('ready', () => {
                    cb(true)
                });
            }, 0);
            return;
        }

        this.app.mainApp.socket.server.emit('signaling-signal', this.data().contactId, true, (online) => {
            cb(online);
            if (online) {
                if (this.unsubsignal) {
                    this.unsubsignal.dispose();
                }
                if (this.keepalive)
                    clearInterval(this.keepalive);
            }
        });
    }

    restoreStates() {
        const _skips = ['users'];
        for (let key in this) {
            if (_skips.indexOf(key) !== -1) continue;
            if (this[key] && this[key].reset && typeof this[key].reset === 'function') {
                this[key].reset();
            }
        }
        this.invitedUsers = [];
    }

    onDispose() {
        if (this.call_sound) {
            this.call_sound.pause();
        }
        if(this.call_outgoing_sound){
            this.call_outgoing_sound.pause();
        }
        this.media_settings.onDispose();
        if (this.myself && this.myself()) {
            this.myself().stopRTCCall();
            this.myself().stopScreenCall();
        }
        for (let cb of this.onDisposeCbs)
            if(typeof cb === 'function') cb();

        this.onDisposeCbs = [];
        this.restoreStates();
        super.onDispose();
    }

}
