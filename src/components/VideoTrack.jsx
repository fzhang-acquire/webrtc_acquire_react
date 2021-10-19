import * as React from 'react';
//import useRTCContext from "../common";
//import {useAppState} from "../../js/state";
import {useSelector} from "react-redux";


const LIMIT_LOOP_STREAM = 2;
export default function VideoTrack({ user, isLocal = false, priority ,height, main }) {
    const ref = React.useRef(null);
    //const { app } = useRTCContext();
    var app = null 
    var room = null 
    const [isVideoEnabled, toggleVideoEnabled] = React.useState(user.video_mute !== true);
    //const { room } = useAppState();
    const callType = user.callType;
    const callTypeRoom = "Test"; //useSelector(state => state[user.room.id].callType);

    const checkAutoPlay = () => {
        try {
            let element = ref.current;
            if(element) {
                const promise = element.play();
                if (promise) {
                    promise.then(() => {

                    }).catch(error => {
                        if (error && error.name && error.name === 'NotAllowedError') {
                            if (app.mainApp.getSetting('crm.visitor_call_popup_alert') === 'no')
                                return;

                            const playElement = () => {
                                element.play().then(() => {
                                    // element.removeAttribute('');
                                    // element.setAttribute('controls', 'controls');
                                }).catch(error => {
                                    element.setAttribute('controls', 'controls');
                                });
                            }

                            let buttons;
                            if (app.type === 'backend') {
                                buttons = [
                                    {
                                        action: 'Close',
                                        label: app.getTransMsg('Play Now'),
                                        isPrimary: true,
                                        onClickAndClose: (e) => {
                                            playElement();
                                        }
                                    }
                                ];
                                app.mainApp.showDialog({
                                    htmlrender: false,
                                    title: app.getTransMsg('Auto-Play Disabled'),
                                    content: app.getTransMsg('Auto play not allowed by your browser. So please click play now  button start video.'),
                                    onClose: () => {
                                        playElement();
                                    },
                                    buttons: buttons,
                                    overflow: true
                                });
                            } else {
                                app.mainApp.dialog.save({
                                    htmlrender: false,
                                    title: app.getTransMsg('Auto-Play Disabled'),
                                    content: app.getTransMsg('Auto play not allowed by your browser. So please click play now  button start video.'),
                                    onClose: () => {
                                        playElement();
                                    },
                                    saveButtonText: app.getTransMsg('Play Now'),
                                    overflow: true,
                                    onSave: () => {
                                        playElement();

                                    }

                                });
                            }
                        }
                    });
                }
            }
        }  catch (e) {
            console.error(e);
        }
    };

    const isInIframe = app && app.type === 'frontend';
    let disposeAudioHandle = null;
    // const attach = () => {
    //     let element = ref.current;
    //     if(element) {
    //         try {
    //             let stream = user && user.stream().rtc;
    //             if (stream) {
    //                 if (URL && URL.createObjectURL) {
    //                     if (typeof stream == 'string') {
    //                         element.src = stream;
    //                     } else if (navigator.userAgent.toLowerCase().indexOf('edge') >= 0) {
    //                         element.srcObject = stream;
    //                     } else if (isInIframe) {
    //                         if (!element.srcObject && !isLocal) {
    //                             if (isInIframe) {
    //                                 if (element.srcObject) {
    //                                     return;
    //                                 }

    //                                 if (element.srcObject == null) {

    //                                     let isRemoteStream = false;
    //                                     if (typeof stream.localStream === 'undefined') {
    //                                         isRemoteStream = true;
    //                                     }

    //                                     if (isRemoteStream) {
    //                                         const tmpVideoStream = stream.clone();

    //                                         tmpVideoStream.getAudioTracks().forEach(track => {
    //                                             track.stop();
    //                                         });
    //                                         element.srcObject = tmpVideoStream;
    //                                         // element.parentNode.parentNode.parentNode.className += " iosRemoteVideo";
    //                                     } else {
    //                                         element.srcObject = stream;
    //                                         // element.parentNode.parentNode.parentNode.className += " iosLocalVideo";
    //                                     }


    //                                     const documentElement = document; // element.ownerDocument;
    //                                     const elementParentNode = document.getElementsByTagName('body')[0];
    //                                     if (isRemoteStream) {

    //                                         let tagIdAudio = 'audio-stream-' + stream.id, tmpElementAudio = documentElement.getElementById(tagIdAudio);

    //                                         if (tmpElementAudio === null) {
    //                                             tmpElementAudio = documentElement.createElement('audio');
    //                                             tmpElementAudio.setAttribute('id', tagIdAudio);
    //                                             tmpElementAudio.setAttribute('autoplay', 1);
    //                                             elementParentNode.appendChild(tmpElementAudio);
    //                                         }

    //                                         const tmpStreamAudio = stream.clone();

    //                                         tmpStreamAudio.getVideoTracks().forEach(track => {
    //                                             track.stop();
    //                                         });


    //                                         stream.getAudioTracks().forEach(track => {
    //                                             track.addEventListener('ended', event => {
    //                                                 tmpStreamAudio.getAudioTracks().forEach(track2 => {
    //                                                     track2.stop();
    //                                                 });
    //                                                 tmpElementAudio.remove();
    //                                             });
    //                                         });

    //                                         disposeAudioHandle = app.on('setAudioStream', () => {
    //                                             tmpElementAudio.srcObject = tmpStreamAudio;
    //                                         })

    //                                         setTimeout(() => {
    //                                             tmpElementAudio.srcObject = tmpStreamAudio;
    //                                             setTimeout(() => {
    //                                                 tmpElementAudio.srcObject = tmpStreamAudio;
    //                                             }, 2000);
    //                                         }, 2000);
    //                                     }
    //                                 }

    //                             } else {
    //                                 element.srcObject = stream;
    //                             }
    //                         } else {
    //                             element.srcObject = stream;
    //                         }
    //                     } else {
    //                         try {
    //                             element.setAttribute('src', URL.createObjectURL(stream));
    //                         } catch (e) {
    //                             element.srcObject = stream;
    //                         }
    //                     }

    //                     checkAutoPlay();
    //                 } else if (element.mozSrcObject) {
    //                     element.mozSrcObject = stream;
    //                     checkAutoPlay();
    //                 } else if (element.srcObject) {
    //                     element.srcObject = stream;
    //                     checkAutoPlay();
    //                 } else {
    //                     return false;
    //                 }

    //                 if (isLocal || isInIframe)
    //                     element.muted = true;
    //             }
    //         } catch (e) {
    //             console.error(e);
    //         }
    //     }

    //     // user.on('reset-stream', () => {
    //     //     element.srcObject = null;
    //     // })
    // }
    const attach = () => {console.log("dummy attach for acquire rtc")}

    let timer = null;


    if(user.streamLoopCounter < LIMIT_LOOP_STREAM && user.streamWrote) {
        timer = setInterval(() => {
            videoClick();
            if(user.streamLoopCounter >= LIMIT_LOOP_STREAM) {
                if (timer) {
                    clearInterval(timer);
                }
            }
            user.streamLoopCounter++;
        }, 1200);
        user.streamLoopCounter++;
    }

    React.useEffect(() => {
        // const muteOff = user.on('t-video_mute', () => {
        //     toggleVideoEnabled(user.video_mute !== true);
        //     setTimeout(() => {
        //         user.trigger('stream-update');
        //     }, 500);
        // });
        const muteOff = false; 
        const streamUpdateOff = false; 
        const callUpgrade =  false; 
        let iasOff = false;     
        // const streamUpdateOff = user.on('stream-update', () => {
        //     const isEnable = user.video_mute !== true || callType !== null || callType !== 'audio' || user.stream().rtc !== null;

        //     toggleVideoEnabled(!isEnable);
        //     toggleVideoEnabled(isEnable);
        //     attach();
        //     app.trigger('header-height');
        // });

        // const callUpgrade = user.on('call-update', () => {
        //     toggleVideoEnabled(false);
        //     toggleVideoEnabled(true);
        //     user.trigger('stream-update');
        // });

        // let iasOff = app.on('interactionStarted', () => {
        //     if(user.streamWrote){
        //         user.trigger('stream-update');
        //     }else{
        //         attach();
        //     }
        // })

        if(user.streamWrote){
            user.trigger('stream-update');
        }else{
            attach();
        }

        return () => {
            muteOff();
            streamUpdateOff();
            callUpgrade();
            iasOff();
            if(timer) {
                clearInterval(timer);
            }
            if(disposeAudioHandle) {
                disposeAudioHandle();
            }
        };
    }, [callTypeRoom]);

    // The local video track is mirrored if it is not facing the environment.
    const isFrontFacing = false;
    const style = {
        transform: isLocal && isFrontFacing ? 'rotateY(180deg)' : '',
        objectFit: 'cover',
        width: '100%',
        background: '#000',
        borderRadius: 4,
        height: room && room.isPopupEnabled() ? '100%' : (height ? height : null)
    };

    const videoClick = () => {
        if(user.streamWrote){
            user.trigger('stream-update');
        }else{
            attach();
        }
    }

    //TODO || (user && user.stream().rtc === null) back in if
    if(!isVideoEnabled || callType === null || callType === 'audio' ){
        return <div style={{width: '100%', height: main ? (room.isPopupEnabled() ? '100%' : 210) : '100%', borderRadius: 4, background: 'radial-gradient(circle at 50% 52%,#0265ff, #002391 102%)'}}>
            <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <img src={"https://devmedia.acquire.io/assets/defaults/user_photo.svg"} style={{height: main ? 40 : 22, width: main ? 40 : 22, borderRadius: '50%'}} />
                <video onClick={()=> videoClick()} disablePictureInPicture autoPlay playsInline key={user.id} data-is-local-track={isLocal} ref={ref} style={{width:1, height:1, opacity:0}}/>
            </div>
        </div>;
    }
    return <>
        <video onClick={()=> videoClick()} disablePictureInPicture autoPlay playsInline key={user.id} data-is-local-track={isLocal} ref={ref} style={style}/>
    </>;
}
