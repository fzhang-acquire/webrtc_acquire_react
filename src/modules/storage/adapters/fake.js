export default class FakeAdapter {
    constructor(app) {
        this.app = app;

        this.list = {};
    }

    get(name, def= null, cb) {
        cb(typeof this.list[name] == 'undefined' ? def : this.list[name]);
        return typeof this.list[name] == 'undefined' ? def : this.list[name];
    }
    set(name, value, duration= 0) {
        this.list[name] = value;
    }
}
