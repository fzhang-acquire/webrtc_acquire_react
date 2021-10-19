import * as React from 'react';
import useRTCContext from "../common";
import {useAppState} from "../../js/state";
import useThreadState from "../hooks/useThreadState";

const RTCIncomingControl = (props) => {

    const { app } = useRTCContext();
    const { room } = useAppState();
    const [isActive, threadUpdate] = useThreadState(app.rtcroom[props.currentRoom].data());


    React.useEffect(() => {
        app.trigger('header-height');
        if(room && room.myself && room.myself) {
            if ((app.mainApp.getSetting('crm.agent_new_call_sound') === 'yes' && app.type === 'backend') || app.type === 'frontend') {
                if (room.call_sound) {
                    room.call_sound.loop = true;
                    room.myself.checkAudioAutoPlay(room.call_sound);

                } else {
                    setTimeout(() => {
                        if (room && room.call_sound) {
                            room.call_sound.loop = true;
                            room.myself.checkAudioAutoPlay(room.call_sound);

                        }
                    }, 1000);
                }

            }
        }
        if(!isActive){
            response('declined');
        }
        return () => {
            app.trigger('header-height');
            if(room.call_sound) {
                room.call_sound.loop = false;
                room.call_sound.pause();
                room.call_sound.currentTime = 0;
                room.audioPlayed = false;
            }

        }

    }, [isActive]);

    let incomingClient = room && room.myself && room.myself.shouldWePickCall && room.myself.shouldWePickCall;
    const response = (type) => {
        if(incomingClient) {
            if(['audio','video'].includes(type)){
                window.localStorage.removeItem('callTimer');
            }
            app.trigger('callResponse', type);
            if (app.type === 'backend') {
                if (type === 'declined') {
                    window.callRejected({id: room.data().contactId, callChannel: incomingClient.typeText})
                } else {
                    window.callConnected({id: room.data().contactId, callChannel: type})
                }
            } else {
                cb && cb(type);
            }
        }

    };

    const incomingText = `Incoming ${incomingClient && incomingClient.type || 'Video'} Call`;
    let cb = incomingClient && incomingClient.cb;

    return (<React.Fragment>
        <div id={"conference-room"} className={"rtc-incoming"}>
            <div className={`rtc-room-incoming-call-alert webrtc-${app.mainApp.type === 'contact' ? 'frontend' : 'backend'}`}>

                <div className="incoming-call-alert">
                    <div className="rtc-alert-message">
                        <span style={{fontWeight: 'bold'}}>{incomingText}</span>
                        <span>{app.mainApp.type === 'contact' ? 'Agent' : 'Contact'}</span>
                    </div>

                    <div className="rtc-action">

                        <a className="cam_on acquire-tooltip-wrapper" onClick={() => {
                            response('video');
                        }}>
                            <div className="acquire-tooltip-content acquire-tooltip-content-bottom left-pos">Answer as
                                Video Call
                            </div>
                            <svg x="0px" y="0px" width="16px" height="16px" viewBox="0 0 459 459">
                                <g>
                                    <g id="videocam">
                                        <path d="M357,191.25V102c0-15.3-10.2-25.5-25.5-25.5h-306C10.2,76.5,0,86.7,0,102v255c0,15.3,10.2,25.5,25.5,25.5h306    c15.3,0,25.5-10.2,25.5-25.5v-89.25l102,102V89.25L357,191.25z"
                                              fill="#FFFFFF"/>
                                    </g>
                                </g>
                            </svg>
                        </a>

                        <a style={{marginLeft: '4px'}} className="call_onn acquire-tooltip-wrapper" onClick={() => {
                            response('audio');
                        }}>
                            <div className="acquire-tooltip-content acquire-tooltip-content-bottom left-pos">Answer as
                                Voice Call
                            </div>
                            <svg x="0px" y="0px" width="16px" height="16px" viewBox="0 0 348.077 348.077">
                                <g>
                                    <g>
                                        <g>
                                            <path d="M340.273,275.083l-53.755-53.761c-10.707-10.664-28.438-10.34-39.518,0.744l-27.082,27.076     c-1.711-0.943-3.482-1.928-5.344-2.973c-17.102-9.476-40.509-22.464-65.14-47.113c-24.704-24.701-37.704-48.144-47.209-65.257     c-1.003-1.813-1.964-3.561-2.913-5.221l18.176-18.149l8.936-8.947c11.097-11.1,11.403-28.826,0.721-39.521L73.39,8.194     C62.708-2.486,44.969-2.162,33.872,8.938l-15.15,15.237l0.414,0.411c-5.08,6.482-9.325,13.958-12.484,22.02     C3.74,54.28,1.927,61.603,1.098,68.941C-6,127.785,20.89,181.564,93.866,254.541c100.875,100.868,182.167,93.248,185.674,92.876     c7.638-0.913,14.958-2.738,22.397-5.627c7.992-3.122,15.463-7.361,21.941-12.43l0.331,0.294l15.348-15.029     C350.631,303.527,350.95,285.795,340.273,275.083z"
                                                  fill="#FFFFFF"/>
                                        </g>
                                    </g>
                                </g>
                            </svg>
                        </a>
                        <a style={{marginLeft: '4px'}} className="call_off acquire-tooltip-wrapper" onClick={() => {
                            response('declined');
                        }}>
                            <div className="acquire-tooltip-content acquire-tooltip-content-bottom left-pos">Decline
                            </div>
                            <svg style={{transform: 'rotate(137deg)'}} x="0px" y="0px" width="16px" height="16px"
                                 viewBox="0 0 348.077 348.077">
                                <g>
                                    <g>
                                        <g>
                                            <path d="M340.273,275.083l-53.755-53.761c-10.707-10.664-28.438-10.34-39.518,0.744l-27.082,27.076     c-1.711-0.943-3.482-1.928-5.344-2.973c-17.102-9.476-40.509-22.464-65.14-47.113c-24.704-24.701-37.704-48.144-47.209-65.257     c-1.003-1.813-1.964-3.561-2.913-5.221l18.176-18.149l8.936-8.947c11.097-11.1,11.403-28.826,0.721-39.521L73.39,8.194     C62.708-2.486,44.969-2.162,33.872,8.938l-15.15,15.237l0.414,0.411c-5.08,6.482-9.325,13.958-12.484,22.02     C3.74,54.28,1.927,61.603,1.098,68.941C-6,127.785,20.89,181.564,93.866,254.541c100.875,100.868,182.167,93.248,185.674,92.876     c7.638-0.913,14.958-2.738,22.397-5.627c7.992-3.122,15.463-7.361,21.941-12.43l0.331,0.294l15.348-15.029     C350.631,303.527,350.95,285.795,340.273,275.083z"
                                                  fill="#FFFFFF"/>
                                        </g>
                                    </g>
                                </g>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </React.Fragment>);
}

export default RTCIncomingControl;

