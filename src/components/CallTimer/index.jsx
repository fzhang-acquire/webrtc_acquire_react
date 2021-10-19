import * as React from 'react';
//import {useAppState} from "../../../js/state";
import { useSelector } from 'react-redux';
//import useRTCContext from "../../common";

function CallTimer(props) {
    //const { app } = useRTCContext();
    //const { room } = useAppState();
    var room = props.room 
    const initialState = () => Number(window.localStorage.getItem('callTimer') ||0 );
    const [seconds, setSeconds] = React.useState(initialState);
    const isCallStarted = false; // useSelector(state => state[props.currentRoom].isCallStarted);

    const callerRingStop = () => {
        if(room.call_outgoing_sound) {
            room.call_outgoing_sound.loop = false;
            room.call_outgoing_sound.pause();
            room.call_outgoing_sound.currentTime = 0;
            room.audioPlayed = false;
        }
    }

    React.useEffect( () => {
        let timer = setInterval( () => {
            if(isCallStarted){
                setSeconds(s => s+1);
            }
        }, 1000);

        if(!isCallStarted) {
            if (room && room.call_outgoing_sound) {
                room.call_outgoing_sound.loop = true;
                room.myself.checkAudioAutoPlay(room.call_outgoing_sound);

            } else {
                setTimeout(() => {
                    if (room && room.call_outgoing_sound) {
                        room.call_outgoing_sound.loop = true;
                        room.myself.checkAudioAutoPlay(room.call_outgoing_sound);

                    }
                }, 1000);
            }
        }else{
            callerRingStop();
        }

        return () => {
            clearInterval(timer);
            callerRingStop();
        }
    } , [isCallStarted]);

    React.useEffect( () => {
        window.localStorage.setItem('callTimer', seconds);
    } , [seconds]);

    const getHours = (s) =>{
        let hours = Math.floor(s / (60 * 60))
        return hours < 10 ? ("0" + hours) : hours;
    }

    const getMinutes = (s) =>{
        let divisor_for_minutes = s % (60 * 60);
        let minutes = Math.floor(divisor_for_minutes / 60)
        return minutes < 10 ? ("0"+ minutes) : minutes;
    }

    const getSeconds = (s) =>{
        let divisor_for_minutes = s % (60 * 60);
        let divisor_for_seconds = divisor_for_minutes % 60;
        let sec = Math.ceil(divisor_for_seconds);
        return sec < 10 ? ("0"+sec) : sec;
    }

    if(!isCallStarted) {
        return <div className="call-timer-wrapper waiting-time">
            <span >{'Waiting for others to join.'}</span>
        </div>
    }

    return (
            <div className="call-timer-wrapper">
                <span >
                    {getHours(seconds)}
                </span>
                <span >
                    :
                </span>
                <span >
                    {getMinutes(seconds)}
                </span>
                <span >
                    :
                </span>
                <span >
                    {getSeconds(seconds)}
                </span>
            </div>
    )
}

export default CallTimer;
