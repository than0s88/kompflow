import Pusher from 'pusher-js';
import { api } from './api';

let pusher: Pusher | null = null;

export function getPusher(): Pusher {
  if (pusher) return pusher;

  const key = import.meta.env.VITE_PUSHER_KEY as string | undefined;
  const cluster = (import.meta.env.VITE_PUSHER_CLUSTER as string | undefined) ?? 'mt1';
  const host = import.meta.env.VITE_PUSHER_HOST as string | undefined;
  const portRaw = import.meta.env.VITE_PUSHER_PORT as string | undefined;
  const useTLSRaw = import.meta.env.VITE_PUSHER_USE_TLS as string | undefined;
  const forceTLS = useTLSRaw !== 'false';

  if (!key) {
    throw new Error('Pusher key missing — set VITE_PUSHER_KEY');
  }

  type PusherOptions = ConstructorParameters<typeof Pusher>[1];
  const options: PusherOptions = {
    cluster,
    forceTLS,
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
  };

  if (host) {
    const port = portRaw ? Number(portRaw) : forceTLS ? 443 : 80;
    options.wsHost = host;
    options.wsPort = port;
    options.wssPort = port;
    options.enabledTransports = ['ws', 'wss'];
  }

  pusher = new Pusher(key, options);
  return pusher;
}
