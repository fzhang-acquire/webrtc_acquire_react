import CookieAdapter from './adapters/cookie';
import FakeAdapter from './adapters/fake';
import LocalStorageAdapter from './adapters/local-storage';
import SessionStorageAdapter from './adapters/session-storage';


export default class ClientStorage {

    static TYPE_COOKIE = 1;
    static TYPE_LOCAL = 2;
    static TYPE_SESSION = 3;
    static TYPE_FAKE = 5;

    constructor(app, account) {
        this.app = app;

        this.adapters = {};
        this.adapters[ClientStorage.TYPE_COOKIE] = new CookieAdapter(this.app);
        this.adapters[ClientStorage.TYPE_LOCAL] = new LocalStorageAdapter(this.app);
        this.adapters[ClientStorage.TYPE_SESSION] = new SessionStorageAdapter(this.app);
        this.adapters[ClientStorage.TYPE_FAKE] = new FakeAdapter(this.app);
    }

    get(name, def = null, cb = null, ...args) {

        if (args.length == 0) {
            args[0] = ClientStorage.TYPE_COOKIE;
        }

        if (window.location.href.indexOf('acq_fake_session_s') >= 0) {
            args = [ClientStorage.TYPE_SESSION];
        }

        if (window.location.href.indexOf('acq_fake_session_f') >= 0) {
            args = [ClientStorage.TYPE_FAKE];
        }
        let sent = 0,
                val;

        for (let k in this.adapters) {
            k = parseInt(k);
            if (args.indexOf(k) >= 0) {
                if (cb !== false) {
                    // console.error("value: access: "+name);
                    this.adapters[k].get(name, false, cv => {
                        sent++;
                        // console.error("CCCCCCCCCC: value: get: "+name+ " value:"+cv);
                        // console.error(cb);

                        if (cv === false && sent == args.length && cb !== false) {
                            val = def;
                            if (cb) {
                                cb(val);
                            }
                            cb = false;
                        } else if (cv !== false && cb !== false) {
                            val = cv;
                            if (cb) {
                                cb(val);
                            }
                            cb = false;
                        }
                    });
                }
            }
        }
        return val;
    }

    set(name, value, duration = 0, ...args) {


        if (args.length == 0) {
            args[0] = ClientStorage.TYPE_COOKIE;
        }

        if (window.location.href.indexOf('acq_fake_session_s') >= 0) {
            args = [ClientStorage.TYPE_SESSION];
        }
        if (window.location.href.indexOf('acq_fake_session_f') >= 0) {
            args = [ClientStorage.TYPE_FAKE];
        }

        for (let k in this.adapters) {
            k = parseInt(k);
            if (args.indexOf(k) >= 0) {
                this.adapters[k].set(name, value, duration);
            }
        }
    }

}
