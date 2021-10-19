import * as React from 'react';
import ToggleSmallIcon from '../icons/ToggleSmallIcon';
import ToggleLargeIcon from '../icons/ToggleLargeIcon';
//import {useAppState} from "../../../js/state";
import {useSelector} from "react-redux";
import FullScreen from "../icons/FullScreen";

export default function TogglePopupButton(props) {
    //const {room} = useAppState();
    var room = props.room   
    const isPopupEnabled = false; // useSelector(state => state[props.currentRoom].isPopupEnabled);
    const isPopupFullScreenEnabled = false; //useSelector(state => state[props.currentRoom].isPopupFullScreenEnabled);
    const fullscreen = props.fullscreen || false;

    if(fullscreen && isPopupFullScreenEnabled) {
        return null;
    }

    return (<a className={"acquire-tooltip-wrapper resize-btn"} onClick={() => {
        if (fullscreen) {
            room.isPopupFullScreenEnabled(!isPopupFullScreenEnabled);
        } else {
            if(isPopupFullScreenEnabled){
                room.isPopupFullScreenEnabled(false);
            }else{
                room.isPopupEnabled(!isPopupEnabled);
            }
        }
    }
    }>
        {fullscreen ? (isPopupFullScreenEnabled ? null : <FullScreen />) : (!isPopupEnabled ? <ToggleLargeIcon/> : <ToggleSmallIcon/>)}
        <div className="acquire-tooltip-content acquire-tooltip-content-top left-pos">{isPopupEnabled ? 'Minimize' : 'Maximize'}</div>
    </a>);
}
