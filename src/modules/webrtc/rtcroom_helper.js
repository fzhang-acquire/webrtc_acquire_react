//require("./libs/adapter.js");

const webrtcSupported = (typeof RTCPeerConnection !== 'undefined' && RTCPeerConnection !== null);

class MediaSettings {
    constructor(app) {
        this.app = app;

        this.audioInputs = [];
        this.audioOutputs = [];
        this.videoCameras = [];

        this.qualityList = [{
            id: 'low',
            label: 'Low',
        }, {
            id: 'high',
            label: 'High',
        }];

        this.sampleVideoElement = null;


        this.deviceDefaultComputed = function(name, list, def= null) {
            let savedDevice = undefined;
            try {
                savedDevice = localStorage.getItem(name + '-device-rtc');
            }catch (e) {

            }
            let saved = savedDevice || def;
            return (value = 'NA') => {
                if (value !== 'NA') {
                    saved = value || null;
                    if (value === null)
                        localStorage.removeItem(name + '-device-rtc');
                    else
                        localStorage.setItem(name + '-device-rtc', value);
                }
                for (const d of list)
                    if (d.id === saved)
                        return d.id;
                return saved;
            };
        };

        this.stream_dispose = [];
        this.audioInputDefault = this.deviceDefaultComputed('audio', this.audioInputs);
        this.audioOutputDefault = this.deviceDefaultComputed('speaker', this.audioOutputs);
        this.videoCameraDefault = this.deviceDefaultComputed('video', this.videoCameras);
        this.videoQualityDefault = this.deviceDefaultComputed('quality', this.qualityList, app.settings().hdClient === 0 ? 'low' : 'high', 'high');

        this.sampleVideoElementUpdate = () => {
            const video = this.sampleVideoElement;
            const audioInput = this.audioInputDefault();
            const audioOutput = this.audioOutputDefault();
            const videoInput = this.videoCameraDefault();

            if (video) {
                const constraints = {
                    audio: {deviceId: audioInput ? {exact: audioInput} : undefined},
                    video: {deviceId: videoInput ? {exact: videoInput} : undefined},
                };
                for (const k of this.stream_dispose)
                    k();
                navigator.mediaDevices.getUserMedia(constraints).
                then(stream => {
                    for (const k of this.stream_dispose)
                        k();
                    this.stream_dispose.push(() => {
                        if (stream == null) return;
                        try {
                            if (stream.getTracks().length && stream.getTracks()[0].stop) {
                                stream.getTracks().forEach(track => {
                                    track.stop();
                                });
                            }
                        } catch (e) {}
                        try {
                            stream.stop();
                        } catch (e) {}
                        stream = null;
                    });
                    video.srcObject = stream;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.muted = true; 
                    if (typeof video.sinkId !== 'undefined' && audioOutput) {
                        video.setSinkId(audioOutput)
                                .then(() => {
                                    // console.log('Success, audio output device attached: ' + audioOutput);
                                })
                                .catch((error) => {
                                    let errorMessage = error;
                                    if (error.name === 'SecurityError') {
                                        errorMessage = 'You need to use HTTPS for selecting audio output ' +
                                                'device: ' + error;
                                    }
                                    // console.error(errorMessage);
                                    this.audioOutputDefault(null);
                                    // Jump back to first output device in the list as it's the default.
                                });
                    }
                }).catch(error => {
                    console.error('navigator.getUserMedia error: ', error);
                });
            }
        };


        this.checkDevices = cb => {
            navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
                const a = []; const b = []; const c = [];

                for (const device of deviceInfos) {
                    if (device.kind === 'audioinput') {
                        a.push({
                            id: device.deviceId || device.id,
                            label: device.label || 'Microphone ' + (a.length + 1),
                        });
                    } else if (device.kind === 'audiooutput') {
                        if (/Edge/.test(navigator.userAgent))
                            continue;
                        b.push({
                            id: device.deviceId || device.id,
                            label: device.label || 'Speaker ' + (b.length + 1),
                        });
                    } else if (device.kind === 'videoinput') {
                        c.push({
                            id: device.deviceId || device.id,
                            label: device.label || 'Camera ' + (c.length + 1),
                        });
                    }
                }

                this.audioInputs = a;
                this.audioOutputs = b;
                this.videoCameras = c;

                this.sampleVideoElementUpdate();
                cb();
            }).catch(e => {
                console.error(e);
            });
        };

        this.stopStreams = () => {
            for (const k of this.stream_dispose)
            k();

        }

    }

    getHash() {
        const audioInputDevice = localStorage.getItem('audio-device');
        const videoInputDevice = localStorage.getItem('video-device');
        const HD = typeof cobrowse === 'undefined' || (this.app.settings() && this.app.settings().video_recording == '0');
        const hash = audioInputDevice + '-' + videoInputDevice + '-' + (HD ? 1 : 0);

        return hash;
    }

    onDispose() {
        for (const k of this.stream_dispose)
            k();
    }
}

