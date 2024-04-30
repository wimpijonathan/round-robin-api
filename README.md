## Round Robin API
This repository is for showing the implementation of API load balancing using Round Robin algorithm.

## How it works?
So for simulation, let's say we have 5 API servers with these hosts:
- localhost:3000 (1st)
- localhost:3001 (2nd)
- localhost:3002 (3rd)
- localhost:3003 (4th)
- localhost:3004 (5th)

For the load balancing algorithm, when there is an incoming request, it will route the request to the 1st server, and when there is another incoming request, it will routed to the 2nd server, and so on. <br/>
So with this implementation, every API server will get equal traffic (assuming that there is no sudden change for the API servers count)

## How to test locally ?
To test the service in local, here are the steps:

#### - Load Balancer API Server
Spawn 1 server for the load balancer API, by default it will use port 8000, try using this command:
```
npm run start:load-balancer
```

#### - Main API Server
Spawn as many server as you need for the main API, and make sure the port number for each server is different, try using this command:
```
export PORT={define_port_number_here} && npm run start:main
```

Once the servers are up, load balancer API server will send regular healthcheck request to the registered main API servers.

Here is some of the test cases you can try for testing:

- Round Robin Load Balance logic
```
- Try hitting POST request to the load balancer API via postman
curl --location 'http://localhost:8000' \
--header 'Content-Type: application/json' \
--data '{
    "key": "testing"
}'

Then on the logs, you'll see that load balancer API will forward the request to the server in order
```

- Auto-detect healthy/unhealthy server based on response time / error 
```
- Try hitting POST request to the load balancer API via postman
key: delay --> to add delay for the response time >5s
key: error --> to add error when hitting main API server

curl --location 'http://localhost:8000' \
--header 'Content-Type: application/json' \
--data '{
    "key": "delay/error"
}'

For the error count, if it's more than 5 , it will update the server as UNAVAILABLE and can't be used for routing
For the slow count, if it's more than 10, it will update the server as UNAVAILABLE and can't be used for routing

Then on the logs, you'll see that load balancer API will call healthcheck API to re-enable the main API servers
```
