import * as React from 'react'
import {useSelector} from "react-redux";
import AppStateProvider, {useAppState} from "../../js/state";

const CameraSettingsView = (props) => {
    const ref = React.useRef(null);
    const videoDefault = React.useRef(null);
    const audioDefault = React.useRef(null);
    const audioOutDefault = React.useRef(null);
    const { room } = useAppState();

    const attach = () => {
        let el = ref.current;
        if(el) {
            room.media_settings.sampleVideoElement = el;
            room.media_settings.sampleVideoElementUpdate();
        }
    }

    React.useEffect(() => {
        attach();

        let videoDefaultEl = videoDefault.current;
        let audioDefaultEl = audioDefault.current;
        let audioOutDefaultEl = audioOutDefault.current;

        let listenerVideoInput = (e) => {
            room.media_settings.videoCameraDefault(e.target.value);
        };
        let listenerAudioInput = (e) => {
            room.media_settings.audioInputDefault(e.target.value);
        };
        let listenerAudioOutput = (e) => {
            room.media_settings.audioOutputDefault(e.target.value);
        };

        if(videoDefaultEl){
            videoDefaultEl.addEventListener('change', listenerVideoInput)
        }

        if(audioDefaultEl){
            audioDefaultEl.addEventListener('change', listenerAudioInput)
        }


        if(audioOutDefaultEl){
            audioOutDefaultEl.addEventListener('change', listenerAudioOutput)
        }
        return () => {
            if(videoDefaultEl) videoDefaultEl.removeEventListener('change', listenerVideoInput);
            if(audioDefaultEl) audioDefaultEl.removeEventListener('change', listenerAudioInput);
            if(audioOutDefaultEl) audioOutDefaultEl.removeEventListener('change', listenerAudioOutput);
        }
    }, []);

    return <>
    <div className="media-selector">
        <div className="input-picker">
            <div className="camera-preview-wrapper jstest-cam-mic-modal">
                <video disablePictureInPicture className="camera-preview" playsInline autoPlay="" muted="" ref={ref}/>
            </div>
            <div className="selector-wrapper">
                <div className="selector">
                    <h1>Camera</h1>
                    <select className="picker ui-input-text" defaultValue={room.media_settings.videoCameraDefault()} ref={videoDefault}>
                        {room.media_settings.videoCameras.map((item, i) => {
                            return <option key={`video-camera-${i}`} id={item.id}>{item.label}</option>
                        })}
                    </select>
                </div>
                <div className="selector">
                    <h1>Microphone</h1>
                    <select className="picker ui-input-text" defaultValue={room.media_settings.audioInputDefault()}  ref={audioDefault} >
                        {room.media_settings.audioInputs.map((item, i) => {
                            return <option key={`audio-input-${i}`} value={item.id}>{item.label}</option>
                        })}
                    </select>
                </div>
            </div>
            {(room.media_settings && room.media_settings.audioOutputs && room.media_settings.audioOutputs.length > 0) && <div className="selector-wrapper">
                <div className="selector quality-selector-wrapper">
                    <h1>Sound Output</h1>
                    <select className="picker ui-input-text" defaultValue={room.media_settings.audioOutputDefault()} ref={audioOutDefault}>
                        {room.media_settings.audioOutputs.map((item, i) => {
                            return <option key={`audio-output-${i}`} id={item.id}>{item.label}</option>
                        })}
                    </select>
                </div>
            </div>}
            <section className="vertical-align">
                <header className="subheader anchor-left" style={{width: '100%'}}>
                    <p className="help-text">Updating preferences may refresh your browser window. You will
                        automatically rejoin the conversation.</p>
                </header>
            </section>
        </div>
    </div>
   </>

}

const CameraSettings = props => {
    const currentRoom = useSelector(state => state.currentRoom);
    return currentRoom ? <AppStateProvider {...props} currentRoom={currentRoom}>
        <CameraSettingsView currentRoom={currentRoom} />
    </AppStateProvider> : null;
};

export default CameraSettings;
