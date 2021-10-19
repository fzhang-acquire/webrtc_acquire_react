import * as React from 'react';
import SettingsIcon from "../icons/SettingsIcon";
//import { useAppState } from "../../../js/state";

export default function SettingsButton(props) {
    //const { room } = useAppState();
    var room = props.room

    return (<a className={"acquire-tooltip-wrapper video-setting-btn"} onClick={(e) => room.settingsPopup(true)} disabled={props.disabled}>
        <SettingsIcon />
        <div className="acquire-tooltip-content acquire-tooltip-content-top right-pos">Setting</div>
    </a>);
}
