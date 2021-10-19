//import AppStateProvider, { useAppState } from '../js/state';
//import useRTCContext from "../views/common";
//import {useSelector} from "react-redux";
//import RTCStateIncoming from "./components/Incoming";
import App from './components/App';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import Video from './components/video'



const VideoApp = (props) => {
  //const {app} = useRTCContext();
  // const status = useSelector(state => state.status);
  // const switchCheck = useSelector(state => state[props.currentRoom].switchCheck);
  // const state = useSelector(state => state[props.currentRoom].state);

  const [status, setStatus] = useState("rtc") 
  //const switchCheck = useState() //useSelector(state => state[props.currentRoom].switchCheck);
  const [state, setState] = useState("new") //useSelector(state => state[props.currentRoom].state);
  

  // useEffect(() => {
  //     app.trigger('header-height'); 
  // }, [status, switchCheck]);

  return (
    <BrowserRouter>

              <div style={{position: 'relative'}}>
                  {state !== 'disconnected' && ['rtc_outgoing', 'rtc'].includes(status) && <App {...props} />}
                  {/* {(state === 'connecting' && status === 'rtc_incoming') && <RTCStateIncoming app={app} {...props} />} */}
              </div>
              <Route path="/:roomId" exact component={Video}/>
    </BrowserRouter>

  );
}

export default VideoApp;
