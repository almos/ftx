# Getting started on local machine with docker-compose

## Prerequisites
- Ensure [Docker-CE](https://docs.docker.com/install/) is installed on your machine   
- Ensure [docker-compose](https://docs.docker.com/compose/install/) with syntax >= 3.1 is installed  

## Running backend services  
Double check `.env.local`, in most case you nothing need to change here
```
sudo docker-compose -f docker-compose-local.yml up --build -d
```

Service will start in the background, you can double check if all services are running correctly by with the following command  
```
sudo docker-compose -f docker-compose-local.yml ps
```

You should see that all services are in the `Up` state. For example:  
```
         Name                        Command               State            Ports          
-------------------------------------------------------------------------------------------
backend-api               /bin/bash /usr/bin/entrypo ...   Up      0.0.0.0:3000->3000/tcp  
backend-job               docker-entrypoint.sh node  ...   Up                              
backend_mongo-express_1   tini -- /docker-entrypoint ...   Up      0.0.0.0:28000->8081/tcp 
mongo                     docker-entrypoint.sh mongod      Up      0.0.0.0:27017->27017/tcp
redis                     docker-entrypoint.sh redis ...   Up      6379/tcp 
```

### Database GUI
The docker compose file embeded with `mongo-express`. You can access database GUI with the following URL:  
http://localhost:28000  

### Seeing log
Use the following command to view the log  
```
sudo docker-compose -f docker-compose-local.yml logs -f
```

### Nodemon
docker-compose-local run service with `nodemon`. Changes to these files in these folders will make the server restart again:  
* `./config/*`
* `./public/*`
* `./routes/*`
* `./services/*`
* `./utils/*`
* `./zabbix/*`

### Terminate docker containers
Once you finish the implementation, you may want to terminate the services to release memory for your machine. Use the following command:  
```
sudo docker-compose -f docker-compose-local.yml down
```
