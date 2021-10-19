import MicroEmitter from 'core/helpers/micro_emitter';

if (typeof window.WebSocket != 'undefined' && (!!window.MSInputMethodContext && !!document.documentMode)) {
    const next_host = function(incr) {
        const last = parseInt(localStorage._acq_host_last || 1);
        if (incr) {
            localStorage._acq_host_last = last + 1;
            return last + 1;
        } else { return last; }
    };
    const _old = window.WebSocket;
    window.WebSocket = function(a1, a2, incr) {
        try {
            return new _old(a1, a2);
        } catch (e) {
            if (e.message === 'SecurityError' && a1 && a1.indexOf('s.acquire.io') >= 0) {
                console.error('Websocket SecurityError');
                console.error(e);

                let next = next_host(incr);
                if (next >= 50) {
                    next = 1;
                    localStorage._acq_host_last = 1;
                }
                a1 = a1.replace(/wss\:\/\/([^\/]*)/, 'wss://' + next + 'ws.acquire.io');
                console.error('Next Host: ' + a1);
                // @ts-ignore
                return new window.WebSocket(a1, a2, true);
            } else { throw e; }
        }
    };
    window.WebSocket.prototype = _old.prototype;
}

const SESSION_ID = Math.ceil(Math.random() * 10000000000);

class ServerConnector  extends MicroEmitter {

    static STATUS_CONNECTED = 1;
    static STATUS_DISCONNECTED = 0;
    static STATUS_SUSPENDED = -2;

    constructor(name, app, host, path, keepConnected) {
        super();
        MicroEmitter.create(this);
        this.server = null;
        this.status = null;
        this.app = app;
        this.name = name;
        this.disconnected = false;
        this.host = host;

        this.path = path;

        this.keepConnected = keepConnected;
        this.first_time = false;
        this.init = false
        this.retryWait = 0;
        this.manual_reconnect = false;
        this.alternate_host = false;
        this.waiting_status = false;
        this.connect();
    }

    static getText(stat) {
        if (stat === ServerConnector.STATUS_CONNECTED)
            return "connected";
        if (stat === ServerConnector.STATUS_DISCONNECTED)
            return "disconnected";
        if (stat === ServerConnector.STATUS_SUSPENDED)
            return "suspended";
        return "unknown";
    }

    suspend() {
        this.status=ServerConnector.STATUS_SUSPENDED;
        if (this.server) {
            this.server.disconnect();
        }
    }

    errorHandler(reason) {
        return (err) => {
            console.log('['+this.name+'] '+reason,err);
            this.status=ServerConnector.STATUS_DISCONNECTED;
            this.trigger("disconnect");
            // },1500);
        };
    }


    /**
     * it will called onces.. never call it again..
     * @param cb
     */
    connect() {
        if (this.status !== null) {
            return;
        }


        let cId = null;
        if (window._acquire_type === 'contact') {
            const cookieArr = document.cookie.split(';');
            for (let i = 0; i < cookieArr.length; i++) {
                const cookiePair = cookieArr[i].split('=');
                if (cookiePair[0].trim() == '_acq_id_contact_local') {
                    cId = decodeURIComponent(cookiePair[1]);
                }
            }
        }

        let headers = {};
        if(typeof window.acqBareBackend !== 'undefined' && typeof window.acqBareBackendAPIToken !== 'undefined' && !!window.acqBareBackend && window.acqBareBackendAPIToken !== '') {
            const authToken = window.acqBareBackendAPIToken;
            headers['-x-user-token'] = `Bearer ${ authToken }`
        }

        this.server = window.acquireSocketLib.connect(`https://${this.host}`, {
            path: this.path,
            'sync disconnect on unload': true,
            reconnection: true,
            //parser: window.acquireSocketLibParser,
            transports:['websocket'],
            query: {
                '-session-id': SESSION_ID,
                '-tab-id': 'v1-' + window.acquireTabId,
                '-x-user-type': this.app.type === 'backend' ? 'user' : 'contact',
                '-contact-id': cId,
                 '-client-url':window.location.href,
                ...headers
            },
            timeout: 10000,
        });

        this.server.on("session-conflict", () => {
            this.server.disconnect();
            this.suspend();
        });

        this.status=ServerConnector.STATUS_CONNECTED;

        let first=true;
        this.server.on("connect", ()=>{
            if(!first) {
                console.log('['+this.name+'] connected');
            }
            this.trigger('connect',first);
            first=false;
        });

        let firstd=true;
        this.server.on("disconnect", (e)=>{

            console.log('['+this.name+'] disconnect');
            this.trigger('disconnect',firstd);
            firstd=false;

            if(e==='io server disconnect'){
                setTimeout(()=>{
                    if(this.server.disconnected) {
                        this.server.connect();
                    }
                },2000);
            }
        });
        this.server.on("connect", ()=>{
            '['+this.name+'] connected'
        });
        this.server.on("connect_error", this.errorHandler("connect_error"));
        this.server.on("disconnect", this.errorHandler("disconnect"));
        this.server.on("close", this.errorHandler("close"));
        this.server.on("error", this.errorHandler("error"));
        this.server.on("connectFailed", this.errorHandler("connectFailed"));
        this.server.on("connect_failed", this.errorHandler("connect_failed"));
    }

    disconnect() {
        this.server.disconnect();
    }

}


export default ServerConnector;

// @ts-ignore
window.AcqConnector = ServerConnector;
