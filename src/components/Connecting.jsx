import * as React from 'react'
import useRTCContext from "../common";
export default function Connecting(props){


    const { app } = useRTCContext();

    return (<React.Fragment>
        <div id={"conference-room"} className={"rtc-incoming"}>
            <div className={`rtc-room-incoming-call-alert webrtc-${app.mainApp.type === 'contact' ? 'frontend' : 'backend'}`}>

                <div className="incoming-call-alert">
                    <div className="rtc-alert-message">
                        <span style={{ fontWeight: 'bold' }}>Connecting . . . </span>
                        <span style={{ overflow: 'initial' }}>Checking {app.mainApp.type === 'contact' ? 'Agent' : 'Contact'} Avaibility</span>
                    </div>

                    {((app.currentThread() && app.currentThread().status !== 'active') || app.currentThread()==null)  && <div className="rtc-action">

                        <a style={{ marginLeft: '4px' }} className="call_off acquire-tooltip-wrapper" onClick={() => {
                            app.trigger('disconnect')
                        }}>
                            <div className="acquire-tooltip-content acquire-tooltip-content-bottom left-pos">Disconnect
    </div>
                            <svg style={{ transform: 'rotate(137deg)' }} x="0px" y="0px" width="16px" height="16px"
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
                    </div>}
                </div>
            </div>
        </div>
    </React.Fragment>)

}
