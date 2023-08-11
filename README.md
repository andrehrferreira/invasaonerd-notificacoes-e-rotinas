
Arquivo .env 
```
DEBUG=true
PORT=5556
CLUSTER_MAX=1
MONGO_HOST = 127.0.0.1
MONGO_PORT = 27017
MONGO_DB = invasaonerd
REDIS_HOST = 127.0.0.1
REDIS_PORT = 6379
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
BASE_URL = http://invasaonerd/api
PROXY_URL = http://invasaonerd
YOUTUBE_API_KEY=AIzaSyBPjwU4s4dOPIMkRNXXIoCJnP8pxmYN0NU
LIMIT_INSTAGRAM=5
LIMIT_YOUTUBE=5
TIME_INSTAGRAM=5
TIME_YOUTEBE=5
TITLE_APP=Invasão Nerd
RABBIT_MQ_QUEUE=INVASAO_NOTIFICATIOS_QUEUE
```

Instalar o RabbitMQ num container docker

```console
docker pull rabbitmq:3-management
docker run -d --hostname my-rabbit --name rabbit13 -p 8080:15672 -p 5672:5672 -p 25676:25676 rabbitmq:3-management
```

Agora para verificar se o RabbitMQ está rodando corretamente, acesse o seguinte endereço no seu navegador: http://localhost:8080/, em seguida logue com os dados de acesso:

```
user:  guest
senha: guest
```