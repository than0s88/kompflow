import Pusher from 'pusher-js';
import { api } from './api';

let pusher: Pusher | null = null;

export function getPusher(): Pusher {
  if (pusher) return pusher;

  const key = import.meta.env.VITE_PUSHER_KEY as string | undefined;
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined;

  if (!key || !cluster) {
    throw new Error('Pusher key/cluster missing — check VITE_PUSHER_KEY and VITE_PUSHER_CLUSTER');
  }

  pusher = new Pusher(key, {
    cluster,
    forceTLS: true,
    channelAuthorization: {
      transport: 'ajax',
      endpoint: '/api/pusher/auth',
      customHandler: async ({ socketId, channelName }, callback) => {
        try {
          const { data } = await api.post('/pusher/auth', {
            socket_id: socketId,
            channel_name: channelName,
          });
          callback(null, data);
        } catch (err) {
          callback(err as Error, null);
        }
      },
    },
  });

  return pusher;
}
