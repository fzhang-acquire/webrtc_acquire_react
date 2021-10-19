import * as React from 'react';
import MicIcon from '../icons/MicIcon';
import MicOffIcon from '../icons/MicOffIcon';
//import {useAppState} from "../../../js/state";

export default function ToggleAudioButton(props) {
    const hasAudioTrack = true;//localTracks.some(track => track.kind === 'audio');
    //const { room } = useAppState();
    var room = props.room
    const [isAudioEnabled, toggleAudioEnabled] = React.useState(room && room.myself ? !room.myself.audio_mute : false);

    const toggleAudioEnable = React.useCallback(() => {
        // if(room && room.myself){
        //     room.myself.audio_mute = !room.myself.audio_mute;
        //     room.myself.trigger('t-audio_mute');
        //     toggleAudioEnabled(!room.myself.audio_mute);
        // }

    }, []);
    return (<a className={"acquire-tooltip-wrapper audio"} onClick={toggleAudioEnable} disabled={!hasAudioTrack || props.disabled}>
        {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
        <div className="acquire-tooltip-content acquire-tooltip-content-top left-pos">{!hasAudioTrack ? 'No Audio' : isAudioEnabled ? 'Mute' : 'Unmute'}</div>

    </a>);
}
