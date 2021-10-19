import * as React from 'react';
import PhoneIcon from "../icons/PhoneIcon";

const EndCallButton = () => {
    //const { room } = useAppState();
    return (<a className={"acquire-tooltip-wrapper declined"} onClick={() => {
        window.localStorage.removeItem('callTimer');
        //room && room.myself && room.myself.stopRTCCall();
    }}>
        <PhoneIcon style={{transform: 'rotate(135deg)'}}/>
        <div className="acquire-tooltip-content acquire-tooltip-content-top right-pos">Disconnect</div>
    </a>);
}

export default EndCallButton()
