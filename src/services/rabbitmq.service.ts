import amqplib from 'amqplib';

let connection: Awaited<ReturnType<typeof amqplib.connect>> | null = null;
let channel: Awaited<ReturnType<Awaited<ReturnType<typeof amqplib.connect>>['createChannel']>> | null = null;

const EXCHANGE_NAME = 'konitys.events';

export async function connectRabbitMQ(): Promise<void> {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    connection = await amqplib.connect(url);
    channel = await connection.createChannel();

    // Créer l'exchange de type topic pour les événements
    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true,
    });

    console.log('RabbitMQ connected successfully');

    // Gérer la fermeture de connexion avec reconnexion automatique
    connection.on('close', () => {
      console.log('RabbitMQ connection closed, reconnecting...');
      channel = null;
      connection = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);
    });
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    // Retry après 5 secondes
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function publishEvent(routingKey: string, data: object): Promise<boolean> {
  if (!channel) {
    console.warn('RabbitMQ channel not available, event not published:', routingKey);
    return false;
  }

  try {
    const message = Buffer.from(JSON.stringify(data));

    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });

    console.log(`Event published: ${routingKey}`, data);
    return true;
  } catch (error) {
    console.error('Failed to publish event:', error);
    return false;
  }
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('RabbitMQ connection closed gracefully');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}

// Pour consommer les événements (si nécessaire)
export async function subscribeToEvents(
  queueName: string,
  routingKeys: string[],
  handler: (routingKey: string, data: unknown) => Promise<void>
): Promise<void> {
  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }

  // Créer la queue
  await channel.assertQueue(queueName, { durable: true });

  // Lier la queue à l'exchange pour chaque routing key
  for (const routingKey of routingKeys) {
    await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);
  }

  const currentChannel = channel;

  // Consommer les messages
  currentChannel.consume(queueName, async (msg) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(msg.fields.routingKey, data);
        currentChannel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        currentChannel.nack(msg, false, false);
      }
    }
  });

  console.log(`Subscribed to events: ${routingKeys.join(', ')}`);
}
