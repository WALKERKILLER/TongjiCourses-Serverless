import { message } from 'ant-design-vue';

export function errorNotify(msg: string) {
    message.error(msg);
}

export function successNotify(msg: string) {
    message.success(msg);
}

export function infoNotify(msg: string) {
    message.info(msg);
}

export function warningNotify(msg: string) {
    message.warning(msg);
}
