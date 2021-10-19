import MicroEmitter from 'core/helpers/micro_emitter';

export default class Room  extends MicroEmitter {
    constructor(room, channel) {
        super();
        this.room = room;
        this.channel = channel;
    }
    emit(...args) {
        args.unshift('broadcast');
        args.unshift(this.room);
        this.channel.emit.apply(this.channel, args);
    }
}
