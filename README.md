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