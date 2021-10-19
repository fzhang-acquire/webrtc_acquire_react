import BaseAdapter from './base';

export default class SessionStorageAdapter extends BaseAdapter {

    constructor(app) {
        super(app);

    }

    set(name, value, duration= 0) {
        try {
            window.sessionStorage.setItem(name, JSON.stringify({data: value, expire: Date.now() + (duration * 1000)}));
        } catch (e) {}
    }

    get(name, def= null, cb) {
        let data = window.sessionStorage.getItem(name);
        if (data) {
            try {
                data = JSON.parse(data) ;
                if (data && (data.expire === 0 || data.expire >= Date.now())) {
                    cb(data.data);
                } else {
                    cb(def);
                }
            } catch (e) {
                cb(def);
            }
        } else {
            cb(def);
        }
    }

}
