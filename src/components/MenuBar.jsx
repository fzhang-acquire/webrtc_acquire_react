import * as React from 'react';
import EndCallButton from './Buttons/EndCallButton';
import ToggleAudioButton from './Buttons/ToggleAudioButton';
import ToggleVideoButton from './Buttons/ToggleVideoButton';
import TogglePopupButton from './Buttons/TogglePopupButton';
import SettingsButton from "./Buttons/SettingsButton";
import { useSelector } from 'react-redux';
import CallTimer from './CallTimer';

const MenuBar = (props) => {
    //const state = useSelector(state => state[props.currentRoom].state);
    const isReconnecting = false; // state === 'reconnecting';
    const isPopupEnabled = false; //useSelector(state => state[props.currentRoom].isPopupEnabled);

    // if (true) {
        return (<>
            <div className={"call-timer"}>
                <CallTimer {...props}/>
            </div>
            <div className={"call-control-action"}>
                {/* <ToggleVideoButton disabled={isReconnecting} {...props}/> */}
                {/* <EndCallButton disabled={isReconnecting}/> */}
                {/* <ToggleAudioButton disabled={isReconnecting}/> */}
            </div> 
            <SettingsButton disabled={isReconnecting} />
            <TogglePopupButton disabled={isReconnecting} {...props}/>

        </>);

    // } else {
    //     return (<React.Fragment>
    //         <div className={"call-timer"}>
    //             <CallTimer {...props}/>
    //         </div>
    //         <div className={"call-control-action"}>
    //             <SettingsButton disabled={isReconnecting} />
    //             <ToggleVideoButton disabled={isReconnecting} {...props}/>
    //             <EndCallButton disabled={isReconnecting}/>
    //             <ToggleAudioButton disabled={isReconnecting}/>
    //             <TogglePopupButton disabled={isReconnecting} {...props}/>
    //             <TogglePopupButton disabled={isReconnecting} fullscreen={true} {...props}/>
    //         </div>


    //     </React.Fragment>);

    // }

}


export default MenuBar;     