class RTCHelper {
    static webrtcSupported;
    static PeerConnectionConfig;
    static PeerConnectionOptions;
    static MediaSettings;
    static forceTurnServer;


    static checkFirefoxExtInstalled(cb) {
        const req = Math.random();
        window[req] = function(fireFoxInstalled) {
            if (fireFoxInstalled === 1 || fireFoxInstalled === '1')
                cb(true);
            else {
                // hj
                cb(false);
            }
        };
        window.parent.parent.postMessage('cocomm' +
            '__sendMessgeBack(' +

            '\'window[\\\'' + req + '\\\'](\'+(document.body.classList.contains(\'ff-tagove-ext-installed\')?1:0)+\')\'' +

            ');',
        '*');
    }

    static getScreenShareSource(callback) {
        const ua = navigator.userAgent.toLowerCase();
        const isAndroid = ua.indexOf('android') > -1;

        const constraints = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'screen',
                    mediaSource: 'screen',
                    maxWidth: 1920,
                    maxHeight: 1080,
                    //  minAspectRatio: 16/9,
                },
                optional: [],
            },
        };
        if (RTCHelper.isFirefox) {
            constraints.video = {
                mozMediaSource: 'screen',
                mediaSource: 'screen',
                // maxWidth: 1920,
                // maxHeight: 1080,
                // minAspectRatio: 16/9,
            };

            callback( constraints);
            return;
        }
        if (RTCHelper.isChrome && isAndroid) {
            callback(constraints);
            return;
        }

        callback(constraints);
    }

    static getUserMediaStreams(app, chat_id, type, cb, force= false, screenId= null, room= null) {
        // force=true;

        const HD = typeof cobrowse === 'undefined' || (app.settings() && app.settings().video_recording == '0');
        // console.error(HD);
        let audioInputDevice = localStorage.getItem('audio-device');
        let videoInputDevice = localStorage.getItem('video-device');
        const hash = audioInputDevice + '-' + videoInputDevice + '-' + (HD ? 1 : 0);

        const exiting = RTCHelper.streams[type + '-' + chat_id];
        if (exiting && exiting.hash !== hash)
            force = true;

        if (!force && exiting && !exiting.ended && exiting.active !== false && !screenId) {
            if (typeof exiting == 'function') {
                exiting(cb);
            } else {
                return cb(null, exiting, type);
            }
            return;
        }
        if (exiting && exiting.dispose) {
            exiting.dispose();
        }
        const cbs = [];
        RTCHelper.streams[type + '-' + chat_id] = function(cb) {
            cbs.push(cb);
        };
        RTCHelper.streams[type + '-' + chat_id].hash = hash;
        const success = function(type, streams) {

            streams.dispose = () => {
                // @if LOG
                // console.error('DISPOSING Media streams..');
                // @endif
                try {
                    if (streams.getTracks().length && streams.getTracks()[0].stop) {
                        streams.getTracks().forEach(track => {
                            track.stop();
                        });
                    }
                } catch (e) {}
                try {
                    streams.stop();
                } catch (e) {}
            };
            for (const e of cbs) {
                e(null, streams, type);
            }
            RTCHelper.streams[type + '-' + chat_id] = streams;
            RTCHelper.streams[type + '-' + chat_id].hash = hash;
            cb(null, streams, type);
        };
        const error = function(err) {
            cb(err);
            for (const e of cbs) {
                e(err);
            }
            RTCHelper.streams[type + '-' + chat_id] = null;
        };


        const param_vid = {};
        let param_aud = {};

        if (videoInputDevice)
            param_vid.deviceId = {ideal: videoInputDevice};
        if (audioInputDevice)
            param_aud.deviceId = {ideal: audioInputDevice};

        // console.error(HD);
        if (HD) {
            param_vid.width = {
                ideal: 1280,
            };
            param_vid.height = {
                ideal: 720,
            };
        } else {
            param_vid.width = {
                ideal: 640,
            };
            param_vid.height = {
                ideal: 480,
            };
        }


        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            delete param_vid.width;
            delete param_vid.height;
            delete param_vid.mandatory;

            param_vid.width = {ideal: 640};
            param_vid.height = {ideal: 480};
            param_aud = true;
        }


        /*192x144,
            352x288,
            480x360,
            640x480,
            960x540,
            1280x720,
            1280x960,
            1920x1080,
            2592x1936,
            3264x2448*/
        let startCheck;
        const doCall = function(constraints) {
            const fallback = constraints.fallback;
            delete constraints.fallback;


            navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
                    // console.log("user media received. "+JSON.stringify(constraints));
                // console.log(stream);
                // @endif

                stream.localStream = true;

                success(type, stream);

            }).catch(function(err){

                if (videoInputDevice || audioInputDevice) {
                    console.error(err);
                    videoInputDevice = null;
                    audioInputDevice = null;
                    delete param_aud.deviceId;
                    delete param_vid.deviceId;
                    delete param_vid.width;
                    delete param_vid.height;
                    startCheck();
                    return;
                }
                console.log('user media err. ' + JSON.stringify(constraints));
                console.log(err);
                if (err && fallback) {
                    doCall(fallback);
                    return;
                }
                // try again with audio only..
                if (type === 'video') {
                    app.mainApp.showDialog({
                        title: app.getTransMsg('Unable to Connect'),
                        content: app.getTransMsg('Please allow access to webcam.')
                    });


                    console.error(err);
                    error(app.getTransMsg('allow access to webcam.'));
                    return;
                    return RTCHelper.getUserMediaStreams(app, chat_id, 'audio', cb, force);
                } if (type === 'screen') {
                    app.mainApp.showDialog({
                        title: app.getTransMsg('Unable to Connect'),
                        content: app.getTransMsg('Please allow access to screen sharing or might be your browser is not supported for screen sharing.')
                    });
                    // install chrome..
                    error(err);

                } else if (type === 'audio') {
                    app.mainApp.showDialog({
                        title: app.getTransMsg('Unable to Connect'),
                        content: app.getTransMsg('Please allow access your microphone and speaker.')
                    });
                    error(err);
                }

            })
        };


        startCheck = () => {
            if (type === 'screen') {
                RTCHelper.getScreenShareSource(constraint => {
                    const checkExtensions = async () => {

                        if (navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob)) {
                            navigator.getDisplayMedia({
                                video: {
                                    mandatory: {
                                        /*maxWidth: 1920,
                                        maxHeight: 1080,
                                        minAspectRatio: 16/9,*/
                                    },
                                },
                            }).then(stream => {
                                success('screen', stream);
                            }).catch(err => {
                                console.error(err);
                                app.mainApp.showDialog({
                                    title: app.getTransMsg('User denied'),
                                    content: app.getTransMsg('Screen can\'t be captured.')
                                });
                                error(app.getTransMsg('User denied'));
                            });
                        } else {
                                    if(window.isElectron && window.isElectron == true) {
                                        try {
                                            const constraints = {
                                                audio: false,
                                                video: {
                                                    mandatory: {
                                                        chromeMediaSource: 'desktop',
                                                        minWidth: 1280,
                                                        maxWidth: 1280,
                                                        minHeight: 720,
                                                        maxHeight: 720
                                                    }
                                                }
                                            };

                                            let stream = await navigator.mediaDevices.getUserMedia(constraints);
                                            success('screen', stream);
                                            return;
                                        } catch (error) {
                                            console.log("::::::::", error);
                                            return;
                                        }
                                    }

                                    const errrr = ex => {
                                        navigator.mediaDevices.getDisplayMedia({
                                            audio: false,
                                            video: {
                                                maxWidth: constraint.video.mandatory.maxWidth,
                                                maxHeight: constraint.video.mandatory.maxHeight,
                                            },
                                        }).then(captureStream => {
                                            success('screen', captureStream);
                                        }).catch(err => {
                                            // console.error('Error: ' + err);
                                            error(err);
                                        });
                                    };
                                    try {
                                        try {
                                            window.desktop.screenShare(err => {
                                                console.error(err);
                                                errrr();
                                            }, stream => {
                                                success('screen', stream);
                                            });
                                        } catch (e) {
                                            navigator.getDisplayMedia({
                                                video: {
                                                    mandatory: {
                                                        /*maxWidth: 1920,
                                                        maxHeight: 1080,
                                                        minAspectRatio: 16/9,*/
                                                    },
                                                },
                                            }).then(stream => {
                                                success('screen', stream);
                                            }).catch(errrr);
                                        }
                                    } catch (e) {
                                        errrr(e);
                                    }
                        }

                    };
                    try {

                        if (typeof window.process == 'object') {

                            const gui = eval('require(\'nw.gui\');');
                            gui.Screen.Init(); // you only need to call this once
                            gui.Screen.chooseDesktopMedia(['window', 'screen'], streamId => {
                                const vid_constraint = {
                                    mandatory: {
                                        chromeMediaSource: 'desktop',
                                        chromeMediaSourceId: streamId,
                                        /*maxWidth: 1920,
                                        maxHeight: 1080,*/
                                    },
                                    optional: [],
                                };
                                navigator.webkitGetUserMedia({audio: false, video: vid_constraint}, strm => {
                                    success('screem', strm);
                                }, () => {
                                    alert(app.getTransMsg('Please allow screen sharing access'));
                                });
                            });

                        } else {
                            checkExtensions();
                        }
                    } catch (e) {
                        checkExtensions();
                        console.error(e);
                    }
                });
            } else if (type == 'audio') {
                doCall({
                    audio: param_aud,
                });
            } else if (type == 'video') {
                doCall({
                    video: param_vid,
                    audio: param_aud,
                });
            }
        };
        startCheck();
    }

    static filterCandidates() {

    }

    static generateCallid() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for ( let i = 0; i < 5; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    static lineSettings(offer) {

        return offer;

    }

    static handleIceCandidates(out, name, cb, err, create) {
        /*out.oniceconnectionstatechange = function(event) {
            if(out===null)
                return;
            //console.log(name+' state: Connection:'+out.iceConnectionState+' Gathering:'+out.iceGatheringState+' Signaling:'+out.signalingState);
        };*/
        out.onnegotiationneeded = function(event) {
            create();
        };
        let count = 0;
        out.onicecandidate = function( event ) {
            // console.error("local-candiitate:"+event.candidate);
            let skip = false;
            if ( event.candidate != null ) {
                if (RTCHelper.removeLocalCandidates && (
                    (
                        event.candidate.candidate.indexOf('127.0.0.1') >= 0 ||
                        event.candidate.candidate.indexOf('localhost') >= 0 ||
                        event.candidate.candidate.indexOf('192.168.') >= 0
                    )
                )) {
                    skip = true;
                }
                // if(RTCHelper.forceTurnServer && event.candidate.candidate.split(" ")[7]!=='relay') {
                //     skip=true;
                // }
            }
            if (!skip) {
                count++;
                cb(event.candidate);
            }
        };
    }
}


