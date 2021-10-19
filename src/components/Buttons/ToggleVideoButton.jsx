import * as React from 'react';
import VideoOffIcon from '../icons/VideoOffIcon';
import VideoOnIcon from '../icons/VideoOnIcon';

//import useRTCContext from "../../common";
//import {useAppState} from "../../../js/state";
import {useSelector} from "react-redux";

export default function ToggleVideoButton(props) {
    //const { room } = useAppState();
    var room = props.room
    let callType =  (room && room.myself.callType);
    const callTypeRoom = useSelector(state => state[props.currentRoom].callType);
    let mute = room && (callTypeRoom === 'audio' || (callTypeRoom === 'video' && (callType === 'audio' || room.myself.video_mute)));

    const [isVideoEnabled, toggleVideoEnabled] = React.useState(false);
    const lastClickTimeRef = React.useRef(0);
    let hasVideoDevices = true;//callTypeRoom === 'video';

    const toggleVideo = React.useCallback(() => {
        if(!hasVideoDevices || props.disabled) return;
        if (Date.now() - lastClickTimeRef.current > 200) {
            lastClickTimeRef.current = Date.now();
            if(room && room.myself){
                if(callTypeRoom === 'audio' && room.callType() === 'audio'){
                    room.myself.switchVideo();
                    toggleVideoEnabled(true);
                }else {
                    room.myself.video_mute = !room.myself.video_mute;
                    room.myself.trigger('t-video_mute');

                    const isEnable = room.myself.video_mute !== true || callType !== null || callType !== 'audio' || room.myself.stream().rtc !== null;

                    toggleVideoEnabled(!isEnable);
                    toggleVideoEnabled(isEnable);
                }
            }
        }
    }, []);

    React.useEffect(() => {
        const streamUpdateOff = room.myself.on('stream-update', () => {
            callType =  (room && room.myself.callType);
            mute = room && (callTypeRoom === 'audio' || (callTypeRoom === 'video' && (callType === 'audio' || room.myself.video_mute)));
            if(mute !== isVideoEnabled) {
                toggleVideoEnabled(!mute);
            }
        });

        return () => {
            streamUpdateOff();
        }
    }, [callTypeRoom]);


    let videoNotSupported =  (!hasVideoDevices || props.disabled);

    let isMute = room && (callTypeRoom === 'audio' || (callTypeRoom === 'video' && (callType === 'audio' || room.myself.video_mute)));

    return /*videoNotSupported ? null : */(<a className={`acquire-tooltip-wrapper video${videoNotSupported ? ' disabled' : ''}`} onClick={toggleVideo}>
        {!isMute ? <VideoOnIcon /> : <VideoOffIcon />}
        <div className="acquire-tooltip-content acquire-tooltip-content-top right-pos">{videoNotSupported ? 'No Video' : !isMute ? 'Stop Video' : 'Start Video'}</div>
    </a>);
}

