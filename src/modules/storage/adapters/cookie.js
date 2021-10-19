import BaseAdapter from './base';

export default class CookieAdapter extends BaseAdapter {

    constructor(app) {
        super(app);
    }

    get(name, def= null, cb) {
        if (document.cookie) {
            const b = document.cookie.match(`(^|[^;]+)\\s*${name}\\s*=\\s*([^;]+)`);
            const c = decodeURIComponent(b ? b.pop() : '');
            if (c && c != '') {
                cb(c);
            } else { cb(def); }
        } else { cb(def); }
    }


    set(name, value, duration= 0) {
        let expires;
        if (duration) {
            const date = new Date();
            date.setTime(date.getTime() + (duration * 1000));
            // @ts-ignore
            expires = '; expires=' + date.toGMTString();
        }  else { expires = ''; }

        document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`;
    }
}