RTCHelper.MediaSettings = MediaSettings;
RTCHelper.streams = {};
RTCHelper.IsAndroidChrome = false;
try {
    if (navigator.userAgent.toLowerCase().indexOf('android') > -1 && /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
        RTCHelper.IsAndroidChrome = true;
    }
} catch (e) {}
RTCHelper.isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);
RTCHelper.isChrome = !!navigator.webkitGetUserMedia;
RTCHelper.isFirefox = !!navigator.mozGetUserMedia;
RTCHelper.webrtcSupported = webrtcSupported;
RTCHelper.removeLocalCandidates = false;
RTCHelper.forceTurnServer = false;

RTCHelper.PeerConnectionConfig = {
    // limiting access to TURN only using iceTransportPolicy: "relay"
    // source: http://stackoverflow.com/questions/32137156/webrtc-determine-which-turn-server-is-used-in-peerconnection
    // iceTransportPolicy: "relay",
    iceServers: [

        {urls: ['stun:stun.l.google.com:19302']},
        {urls: ['stun:stun1.l.google.com:19302']},
        {urls: ['stun:stun2.l.google.com:19302']},

    ],
};
RTCHelper.PeerConnectionOptions = {
    optional: [
        {iceRestart: true },
        {DtlsSrtpKeyAgreement: true},
        {RtpDataChannels: false},
    ],
};

export default RTCHelper;
