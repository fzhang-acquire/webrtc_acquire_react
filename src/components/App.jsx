import * as React from 'react';
// import useRTCContext from "../views/common";
import VideoTrack from "./VideoTrack";
import {useSelector} from "react-redux";
import MenuBar from "./MenuBar";
//import {useAppState} from "../../js/state";
//import useThreadState from "../hooks/useThreadState";
import AudioLevelIndicator from "./AudioLevelIndicator";

export default function App(props) {
    const {room} = props 

    // handle button events 
    const handleEndCall = () => { room && room.myself && room.myself.stopRTCCall();}
    const handleStartCall = () => {}  

    const [heightS, setHeight] = React.useState(null);
    //const participants = useSelector(state => state[props.currentRoom].users);
    const participants = [{id:1}]
    //const [isActive, threadUpdate]  = useThreadState(app.rtcroom[props.currentRoom].data());

    let myself = room && room.myself;

    // React.useEffect(() => {
    //     if(!isActive){
    //         room && room.myself && room.myself.stopRTCCall();
    //     }
    // }, [isActive]);

    return (
    <div id={"conference-room"}>
        <style>{"\
            #aio-container .call-control-action, #aio-container .video-setting-btn, #aio-container .resize-btn{\
                z-index: 3;\
            }\
            "}
        </style>
        <div className={`webrtc-call-frontend`}>
            {participants && participants[0] ? 
            <>
                <div style={{position: 'absolute', top: 10, left: 10, zIndex: 1}}>
                    <AudioLevelIndicator user={participants[0]} main={true} />
                </div>
                <VideoTrack user={participants[0]} main={true} height={210} />
            </> : 
                <div style={{width: '100%', display: 'flex', alignContent: 'center', height: 185, background: 'radial-gradient(circle at 50% 52%,#0265ff, #002391 102%)', alignItems: 'center', justifyContent: 'center'}}>...</div>}


        <div style={{position: 'absolute', top: 10, right: 10, display: 'flex'}}>
            {myself && <div data-user-id={myself.id} key={`vid-wrapper-${myself.id}`} style={{width: 60, height: 60, borderRadius: 4, border: '1px #fff solid', boxShadow: '0px 0px 1px 1px #b9b7b7', display: 'flex', alignContent: 'center', marginLeft: 10}}>
                <div style={{position: 'absolute', bottom: 2, left: 12, zIndex: 1}}><AudioLevelIndicator user={myself}  main={false} /></div>
                <VideoTrack user={myself} isLocal={true}  main={false} /></div>}

                        {participants && participants.map((user, i) => {
                            if(i === 0){
                                return null;    
                            }
                            return <div data-user-id={user.id} key={`vid-wrapper-${user.id}`} style={{width: 60, height: 60, borderRadius: 4, border: '1px #fff solid', boxShadow: '0px 0px 1px 1px #b9b7b7', display: 'flex', alignContent: 'center', marginLeft: 10}}>
                                <div style={{position: 'absolute', bottom: 2, left: 12, zIndex: 1}}><AudioLevelIndicator user={user} main={false} /></div>
                                <VideoTrack user={user}  main={false} /></div>
                        })}
                    </div>

        <div> <MenuBar {...props}/> </div>
        {/* <Button variant="primary">Button #1</Button> */}
        </div>
    </div>);
}
