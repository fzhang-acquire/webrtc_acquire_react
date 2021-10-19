import MicroEmitter from 'core/helpers/micro_emitter';

export default class Peer extends MicroEmitter {
    constructor(id, module) {
        super();

        this.id = id;
        // this._uid=id; // signaling server's assigned user id
        this.module = module;
        this._state = null; // connected link or null . link means a particlular user in partuclar room
        this.self = module.channel.details.id === id;

        // console.error('new peer '+id);
        this.on('join', (link, resume) => {
            // console.error('[p2p] [' + module.id + '] [' + this.id + '] state:connected');
            this._state = link;
        });
        this.on('leave', () => {
            // console.error('[p2p] [' + module.id + '] [' + this.id + '] state:disconnected');
            this._state = null;
        });
        this.module.channel.on('disconnect', () => {
            // console.error('[p2p] [' + module.id + '] [' + this.id + '] state:disconnected');
            this._state = null;
        });
    }

    onDestroy() {
        for (const k in this) {
            delete this[k];
        }
    }

    onMsg(type, ...args) {
        // console.error('got msg '+type);
    }

    // join(cb){
    //     if (this._state) {
    //         this.on('join',cb);
    //     } else {
    //         this.once('join',(_state)=>{
    //             console.error("member joined"+_state);
    //             this.on('join',cb);
    //         })
    //     }
    // }

    msg(event, ...args) {

        if (this.self) {
            args.unshift(event);
            this.trigger.apply(this, args);
            this.onMsg.apply(this, args);
        } else {
            if (!this.module || !this.module.data()) {
                console.error("peer or module already disposed.");
                return;
            }
            this.module.start();
            if (this._state) {
                this.module.channel.msg(this._state, event, args);
            } else {
                // console.error('user not joined yet.', event, this.id);
                this.once('join', (link, resume) => {
                    this.module.channel.msg(link, event, args);
                });
            }
        }
    }
}
