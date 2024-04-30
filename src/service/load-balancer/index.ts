import {Request} from 'express';
import {Server, ServerStatus} from '../../domain/server';
import {logger} from '../../utils/logger';
import axios from 'axios';
import {PatchServerRequest} from "../../domain/load-balancer";
import {sleep} from "../../utils/time";

export class LoadBalancerService {
    private servers: Server[];

    private currentIndex: number;

    constructor(servers: Server[]) {
        this.currentIndex = 0;
        this.servers = servers;

        // perform healthcheck every 5 second
        if (process.env.TEST_MODE !== 'true') {
            setInterval(this.executeHealthCheck.bind(this), 5000);
        }
    }

    public async pickServer(): Promise<Server> {
        let server = this.servers[this.currentIndex];

        let findCounter = 0;
        while (server.status === ServerStatus.UNAVAILABLE) {
            this.currentIndex = (this.currentIndex + 1) % this.servers.length;
            server = this.servers[this.currentIndex]

            logger.info(`Server status is unavailable! Re-routing to server with index ${this.currentIndex}...`);

            await sleep(1000);
            findCounter++;

            if (findCounter === 5) {
                throw new Error('error');
            }
        }

        logger.info(`Load balancer picked server with index ${this.currentIndex}...`);

        this.currentIndex = (this.currentIndex + 1) % this.servers.length;
        return server;
    }

    public async forwardRequest(req: Request, server: Server): Promise<Record<string, unknown>> {
        let result;
        const url = `http://${server.host}:${server.port}`;

        try {
            logger.info(`Forwarding request to ${url}...`);

            const start = Date.now();
            result = await axios({
                method: req.method,
                url,
                data: req.body
            });
            const end = Date.now();
            const diff = (end - start) / 1000;

            logger.info(`Response time: ${diff.toString()}s`);
            if (diff >= 5) {
                this.updateServerStats(server, { slowCount: server.slowCount+1 })
            } else {
                this.updateServerStats(server, { healthyCount: server.healthyCount+1 })
            }
        } catch (err) {
            this.updateServerStats(server, { errorCount: server.errorCount+1 })
            logger.error('Received an error when sending request...');
            throw new Error('error');
        }

        return result.data;
    }

    public async patchServer(req: PatchServerRequest): Promise<void> {
        if (req.append) {
            const found = this.servers.find((value) => {
                return value.host === req.append?.host && value.port === req.append?.port
            });

            if (!found) {
                this.servers.push({
                    ...req.append,
                    status: ServerStatus.AVAILABLE
                });

                logger.info(`Server with detail: ${JSON.stringify(req.append)} is successfully added!`);
                logger.info(`Current server data: ${JSON.stringify(this.servers)}`);
            }
        }

        if (req.remove) {
            this.servers = this.servers.filter((server) => {
                return server.host !== req.remove?.host && server.port !== req.remove?.port;
            });

            logger.info(`Server with detail: ${JSON.stringify(req.append)} is successfully removed!`);
        }

        return;
    }

    async executeHealthCheck(): Promise<void> {
        for (let i=0; i<this.servers.length; i++) {
            const server: Server = this.servers[i];
            let response;

            try {
                logger.info(`Executing healthcheck to server #${i}...`);
                const start = Date.now();
                response = await axios({
                    method: 'GET',
                    url: `http://${server.host}:${server.port}/healthcheck`,
                    data: {
                        id: 'healthcheck'
                    }
                });
                const end = Date.now();
                const diff = (end - start) / 1000;

                logger.info(`Healthcheck response time: ${diff.toString()}s`);
                if (diff >= 5) {
                    this.updateServerStats(server, { slowCount: server.slowCount+1 })
                } else {
                    this.updateServerStats(server, { healthyCount: server.healthyCount+1 })
                }
            } catch (err) {
                this.updateServerStats(server, { errorCount: server.errorCount+1 })
                logger.error(`Received an error from server #${i} when executing healthcheck...`);
            }
        }
    }

    updateServerStats(server: Server, stats: Partial<Server>) {
        let idx = this.servers.findIndex((value) => {
            return value.host === server.host && value.port === server.port
        });

        if (idx >= 0) {
            this.servers[idx] = {
                ...this.servers[idx],
                ...stats
            };

            if (
                this.servers[idx].status === ServerStatus.AVAILABLE &&
                (this.servers[idx].errorCount > 5 || this.servers[idx].slowCount > 10)
            ) {
                this.servers[idx].status = ServerStatus.UNAVAILABLE;

                // reset stats
                this.servers[idx].slowCount = 0;
                this.servers[idx].errorCount = 0;
                this.servers[idx].healthyCount = 0;
            }

            if (this.servers[idx].status === ServerStatus.UNAVAILABLE && this.servers[idx].healthyCount > 5) {
                this.servers[idx].status = ServerStatus.AVAILABLE;

                // reset stats
                this.servers[idx].slowCount = 0;
                this.servers[idx].errorCount = 0;
                this.servers[idx].healthyCount = 0;
            }

            logger.info(`Updated server: ${JSON.stringify(this.servers[idx])}`);
        }
    }

    getServers(): Server[] {
        return this.servers;
    }
}
